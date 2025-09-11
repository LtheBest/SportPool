import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt', {
  apiVersion: '2024-09-30.acacia',
});

// Configuration des plans de prix
const PRICE_CONFIG = {
  'premium-monthly': {
    price: 1299, // 12,99€ en centimes
    interval: 'month' as const,
    product: 'SportPool Premium Monthly'
  },
  'premium-annual': {
    price: 9999, // 99,99€ en centimes
    interval: 'year' as const,
    product: 'SportPool Premium Annual'
  }
};

export interface CreateCheckoutSessionParams {
  priceId: string;
  planId: string;
  interval: 'monthly' | 'annual';
  organizationId: string;
  organizationEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export class StripeService {
  
  // Créer une session de checkout
  static async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ sessionId: string }> {
    try {
      const planConfig = PRICE_CONFIG[params.planId as keyof typeof PRICE_CONFIG];
      
      if (!planConfig) {
        throw new Error(`Plan de prix non trouvé: ${params.planId}`);
      }

      // Créer ou récupérer le customer Stripe
      const customer = await this.createOrGetCustomer(params.organizationId, params.organizationEmail);

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: planConfig.product,
                description: `Abonnement ${params.interval === 'monthly' ? 'mensuel' : 'annuel'} à SportPool Premium`,
              },
              unit_amount: planConfig.price,
              recurring: {
                interval: planConfig.interval,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          organizationId: params.organizationId,
          planId: params.planId,
          interval: params.interval,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
        subscription_data: {
          description: `SportPool Premium - ${params.interval === 'monthly' ? 'Mensuel' : 'Annuel'}`,
          metadata: {
            organizationId: params.organizationId,
            planId: params.planId,
          },
        },
      });

