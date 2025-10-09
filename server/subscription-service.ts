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
      const plan = currentOrg.subscriptionType || 'decouverte';
      
      // Plan gratuit : limite de 3 événements
      if (plan === 'decouverte') {
        // Compter les événements existants de l'organisation
        const eventCount = await this.getOrganizationEventCount(organizationId);
        return eventCount < 3; // Limite pour le plan découverte
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
      const plan = currentOrg.subscriptionType || 'decouverte';
      
      // Plan découverte : pas de suppression
      if (plan === 'decouverte') {
        return false;
      }
      
      // Plans payants : suppression autorisée
      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification de suppression d\'événement:', error);
      return false;
    }
  }

  /**
   * Vérifie si un organisateur peut envoyer des invitations
   */
  static async canSendInvitations(organizationId: string): Promise<boolean> {
    try {
      const organization = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      if (!organization.length) return false;

      const subscriptionStatus = await this.getSubscriptionStatus(organizationId);
      
      return subscriptionStatus.isActive;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'envoi d\'invitations:', error);
      return false;
    }
  }

  /**
   * Récupère le statut d'abonnement d'un organisateur
   */
  static async getSubscriptionStatus(organizationId: string): Promise<SubscriptionStatus> {
    try {
      const organization = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      if (!organization.length) {
        return {
          isActive: false,
          plan: 'decouverte',
          canCreateEvent: false,
          canDeleteEvent: false,
          canSendInvitations: false
        };
      }

      const currentOrg = organization[0];
      const plan = currentOrg.subscriptionType || 'decouverte';
      const expiresAt = currentOrg.subscriptionEndDate ? new Date(currentOrg.subscriptionEndDate) : undefined;
      
      // Vérifier si l'abonnement est encore actif
      const isActive = plan === 'decouverte' || 
        (expiresAt ? expiresAt > new Date() : false) ||
        currentOrg.subscriptionStatus === 'active';

      const canCreate = await this.canCreateEvent(organizationId);
      const canDelete = await this.canDeleteEvent(organizationId);
      const canInvite = isActive;

      let remainingEvents: number | undefined;
      if (plan === 'decouverte') {
        const eventCount = await this.getOrganizationEventCount(organizationId);
        remainingEvents = Math.max(0, 3 - eventCount);
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
        plan: 'decouverte',
        canCreateEvent: false,
        canDeleteEvent: false,
        canSendInvitations: false
      };
    }
  }

  /**
   * Met à jour l'abonnement d'un organisateur
   */
  static async updateSubscription(
    organizationId: string,
    planId: string,
    subscriptionId?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        throw new Error(`Plan d'abonnement invalide: ${planId}`);
      }

      // Mapper les nouveaux plan IDs vers les anciens pour compatibilité
      let mappedPlanId = planId;
      if (planId === 'discovery') mappedPlanId = 'decouverte';
      if (planId === 'premium') mappedPlanId = 'pro_club';
      if (planId === 'pro') mappedPlanId = 'pro_entreprise';

      await db
        .update(organizations)
        .set({
          subscriptionType: mappedPlanId as any,
          subscriptionStatus: planId === 'discovery' ? 'active' : 'active',
          subscriptionEndDate: expiresAt,
          stripeSubscriptionId: subscriptionId,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId));

      // Envoyer un email de confirmation si c'est un plan payant
      if (planId !== 'discovery') {
        const organization = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
        if (organization.length > 0) {
          await emailServiceEnhanced.sendSubscriptionConfirmation(
            organization[0].email,
            organization[0].name,
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
   * Annule l'abonnement d'un organisateur
   */
  static async cancelSubscription(organizationId: string): Promise<boolean> {
    try {
      await db
        .update(organizations)
        .set({
          subscriptionType: 'decouverte',
          subscriptionStatus: 'cancelled',
          subscriptionEndDate: null,
          stripeSubscriptionId: null,
          updatedAt: new Date()
        })
        .where(eq(organizations.id, organizationId));

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      return false;
    }
  }

  /**
   * Compte le nombre d'événements créés par un organisateur
   */
  private static async getOrganizationEventCount(organizationId: string): Promise<number> {
    try {
      // Cette méthode devrait compter les événements depuis la table events
      // Pour l'instant, on utilise une requête directe
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM events WHERE organization_id = ?`,
        args: [organizationId]
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
   * Vérifie si un organisateur peut utiliser les fonctionnalités avancées
   */
  static async canUseAdvancedFeatures(organizationId: string): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus(organizationId);
      return status.plan !== 'decouverte';
    } catch (error) {
      console.error('Erreur lors de la vérification des fonctionnalités avancées:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques d'utilisation d'un organisateur
   */
  static async getOrganizationUsageStats(organizationId: string): Promise<{
    eventsCreated: number;
    eventsRemaining: number | null;
    plan: string;
  }> {
    try {
      const eventsCreated = await this.getOrganizationEventCount(organizationId);
      const status = await this.getSubscriptionStatus(organizationId);
      
      let eventsRemaining: number | null = null;
      if (status.plan === 'decouverte') {
        eventsRemaining = Math.max(0, 3 - eventsCreated);
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
        plan: 'decouverte'
      };
    }
  }
}