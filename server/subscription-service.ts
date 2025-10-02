import { 
  SUBSCRIPTION_PLANS, 
  STRIPE_PRICE_CONFIG, 
  NEW_SUBSCRIPTION_LIMITS,
  validateSubscription,
  getDaysUntilExpiry 
} from './subscription-config';
import { StripeService } from './stripe-service';
import { sendSubscriptionEmail } from './email-service';

// Import du storage - sera résolu à l'exécution
let storage: any;

export interface SubscriptionPermissionResult {
  allowed: boolean;
  reason?: string;
  remainingEvents?: number;
  remainingInvitations?: number;
}

export interface CreateSubscriptionParams {
  organizationId: string;
  planId: string;
  paymentMethodId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface UpgradeSubscriptionParams {
  organizationId: string;
  newPlanId: string;
  paymentMethodId?: string;
  successUrl: string;
  cancelUrl: string;
}

export class SubscriptionService {
  
  // Initialiser le service
  static async initialize(): Promise<void> {
    try {
      const { storage: storageInstance } = await import('./storage');
      storage = storageInstance;
      console.log('✅ Subscription service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize subscription service:', error);
    }
  }

  // Créer un abonnement ou paiement
  static async createSubscription(params: CreateSubscriptionParams): Promise<any> {
    try {
      const organization = await storage.getOrganization(params.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const plan = SUBSCRIPTION_PLANS[params.planId];
      if (!plan) {
        throw new Error('Plan not found');
      }

      const stripeConfig = STRIPE_PRICE_CONFIG[params.planId];
      if (!stripeConfig) {
        throw new Error('Stripe configuration not found for this plan');
      }

      // Pour les offres événementielles (paiement unique)
      if (plan.type === 'evenementielle') {
        return await this.createEventPackagePayment(params, plan, stripeConfig);
      }

      // Pour les formules Pro (abonnement mensuel)
      if (['pro_club', 'pro_pme', 'pro_entreprise'].includes(plan.type)) {
        return await this.createProSubscription(params, plan, stripeConfig);
      }

      throw new Error('Plan type not supported');
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Créer un paiement pour pack événementiel
  private static async createEventPackagePayment(
    params: CreateSubscriptionParams, 
    plan: any, 
    stripeConfig: any
  ): Promise<any> {
    const session = await StripeService.createCheckoutSession({
      mode: 'payment',
      priceData: {
        currency: plan.currency.toLowerCase(),
        product_data: {
          name: plan.name,
          description: plan.description,
        },
        unit_amount: plan.price,
      },
      quantity: 1,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        organizationId: params.organizationId,
        planId: params.planId,
        planType: 'evenementielle',
      },
    });

    return { 
      sessionId: session.id, 
      url: session.url,
      mode: 'payment' 
    };
  }

  // Créer un abonnement Pro
  private static async createProSubscription(
    params: CreateSubscriptionParams, 
    plan: any, 
    stripeConfig: any
  ): Promise<any> {
    const session = await StripeService.createCheckoutSession({
      mode: 'subscription',
      priceData: {
        currency: plan.currency.toLowerCase(),
        product_data: {
          name: plan.name,
          description: plan.description,
        },
        unit_amount: plan.price,
        recurring: {
          interval: stripeConfig.interval,
        },
      },
      quantity: 1,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      metadata: {
        organizationId: params.organizationId,
        planId: params.planId,
        planType: plan.type,
      },
    });

    return { 
      sessionId: session.id, 
      url: session.url,
      mode: 'subscription' 
    };
  }

  // Gérer la confirmation de paiement
  static async handlePaymentSuccess(sessionId: string, organizationId: string, planId: string): Promise<void> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        throw new Error('Plan not found');
      }

      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      if (plan.type === 'evenementielle') {
        await this.activateEventPackage(organization, plan);
      } else if (['pro_club', 'pro_pme', 'pro_entreprise'].includes(plan.type)) {
        await this.activateProSubscription(organization, plan);
      }

      // Envoyer email de confirmation
      await sendSubscriptionEmail(organization, plan, 'activated');

      console.log(`✅ Subscription activated for organization ${organizationId}: ${plan.name}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  // Activer un pack événementiel
  private static async activateEventPackage(organization: any, plan: any): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (plan.validityMonths || 12));

    const eventsCount = plan.id === 'evenementielle-single' ? 1 : 10;

    await storage.updateOrganization(organization.id, {
      subscriptionType: 'evenementielle',
      subscriptionStatus: 'active',
      paymentMethod: plan.billingInterval,
      packageRemainingEvents: eventsCount,
      packageExpiryDate: expiryDate,
      subscriptionStartDate: new Date(),
      // Reset des compteurs
      eventCreatedCount: 0,
      invitationsSentCount: 0,
      lastResetDate: new Date(),
    });
  }

  // Activer un abonnement Pro
  private static async activateProSubscription(organization: any, plan: any): Promise<void> {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // Mensuel

    await storage.updateOrganization(organization.id, {
      subscriptionType: plan.type,
      subscriptionStatus: 'active',
      paymentMethod: 'monthly',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: endDate,
      // Reset des compteurs
      eventCreatedCount: 0,
      invitationsSentCount: 0,
      lastResetDate: new Date(),
      // Nettoyer les données de pack
      packageRemainingEvents: null,
      packageExpiryDate: null,
    });
  }

  // Vérifier si une organisation peut créer un événement
  static async canCreateEvent(organizationId: string): Promise<SubscriptionPermissionResult> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return { allowed: false, reason: 'Organization not found' };
      }

      // Admin peut toujours créer des événements
      if (organization.role === 'admin') {
        return { allowed: true };
      }

      // Valider l'abonnement
      const validation = validateSubscription(organization);
      if (!validation.isValid) {
        return { 
          allowed: false, 
          reason: validation.reason || 'Abonnement invalide'
        };
      }

      // Vérifier les limites selon le type d'abonnement
      const limits = NEW_SUBSCRIPTION_LIMITS[organization.subscriptionType || 'decouverte'];
      
      if (!limits) {
        return { allowed: false, reason: 'Type d\'abonnement non reconnu' };
      }

      // Offre découverte - limite stricte
      if (organization.subscriptionType === 'decouverte') {
        const currentEventCount = organization.eventCreatedCount || 0;
        if (currentEventCount >= limits.maxEvents) {
          return {
            allowed: false,
            reason: `Limite d'événements atteinte (${limits.maxEvents}). Choisissez une offre payante pour créer plus d'événements.`,
            remainingEvents: 0
          };
        }
        return { allowed: true, remainingEvents: limits.maxEvents - currentEventCount };
      }

      // Offre événementielle - vérifier le pack
      if (organization.subscriptionType === 'evenementielle') {
        const remaining = organization.packageRemainingEvents || 0;
        if (remaining <= 0) {
          return {
            allowed: false,
            reason: 'Plus d\'événements disponibles dans votre pack. Achetez un nouveau pack.',
            remainingEvents: 0
          };
        }
        return { allowed: true, remainingEvents: remaining };
      }

      // Formules Pro - événements illimités
      return { allowed: true };
    } catch (error) {
      console.error('Error checking event creation permission:', error);
      return { allowed: false, reason: 'Erreur de vérification des permissions' };
    }
  }

  // Vérifier si une organisation peut envoyer des invitations
  static async canSendInvitations(organizationId: string, count: number = 1): Promise<SubscriptionPermissionResult> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return { allowed: false, reason: 'Organization not found' };
      }

      // Admin peut toujours envoyer des invitations
      if (organization.role === 'admin') {
        return { allowed: true };
      }

      // Valider l'abonnement
      const validation = validateSubscription(organization);
      if (!validation.isValid) {
        return { 
          allowed: false, 
          reason: validation.reason || 'Abonnement invalide'
        };
      }

      const limits = NEW_SUBSCRIPTION_LIMITS[organization.subscriptionType || 'decouverte'];

      // Offre découverte - limite d'invitations
      if (organization.subscriptionType === 'decouverte') {
        const currentInvitationCount = organization.invitationsSentCount || 0;
        const remaining = limits.maxInvitations - currentInvitationCount;
        
        if (remaining < count) {
          return {
            allowed: false,
            reason: `Limite d'invitations atteinte (${limits.maxInvitations}). Choisissez une offre payante pour des invitations illimitées.`,
            remainingInvitations: Math.max(0, remaining)
          };
        }
        