      return { sessionId: session.id };
    } catch (error: any) {
      console.error('Erreur création session Stripe:', error);
      throw new Error(`Erreur Stripe: ${error.message}`);
    }
  }

  // Créer ou récupérer un customer Stripe
  static async createOrGetCustomer(organizationId: string, email: string): Promise<Stripe.Customer> {
    try {
      // Chercher un customer existant par email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Créer un nouveau customer
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          organizationId: organizationId,
        },
      });

      return customer;
    } catch (error: any) {
      console.error('Erreur création customer Stripe:', error);
      throw new Error(`Erreur customer Stripe: ${error.message}`);
    }
  }

  // Gérer les webhooks Stripe
  static async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET non configuré');
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Événement webhook non géré: ${event.type}`);
      }
    } catch (error: any) {
      console.error('Erreur webhook Stripe:', error);
      throw new Error(`Erreur webhook: ${error.message}`);
    }
  }

  // Checkout session terminée avec succès
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Checkout session completed:', session.id);
    
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;
    
    if (!organizationId || !planId) {
      console.error('Métadonnées manquantes dans la session checkout');
      return;
    }

    // Ici vous pourrez mettre à jour la base de données
    // Pour l'instant, on log juste les informations
    console.log('Organisation ID:', organizationId);
    console.log('Plan ID:', planId);
    console.log('Customer ID:', session.customer);
    console.log('Subscription ID:', session.subscription);
  }

  // Paiement réussi
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment succeeded for invoice:', invoice.id);
    // Mettre à jour le statut de l'abonnement dans la DB
  }

  // Échec de paiement
  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id);
    // Notifier l'utilisateur et mettre à jour le statut
  }

  // Abonnement supprimé
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    // Rétrograder l'utilisateur au plan gratuit
  }

  // Abonnement mis à jour
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    // Mettre à jour les informations d'abonnement
  }

  // Créer un portal de gestion client
  static async createCustomerPortal(customerId: string, returnUrl: string): Promise<{ url: string }> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error: any) {
      console.error('Erreur création portail client:', error);
      throw new Error(`Erreur portail client: ${error.message}`);
    }
  }

  // Annuler un abonnement
  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error: any) {
      console.error('Erreur annulation abonnement:', error);
      throw new Error(`Erreur annulation: ${error.message}`);
    }
  }

  // Récupérer les informations d'abonnement
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      console.error('Erreur récupération abonnement:', error);
      throw new Error(`Erreur récupération abonnement: ${error.message}`);
    }
  }
}

// Types et interfaces pour l'abonnement
export interface SubscriptionPermissionResult {
  allowed: boolean;
  reason?: string;
  remainingEvents?: number;
  remainingInvitations?: number;
}

export interface UpgradeSubscriptionParams {
  organizationId: string;
  newPlanType: string;
  billingInterval: 'monthly' | 'annual';
  paymentMethodId: string;
}

// Configuration des limites d'abonnement
export const SUBSCRIPTION_LIMITS = {
  decouverte: {
    maxEvents: 1,
    maxInvitations: 20,
    name: 'Découverte',
    price: 0,
  },
  premium: {
    maxEvents: null, // Illimité
    maxInvitations: null, // Illimité
    name: 'Premium',
    price: 1299, // 12,99€/mois
  },
};

// Import du storage - sera résolu à l'exécution
let storage: any;

// Initialiser les plans d'abonnement
export async function initializeSubscriptionPlans(): Promise<void> {
  try {
    // Import dynamique pour éviter les dépendances circulaires
    const { storage: storageInstance } = await import('./storage');
    storage = storageInstance;
    
    console.log('✅ Subscription plans initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize subscription plans:', error);
  }
}

// Vérifier si une organisation peut créer un événement
export async function canCreateEvent(organizationId: string): Promise<SubscriptionPermissionResult> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return { allowed: false, reason: 'Organization not found' };
    }

    // Admin peut toujours créer des événements
    if (organization.role === 'admin') {
      return { allowed: true };
    }

    const limits = SUBSCRIPTION_LIMITS[organization.subscriptionType || 'decouverte'];
    
    // Si pas de limite (premium), autoriser
    if (!limits.maxEvents) {
      return { allowed: true };
    }

    const currentEventCount = organization.eventCreatedCount || 0;
    const remaining = limits.maxEvents - currentEventCount;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: `Limite d'événements atteinte (${limits.maxEvents}). Passez à Premium pour créer des événements illimités.`,
        remainingEvents: 0
      };
    }

    return {
      allowed: true,
      remainingEvents: remaining
    };
  } catch (error) {
    console.error('Error checking event creation permission:', error);
    return { allowed: false, reason: 'Permission check failed' };
  }
}

// Vérifier si une organisation peut envoyer des invitations
export async function canSendInvitations(organizationId: string, count: number = 1): Promise<SubscriptionPermissionResult> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      return { allowed: false, reason: 'Organization not found' };
    }

    // Admin peut toujours envoyer des invitations
    if (organization.role === 'admin') {
      return { allowed: true };
    }

    const limits = SUBSCRIPTION_LIMITS[organization.subscriptionType || 'decouverte'];
    
    // Si pas de limite (premium), autoriser
    if (!limits.maxInvitations) {
      return { allowed: true };
    }

    const currentInvitationCount = organization.invitationsSentCount || 0;
    const remaining = limits.maxInvitations - currentInvitationCount;

    if (remaining < count) {
      return {
        allowed: false,
        reason: `Limite d'invitations atteinte (${limits.maxInvitations}). Passez à Premium pour envoyer des invitations illimitées.`,
        remainingInvitations: Math.max(0, remaining)
      };
    }

    return {
      allowed: true,
      remainingInvitations: remaining
    };
  } catch (error) {
    console.error('Error checking invitation permission:', error);
    return { allowed: false, reason: 'Permission check failed' };
  }
}

// Incrémenter le compteur d'événements créés
export async function incrementEventCount(organizationId: string): Promise<void> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const newCount = (organization.eventCreatedCount || 0) + 1;
    await storage.updateOrganization(organizationId, {
      eventCreatedCount: newCount
    });

    console.log(`✅ Event count incremented for organization ${organizationId}: ${newCount}`);
  } catch (error) {
    console.error('Error incrementing event count:', error);
  }
}

