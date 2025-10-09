import { storage } from './storage';
import { getStripeService, STRIPE_PLANS } from './stripe-modern';
import { emailServiceEnhanced } from './email-enhanced';

export interface SubscriptionStatus {
  isValid: boolean;
  reason?: string;
  needsUpgrade?: boolean;
  remainingEvents?: number | null;
  remainingInvitations?: number | null;
  daysUntilExpiry?: number | null;
}

export interface CreateEventPermission {
  allowed: boolean;
  reason?: string;
  remainingEvents?: number | null;
}

export class ModernSubscriptionService {
  
  /**
   * Vérifier les permissions de création d'événement
   */
  static async checkEventCreationPermission(organizationId: string): Promise<CreateEventPermission> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return {
          allowed: false,
          reason: "Organisation non trouvée"
        };
      }

      const subscriptionStatus = this.validateSubscription(organization);
      
      if (!subscriptionStatus.isValid) {
        return {
          allowed: false,
          reason: subscriptionStatus.reason || "Abonnement invalide"
        };
      }

      // Plan découverte : limite de 1 événement
      if (organization.subscriptionType === 'decouverte') {
        const eventCount = await storage.countOrganizationEvents(organizationId);
        if (eventCount >= 1) {
          return {
            allowed: false,
            reason: "Limite d'événements atteinte pour le plan Découverte (1/1)"
          };
        }
        return { allowed: true, remainingEvents: 1 - eventCount };
      }

      // Plans événementiels : vérifier les événements restants
      if (organization.subscriptionType.startsWith('evenementielle')) {
        if (organization.packageRemainingEvents !== null) {
          if (organization.packageRemainingEvents <= 0) {
            return {
              allowed: false,
              reason: "Aucun événement restant dans votre pack"
            };
          }
          return { 
            allowed: true, 
            remainingEvents: organization.packageRemainingEvents 
          };
        }
      }

      // Plans Pro : événements illimités
      if (organization.subscriptionType.startsWith('pro-')) {
        return { 
          allowed: true, 
          remainingEvents: null // Illimité
        };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Erreur vérification permissions événement:', error);
      return {
        allowed: false,
        reason: "Erreur lors de la vérification des permissions"
      };
    }
  }

  /**
   * Décrémenter le nombre d'événements restants (pour les packs événementiels)
   */
  static async consumeEventFromPackage(organizationId: string): Promise<void> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      // Seulement pour les plans avec des packages limités
      if (organization.packageRemainingEvents !== null && organization.packageRemainingEvents > 0) {
        await storage.updateOrganization(organizationId, {
          packageRemainingEvents: organization.packageRemainingEvents - 1
        });

        console.log(`✅ Événement consommé. Restant: ${organization.packageRemainingEvents - 1}`);

        // Envoyer notification si proche de l'épuisement
        if (organization.packageRemainingEvents - 1 <= 2) {
          await this.sendLowEventsWarning(organization);
        }
      }
    } catch (error) {
      console.error('Erreur décrément événements:', error);
      throw error;
    }
  }

  /**
   * Valider un abonnement
   */
  static validateSubscription(organization: any): SubscriptionStatus {
    if (!organization) {
      return { 
        isValid: false, 
        reason: 'Organisation non trouvée' 
      };
    }

    const now = new Date();

    // Plan découverte : toujours valide
    if (organization.subscriptionType === 'decouverte') {
      return { isValid: true };
    }

    // Plans événementiels
    if (organization.subscriptionType?.startsWith('evenementielle')) {
      // Vérifier expiration du package
      if (organization.packageExpiryDate && new Date(organization.packageExpiryDate) < now) {
        return {
          isValid: false,
          reason: 'Pack événementiel expiré',
          needsUpgrade: true
        };
      }

      // Vérifier événements restants
      if (organization.packageRemainingEvents !== null && organization.packageRemainingEvents <= 0) {
        return {
          isValid: false,
          reason: 'Plus d\'événements disponibles dans le pack',
          needsUpgrade: true
        };
      }

      const daysUntilExpiry = organization.packageExpiryDate 
        ? Math.ceil((new Date(organization.packageExpiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        isValid: true,
        remainingEvents: organization.packageRemainingEvents,
        daysUntilExpiry
      };
    }

    // Plans Pro (abonnements mensuels)
    if (organization.subscriptionType?.startsWith('pro-')) {
      // Vérifier statut d'abonnement
      if (organization.subscriptionStatus !== 'active') {
        return {
          isValid: false,
          reason: 'Abonnement inactif',
          needsUpgrade: true
        };
      }

      // Vérifier expiration
      if (organization.subscriptionEndDate && new Date(organization.subscriptionEndDate) < now) {
        return {
          isValid: false,
          reason: 'Abonnement expiré',
          needsUpgrade: true
        };
      }

      const daysUntilExpiry = organization.subscriptionEndDate 
        ? Math.ceil((new Date(organization.subscriptionEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        isValid: true,
        remainingEvents: null, // Illimité
        remainingInvitations: null, // Illimité
        daysUntilExpiry
      };
    }

    return {
      isValid: false,
      reason: 'Type d\'abonnement non reconnu'
    };
  }

  /**
   * Obtenir les informations détaillées d'abonnement
   */
  static async getSubscriptionDetails(organizationId: string): Promise<{
    subscription: SubscriptionStatus;
    plan: any;
    usage: {
      eventsCreated: number;
      remainingEvents: number | null;
    };
  }> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const subscription = this.validateSubscription(organization);
      const plan = STRIPE_PLANS[organization.subscriptionType] || STRIPE_PLANS.decouverte;
      
      // Compter les événements créés
      const eventsCreated = await storage.countOrganizationEvents(organizationId);
      
      // Calculer les événements restants
      let remainingEvents: number | null = null;
      if (organization.subscriptionType === 'decouverte') {
        remainingEvents = Math.max(0, 1 - eventsCreated);
      } else if (organization.packageRemainingEvents !== null) {
        remainingEvents = organization.packageRemainingEvents;
      }

      return {
        subscription,
        plan: {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          price: plan.price,
          currency: plan.currency,
          features: plan.features,
          description: plan.description
        },
        usage: {
          eventsCreated,
          remainingEvents
        }
      };

    } catch (error) {
      console.error('Erreur récupération détails abonnement:', error);
      throw error;
    }
  }

  /**
   * Effectuer une mise à niveau d'abonnement
   */
  static async upgradeSubscription(organizationId: string, newPlanId: string): Promise<{
    success: boolean;
    requiresPayment: boolean;
    checkoutUrl?: string;
    message: string;
  }> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const newPlan = STRIPE_PLANS[newPlanId];
      if (!newPlan) {
        throw new Error('Plan de destination invalide');
      }

      // Mise à niveau vers découverte (downgrade gratuit)
      if (newPlanId === 'decouverte') {
        await storage.updateOrganization(organizationId, {
          subscriptionType: 'decouverte',
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          packageRemainingEvents: null,
          packageExpiryDate: null,
          subscriptionEndDate: null,
        });

        await this.sendSubscriptionChangeNotification(organization, newPlan);

        return {
          success: true,
          requiresPayment: false,
          message: `Votre abonnement a été changé vers ${newPlan.name}`
        };
      }

      // Mise à niveau payante : créer session Stripe
      const stripeService = getStripeService();
      const baseUrl = process.env.APP_URL || 'https://teammove.fr';
      
      const checkoutSession = await stripeService.createCheckoutSession({
        organizationId,
        planId: newPlanId,
        customerEmail: organization.email,
        successUrl: `${baseUrl}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/dashboard?upgrade=cancelled`,
      });

      return {
        success: true,
        requiresPayment: true,
        checkoutUrl: checkoutSession.url || undefined,
        message: `Redirection vers le paiement pour ${newPlan.name}`
      };

    } catch (error: any) {
      console.error('Erreur mise à niveau abonnement:', error);
      return {
        success: false,
        requiresPayment: false,
        message: error.message || 'Erreur lors de la mise à niveau'
      };
    }
  }

  /**
   * Traiter un paiement réussi (appelé après vérification Stripe)
   */
  static async processSuccessfulPayment(
    sessionId: string,
    organizationId: string,
    planId: string
  ): Promise<void> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organisation non trouvée');
      }

      const plan = STRIPE_PLANS[planId];
      if (!plan) {
        throw new Error('Plan invalide');
      }

      // Données de mise à jour de base
      const updateData: any = {
        subscriptionType: planId,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        paymentSessionId: sessionId,
      };

      // Configuration spécifique selon le type de plan
      if (plan.type === 'evenementielle') {
        if (planId === 'evenementielle-single') {
          updateData.packageRemainingEvents = 1;
        } else if (planId === 'evenementielle-pack10') {
          updateData.packageRemainingEvents = 10;
        }
        
        // Expiration à 12 mois
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        updateData.packageExpiryDate = expiryDate;
        updateData.subscriptionEndDate = null;
      } else if (plan.type === 'pro') {
        // Abonnements Pro : expiration mensuelle
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        updateData.subscriptionEndDate = endDate;
        updateData.packageRemainingEvents = null; // Illimité
        updateData.packageExpiryDate = null;
      }

      await storage.updateOrganization(organizationId, updateData);

      // Envoyer confirmation par email
      await this.sendPaymentConfirmationEmail(organization, plan);

      console.log(`✅ Abonnement ${planId} activé pour l'organisation ${organizationId}`);

    } catch (error) {
      console.error('Erreur traitement paiement réussi:', error);
      throw error;
    }
  }

  /**
   * Vérifier et traiter les abonnements expirés (tâche planifiée)
   */
  static async processExpiredSubscriptions(): Promise<{
    processed: number;
    errors: number;
  }> {
    let processed = 0;
    let errors = 0;

    try {
      const organizations = await storage.getAllOrganizations();
      const now = new Date();

      for (const org of organizations) {
        try {
          const status = this.validateSubscription(org);
          
          if (!status.isValid && status.needsUpgrade) {
            // Rétrograder vers découverte
            await storage.updateOrganization(org.id, {
              subscriptionType: 'decouverte',
              subscriptionStatus: 'active',
              packageRemainingEvents: null,
              packageExpiryDate: null,
              subscriptionEndDate: null,
            });

            // Notifier par email
            await this.sendExpirationNotification(org);
            processed++;
          }
        } catch (error) {
          console.error(`Erreur traitement expiration org ${org.id}:`, error);
          errors++;
        }
      }

      console.log(`✅ Abonnements expirés traités: ${processed}, erreurs: ${errors}`);
      return { processed, errors };

    } catch (error) {
      console.error('Erreur traitement abonnements expirés:', error);
      return { processed, errors: errors + 1 };
    }
  }

  // Méthodes d'email privées
  private static async sendLowEventsWarning(organization: any): Promise<void> {
    try {
      await emailServiceEnhanced.sendLowEventsWarning(
        organization.email,
        organization.name,
        organization.packageRemainingEvents || 0
      );
    } catch (error) {
      console.error('Erreur envoi avertissement événements bas:', error);
    }
  }

  private static async sendSubscriptionChangeNotification(organization: any, newPlan: any): Promise<void> {
    try {
      await emailServiceEnhanced.sendSubscriptionChangeNotification(
        organization.email,
        organization.name,
        newPlan.name
      );
    } catch (error) {
      console.error('Erreur envoi notification changement:', error);
    }
  }

  private static async sendPaymentConfirmationEmail(organization: any, plan: any): Promise<void> {
    try {
      await emailServiceEnhanced.sendPaymentConfirmationEmail(
        organization.email,
        organization.name,
        plan.name,
        plan.price / 100 // Convertir centimes en euros
      );
    } catch (error) {
      console.error('Erreur envoi confirmation paiement:', error);
    }
  }

  private static async sendExpirationNotification(organization: any): Promise<void> {
    try {
      await emailServiceEnhanced.sendSubscriptionExpirationNotification(
        organization.email,
        organization.name
      );
    } catch (error) {
      console.error('Erreur envoi notification expiration:', error);
    }
  }
}

export default ModernSubscriptionService;