        return { allowed: true, remainingInvitations: remaining };
      }

      // Toutes les autres offres - invitations illimitées
      return { allowed: true };
    } catch (error) {
      console.error('Error checking invitation permission:', error);
      return { allowed: false, reason: 'Erreur de vérification des permissions' };
    }
  }

  // Incrémenter le compteur d'événements (avec gestion des packs)
  static async incrementEventCount(organizationId: string): Promise<void> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const updateData: any = {
        eventCreatedCount: (organization.eventCreatedCount || 0) + 1
      };

      // Pour les packs événementiels, décrémenter aussi le nombre restant
      if (organization.subscriptionType === 'evenementielle' && organization.packageRemainingEvents > 0) {
        updateData.packageRemainingEvents = organization.packageRemainingEvents - 1;
      }

      await storage.updateOrganization(organizationId, updateData);

      console.log(`✅ Event count incremented for organization ${organizationId}`);
    } catch (error) {
      console.error('Error incrementing event count:', error);
    }
  }

  // Incrémenter le compteur d'invitations
  static async incrementInvitationCount(organizationId: string, count: number = 1): Promise<void> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      await storage.updateOrganization(organizationId, {
        invitationsSentCount: (organization.invitationsSentCount || 0) + count
      });

      console.log(`✅ Invitation count incremented for organization ${organizationId}: +${count}`);
    } catch (error) {
      console.error('Error incrementing invitation count:', error);
    }
  }

  // Mettre à niveau l'abonnement (pour les utilisateurs Découverte)
  static async upgradeSubscription(params: UpgradeSubscriptionParams): Promise<any> {
    try {
      const organization = await storage.getOrganization(params.organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Vérifier que c'est bien une mise à niveau depuis Découverte
      if (organization.subscriptionType !== 'decouverte') {
        throw new Error('Mise à niveau disponible uniquement depuis l\'offre Découverte');
      }

      // Créer la session de paiement
      return await this.createSubscription(params);
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  // Annuler l'abonnement (retour à Découverte)
  static async cancelSubscription(organizationId: string): Promise<void> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Annuler l'abonnement Stripe s'il existe
      if (organization.stripeSubscriptionId) {
        await StripeService.cancelSubscription(organization.stripeSubscriptionId);
      }

      // Rétrograder vers l'offre Découverte
      await storage.updateOrganization(organizationId, {
        subscriptionType: 'decouverte',
        subscriptionStatus: 'active',
        paymentMethod: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        packageRemainingEvents: null,
        packageExpiryDate: null,
        // Reset des compteurs selon les limites Découverte
        eventCreatedCount: 0,
        invitationsSentCount: 0,
        lastResetDate: new Date(),
      });

      // Envoyer email de confirmation
      await sendSubscriptionEmail(organization, SUBSCRIPTION_PLANS.decouverte, 'cancelled');

      console.log(`✅ Subscription cancelled for organization ${organizationId}`);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Obtenir les informations d'abonnement
  static async getSubscriptionInfo(organizationId: string): Promise<any> {
    try {
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const limits = NEW_SUBSCRIPTION_LIMITS[organization.subscriptionType || 'decouverte'];
      const validation = validateSubscription(organization);
      const daysUntilExpiry = getDaysUntilExpiry(organization);

      return {
        subscriptionType: organization.subscriptionType,
        subscriptionStatus: organization.subscriptionStatus,
        limits,
        isValid: validation.isValid,
        reason: validation.reason,
        needsRenewal: validation.needsRenewal,
        daysUntilExpiry,
        packageRemainingEvents: organization.packageRemainingEvents,
        packageExpiryDate: organization.packageExpiryDate,
        subscriptionStartDate: organization.subscriptionStartDate,
        subscriptionEndDate: organization.subscriptionEndDate,
        eventCreatedCount: organization.eventCreatedCount || 0,
        invitationsSentCount: organization.invitationsSentCount || 0,
      };
    } catch (error) {
      console.error('Error getting subscription info:', error);
      throw error;
    }
  }

  // Vérifier les abonnements expirés (tâche automatique)
  static async checkExpiredSubscriptions(): Promise<void> {
    try {
      console.log('🔄 Checking for expired subscriptions...');

      // Cette fonction sera appelée périodiquement pour vérifier les expirations
      // et basculer automatiquement vers l'offre Découverte

      const organizations = await storage.getAllOrganizations();

      for (const org of organizations) {
        if (org.subscriptionType === 'decouverte') continue;

        const validation = validateSubscription(org);
        
        if (!validation.isValid && validation.needsRenewal) {
          console.log(`⚠️  Subscription expired for organization ${org.id}, downgrading to découverte`);
          
          await this.cancelSubscription(org.id);
          
          // Envoyer notification d'expiration
          await sendSubscriptionEmail(org, SUBSCRIPTION_PLANS.decouverte, 'expired');
        }
      }

      console.log('✅ Subscription check completed');
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
    }
  }
}