// server/stripe-service.ts
import Stripe from 'stripe';
import { db } from './db';

// This is your test secret API key.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt', {
  apiVersion: '2024-12-18.acacia',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
  features: string[];
  stripePriceId: string;
  maxEvents?: number;
  maxInvitations?: number;
}

// Plans d'abonnement disponibles
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    description: 'Parfait pour tester notre plateforme',
    price: 0,
    currency: 'eur',
    interval: 'one_time',
    features: [
      '3 événements par mois',
      '50 invitations par événement',
      'Support par email',
      'Fonctionnalités de base'
    ],
    stripePriceId: '', // Pas de prix Stripe pour le plan gratuit
    maxEvents: 3,
    maxInvitations: 50
  },
  {
    id: 'evenementielle',
    name: 'Événementielle',
    description: 'Pour les organisateurs occasionnels',
    price: 1990, // 19.90 EUR en centimes
    currency: 'eur',
    interval: 'one_time',
    features: [
      '10 événements',
      '100 invitations par événement',
      'Support prioritaire',
      'Analytics avancées',
      'Personnalisation'
    ],
    stripePriceId: 'price_evenementielle', // À créer dans Stripe
    maxEvents: 10,
    maxInvitations: 100
  },
  {
    id: 'pro_club',
    name: 'Clubs & Associations',
    description: 'Pour les clubs sportifs et associations',
    price: 4990, // 49.90 EUR en centimes
    currency: 'eur',
    interval: 'month',
    features: [
      'Événements illimités',
      'Invitations illimitées',
      'Support téléphonique',
      'API d\'intégration',
      'Rapports détaillés',
      'Marque personnalisée'
    ],
    stripePriceId: 'price_pro_club', // À créer dans Stripe
  },
  {
    id: 'pro_pme',
    name: 'PME',
    description: 'Pour les petites et moyennes entreprises',
    price: 9990, // 99.90 EUR en centimes
    currency: 'eur',
    interval: 'month',
    features: [
      'Toutes les fonctionnalités Pro',
      'Multi-équipes',
      'Gestionnaire de compte dédié',
      'Formation personnalisée',
      'SLA garanti',
      'Intégrations avancées'
    ],
    stripePriceId: 'price_pro_pme', // À créer dans Stripe
  },
  {
    id: 'pro_entreprise',
    name: 'Grandes Entreprises',
    description: 'Solution sur mesure pour les grandes organisations',
    price: 19990, // 199.90 EUR en centimes
    currency: 'eur',
    interval: 'month',
    features: [
      'Toutes les fonctionnalités PME',
      'Déploiement sur site',
      'Support 24/7',
      'Développement personnalisé',
      'Audit de sécurité',
      'Contrat sur mesure'
    ],
    stripePriceId: 'price_pro_entreprise', // À créer dans Stripe
  }
];