// Incrémenter le compteur d'invitations envoyées
export async function incrementInvitationCount(organizationId: string, count: number = 1): Promise<void> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const newCount = (organization.invitationsSentCount || 0) + count;
    await storage.updateOrganization(organizationId, {
      invitationsSentCount: newCount
    });

    console.log(`✅ Invitation count incremented for organization ${organizationId}: +${count} = ${newCount}`);
  } catch (error) {
    console.error('Error incrementing invitation count:', error);
  }
}

// Créer un abonnement Stripe
export async function createStripeSubscription(organizationId: string, priceId: string): Promise<any> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Créer ou récupérer le customer Stripe
    const customer = await StripeService.createOrGetCustomer(organizationId, organization.email);

    // Créer l'abonnement
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      metadata: {
        organizationId: organizationId,
      },
    });

    // Mettre à jour l'organisation
    await storage.updateOrganization(organizationId, {
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      subscriptionType: 'premium',
      subscriptionStatus: subscription.status,
      subscriptionStartDate: new Date(),
    });

    return subscription;
  } catch (error) {
    console.error('Error creating Stripe subscription:', error);
    throw error;
  }
}

// Mettre à niveau l'abonnement
export async function upgradeSubscription(params: UpgradeSubscriptionParams): Promise<any> {
  try {
    const organization = await storage.getOrganization(params.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Créer ou récupérer le customer si nécessaire
    const customer = await StripeService.createOrGetCustomer(params.organizationId, organization.email);

    // Déterminer le prix basé sur le plan et l'intervalle
    const priceKey = `premium-${params.billingInterval === 'annual' ? 'annual' : 'monthly'}`;
    const priceConfig = PRICE_CONFIG[priceKey as keyof typeof PRICE_CONFIG];

    if (!priceConfig) {
      throw new Error('Invalid pricing configuration');
    }

    // Si l'organisation a déjà un abonnement, le mettre à jour
    if (organization.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.update(organization.stripeSubscriptionId, {
        items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: priceConfig.product,
            },
            unit_amount: priceConfig.price,
            recurring: {
              interval: priceConfig.interval,
            },
          },
        }],
        default_payment_method: params.paymentMethodId,
      });

      await storage.updateOrganization(params.organizationId, {
        subscriptionType: params.newPlanType,
        subscriptionStatus: subscription.status,
        paymentMethod: params.billingInterval,
      });

      return subscription;
    } else {
      // Créer un nouvel abonnement
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: priceConfig.product,
            },
            unit_amount: priceConfig.price,
            recurring: {
              interval: priceConfig.interval,
            },
          },
        }],
        default_payment_method: params.paymentMethodId,
        metadata: {
          organizationId: params.organizationId,
        },
      });

      await storage.updateOrganization(params.organizationId, {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionType: params.newPlanType,
        subscriptionStatus: subscription.status,
        subscriptionStartDate: new Date(),
        paymentMethod: params.billingInterval,
      });

      return subscription;
    }
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    throw error;
  }
}

// Annuler l'abonnement
export async function cancelSubscription(organizationId: string): Promise<any> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization || !organization.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscription = await stripe.subscriptions.update(organization.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await storage.updateOrganization(organizationId, {
      subscriptionStatus: 'cancelled',
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    });

    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

// Créer un customer Stripe
export async function createStripeCustomer(organizationId: string): Promise<Stripe.Customer> {
  try {
    const organization = await storage.getOrganization(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    if (organization.stripeCustomerId) {
      // Récupérer le customer existant
      return await stripe.customers.retrieve(organization.stripeCustomerId) as Stripe.Customer;
    }

    const customer = await StripeService.createOrGetCustomer(organizationId, organization.email);
    
    // Sauvegarder l'ID du customer
    await storage.updateOrganization(organizationId, {
      stripeCustomerId: customer.id,
    });

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

export { stripe };
export default StripeService;