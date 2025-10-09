import { db } from "./db";
import { organizations } from "../shared/schema";
import { eq } from "drizzle-orm";
import { SUBSCRIPTION_PLANS, DEFAULT_PLAN, PLAN_LIMITS } from "./subscription-config";
import type { SubscriptionPlan } from "./subscription-config";
import { emailServiceEnhanced } from "./email-enhanced";

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string;
  expiresAt?: Date;
  canCreateEvent: boolean;
  canDeleteEvent: boolean;
  canSendInvitations: boolean;
  remainingEvents?: number;
}

export class SubscriptionService {
  /**
   * Vérifie si un organisateur peut créer un événement
   */
  static async canCreateEvent(organizationId: string): Promise<boolean> {
    try {
      const organization = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      if (!organization.length) return false;

      const currentOrg = organization[0];
      const plan = currentOrg.subscriptionType || DEFAULT_PLAN;
      
      // Plan gratuit : limite de 3 événements
      if (plan === 'decouverte') {
        // Compter les événements existants de l'organisation
        const eventCount = await this.getOrganizationEventCount(organizationId);
        return eventCount < PLAN_LIMITS.discovery.maxEvents;
      }
      
      // Plans payants : illimité
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de création d\'événement:', error);
      return false;
    }
  }

  /**
   * Vérifie si un organisateur peut supprimer un événement
   */
  static async canDeleteEvent(organizationId: string): Promise<boolean> {
    try {
      const organization = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      if (!organization.length) return false;

      const currentOrg = organization[0];
      const plan = currentOrg.subscriptionType || DEFAULT_PLAN;
      
      return PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.canDeleteEvents || false;
    } catch (error) {
      console.error('Erreur lors de la vérification de suppression d\'événement:', error);
      return false;
    }
  }

  /**
   * Vérifie si un utilisateur peut envoyer des invitations
   */
  static async canSendInvitations(userId: number): Promise<boolean> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) return false;

      const currentUser = user[0];
      const subscriptionStatus = await this.getSubscriptionStatus(userId);
      
      return subscriptionStatus.isActive;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'envoi d\'invitations:', error);
      return false;
    }
  }

  /**
   * Récupère le statut d'abonnement d'un utilisateur
   */
  static async getSubscriptionStatus(userId: number): Promise<SubscriptionStatus> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return {
          isActive: false,
          plan: DEFAULT_PLAN,
          canCreateEvent: false,
          canDeleteEvent: false,
          canSendInvitations: false
        };
      }

      const currentUser = user[0];
      const plan = currentUser.subscriptionPlan || DEFAULT_PLAN;
      const expiresAt = currentUser.subscriptionExpiresAt ? new Date(currentUser.subscriptionExpiresAt) : undefined;
      
      // Vérifier si l'abonnement est encore actif
      const isActive = plan === 'discovery' || 
        (expiresAt ? expiresAt > new Date() : false) ||
        currentUser.subscriptionStatus === 'active';

      const canCreate = await this.canCreateEvent(userId);
      const canDelete = await this.canDeleteEvent(userId);
      const canInvite = isActive;

      let remainingEvents: number | undefined;
      if (plan === 'discovery') {
        const eventCount = await this.getUserEventCount(userId);
        remainingEvents = Math.max(0, PLAN_LIMITS.discovery.maxEvents - eventCount);
      }

      return {
        isActive,
        plan,
        expiresAt,
        canCreateEvent: canCreate,
        canDeleteEvent: canDelete,
        canSendInvitations: canInvite,
        remainingEvents
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du statut d\'abonnement:', error);
      return {
        isActive: false,
        plan: DEFAULT_PLAN,
        canCreateEvent: false,
        canDeleteEvent: false,
        canSendInvitations: false
      };
    }
  }

  /**
   * Met à jour l'abonnement d'un utilisateur
   */
  static async updateSubscription(
    userId: number,
    planId: string,
    subscriptionId?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        throw new Error(`Plan d'abonnement invalide: ${planId}`);
      }

      await db
        .update(users)
        .set({
          subscriptionPlan: planId,
          subscriptionStatus: planId === 'discovery' ? 'active' : 'active',
          subscriptionExpiresAt: expiresAt?.toISOString(),
          stripeSubscriptionId: subscriptionId,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId));

      // Envoyer un email de confirmation si c'est un plan payant
      if (planId !== 'discovery') {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length > 0) {
          await emailServiceEnhanced.sendSubscriptionConfirmation(
            user[0].email,
            user[0].username,
            plan.name,
            plan.price,
            expiresAt
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement:', error);
      return false;
    }
  }

  /**
   * Annule l'abonnement d'un utilisateur
   */
  static async cancelSubscription(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({
          subscriptionPlan: DEFAULT_PLAN,
          subscriptionStatus: 'canceled',
          subscriptionExpiresAt: null,
          stripeSubscriptionId: null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      return false;
    }
  }

  /**
   * Compte le nombre d'événements créés par un utilisateur
   */
  private static async getUserEventCount(userId: number): Promise<number> {
    try {
      // Cette méthode devrait compter les événements depuis la table events
      // Pour l'instant, on utilise une requête directe
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM events WHERE creator_id = ?`,
        args: [userId]
      });
      
      return result.rows[0]?.count as number || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des événements:', error);
      return 0;
    }
  }

  /**
   * Récupère tous les plans d'abonnement disponibles
   */
  static getAvailablePlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Récupère un plan spécifique
   */
  static getPlan(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS[planId] || null;
  }

  /**
   * Vérifie si un utilisateur peut utiliser les fonctionnalités avancées
   */
  static async canUseAdvancedFeatures(userId: number): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      const plan = PLAN_LIMITS[status.plan as keyof typeof PLAN_LIMITS];
      return plan?.canUseAdvancedFeatures || false;
    } catch (error) {
      console.error('Erreur lors de la vérification des fonctionnalités avancées:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques d'utilisation d'un utilisateur
   */
  static async getUserUsageStats(userId: number): Promise<{
    eventsCreated: number;
    eventsRemaining: number | null;
    plan: string;
  }> {
    try {
      const eventsCreated = await this.getUserEventCount(userId);
      const status = await this.getSubscriptionStatus(userId);
      
      let eventsRemaining: number | null = null;
      if (status.plan === 'discovery') {
        eventsRemaining = Math.max(0, PLAN_LIMITS.discovery.maxEvents - eventsCreated);
      }

      return {
        eventsCreated,
        eventsRemaining,
        plan: status.plan
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques d\'utilisation:', error);
      return {
        eventsCreated: 0,
        eventsRemaining: 0,
        plan: DEFAULT_PLAN
      };
    }
  }
}