export class StripeService {
  /**
   * Créer une session de checkout Stripe
   */
  static async createCheckoutSession(params: {
    planId: string;
    organizationId: string;
    organizationEmail: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === params.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Plan découverte gratuit - pas besoin de Stripe
    if (plan.id === 'decouverte') {
      throw new Error('Free plan does not require payment');
    }

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency,
              product_data: {
                name: plan.name,
                description: plan.description,
              },
              unit_amount: plan.price,
              ...(plan.interval !== 'one_time' && {
                recurring: {
                  interval: plan.interval,
                },
              }),
            },
            quantity: 1,
          },
        ],
        mode: plan.interval === 'one_time' ? 'payment' : 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.organizationEmail,
        metadata: {
          organizationId: params.organizationId,
          planId: plan.id,
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      return {
        id: session.id,
        url: session.url,
      };
    } catch (error: any) {
      console.error('Stripe checkout session creation error:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Vérifier une session de paiement
   */
  static async verifySession(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription']
      });

      return {
        id: session.id,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        metadata: session.metadata,
        paymentIntent: session.payment_intent,
        subscription: session.subscription,
      };
    } catch (error: any) {
      console.error('Session verification error:', error);
      throw new Error(`Failed to verify session: ${error.message}`);
    }
  }

  /**
   * Traiter le succès d'un paiement
   */
  static async processSuccessfulPayment(sessionId: string) {
    const session = await this.verifySession(sessionId);
    
    if (session.paymentStatus !== 'paid') {
      throw new Error('Payment not completed');
    }

    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;

    if (!organizationId || !planId) {
      throw new Error('Missing metadata');
    }

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Mettre à jour l'abonnement dans la base de données
    await this.updateOrganizationSubscription(organizationId, planId, session);

    return { organizationId, planId, plan };
  }

  /**
   * Mettre à jour l'abonnement d'une organisation
   */
  static async updateOrganizationSubscription(
    organizationId: string, 
    planId: string, 
    session: any
  ) {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    try {
      // Calculer les nouvelles limites
      let newEventLimit = null;
      let newInvitationLimit = null;
      let subscriptionEndDate = null;

      if (plan.maxEvents !== undefined) {
        newEventLimit = plan.maxEvents;
      }
      if (plan.maxInvitations !== undefined) {
        newInvitationLimit = plan.maxInvitations;
      }

      // Pour les abonnements récurrents, calculer la date de fin
      if (plan.interval === 'month') {
        subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      } else if (plan.interval === 'year') {
        subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
      }

      // Mettre à jour l'organisation
      await db.updateOrganization(organizationId, {
        planType: planId,
        subscriptionStatus: 'active',
        subscriptionStripeSessionId: session.id,
        subscriptionStripeCustomerId: session.customer_email,
        subscriptionEndDate: subscriptionEndDate?.toISOString(),
        eventLimit: newEventLimit,
        invitationLimit: newInvitationLimit,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Subscription updated for organization ${organizationId} to plan ${planId}`);
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Obtenir les informations d'abonnement d'une organisation
   */
  static async getOrganizationSubscription(organizationId: string) {
    try {
      const organization = await db.getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === organization.planType) || SUBSCRIPTION_PLANS[0];

      return {
        organizationId,
        subscriptionType: organization.planType || 'decouverte',
        subscriptionStatus: organization.subscriptionStatus || 'active',
        currentPlan,
        subscriptionEndDate: organization.subscriptionEndDate,
        eventLimit: organization.eventLimit,
        invitationLimit: organization.invitationLimit,
        remainingEvents: organization.eventLimit ? Math.max(0, organization.eventLimit - (organization.eventsUsed || 0)) : null,
        remainingInvitations: organization.invitationLimit ? Math.max(0, organization.invitationLimit - (organization.invitationsUsed || 0)) : null,
      };
    } catch (error: any) {
      console.error('Error getting subscription:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  /**
   * Annuler un abonnement (revenir au plan découverte)
   */
  static async cancelSubscription(organizationId: string) {
    try {
      await db.updateOrganization(organizationId, {
        planType: 'decouverte',
        subscriptionStatus: 'cancelled',
        subscriptionEndDate: null,
        subscriptionStripeSessionId: null,
        subscriptionStripeCustomerId: null,
        eventLimit: SUBSCRIPTION_PLANS[0].maxEvents,
        invitationLimit: SUBSCRIPTION_PLANS[0].maxInvitations,
        updatedAt: new Date().toISOString(),
      });

      console.log(`✅ Subscription cancelled for organization ${organizationId}`);
      return true;
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Gérer les webhooks Stripe
   */
  static async handleWebhook(body: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not configured');
      return;
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: any) {
      console.error('Webhook signature verification failed:', error.message);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }

    console.log(`📨 Received webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded':
        console.log('💰 Payment succeeded:', event.data.object.id);
        break;
      
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Gérer la completion d'une session de checkout
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ Checkout completed:', session.id);
    
    try {
      await this.processSuccessfulPayment(session.id);
    } catch (error) {
      console.error('Error processing successful payment:', error);
    }
  }

  /**
   * Gérer la suppression d'un abonnement
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    console.log('🗑️ Subscription deleted:', subscription.id);
    
    // Trouver l'organisation par l'ID client Stripe
    const customerId = typeof subscription.customer === 'string' 
      ? subscription.customer 
      : subscription.customer?.id;
    
    if (customerId) {
      // Logique pour retrouver et mettre à jour l'organisation
      // Cette partie nécessiterait une recherche dans la base de données
      console.log('Subscription cancelled for customer:', customerId);
    }
  }

  /**
   * Obtenir la clé publique Stripe
   */
  static getPublishableKey(): string {
    return process.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj';
  }

  /**
   * Vérifier la configuration Stripe
   */
  static async verifyConfiguration() {
    try {
      await stripe.accounts.retrieve();
      return { 
        success: true, 
        mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}