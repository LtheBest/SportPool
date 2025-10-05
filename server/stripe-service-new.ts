/**
 * Service Stripe moderne pour TeamMove
 * Gestion complète des abonnements avec Checkout Sessions
 */

import Stripe from 'stripe';
import { STRIPE_PLANS, STRIPE_CONFIG, getPlanById, createStripeMetadata, type StripePlan } from './stripe-config';
import { storage } from './storage';

// Interface pour les résultats de création de session
export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

// Interface pour les informations d'abonnement
export interface SubscriptionInfo {
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export class StripeServiceNew {
  private stripe: Stripe;
  private static instance: StripeServiceNew;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    console.info('🔷 Stripe service initialized', {
      testMode: STRIPE_CONFIG.isTestMode,
      currency: STRIPE_CONFIG.defaultCurrency,
    });
  }

  static getInstance(): StripeServiceNew {
    if (!StripeServiceNew.instance) {
      StripeServiceNew.instance = new StripeServiceNew();
    }
    return StripeServiceNew.instance;
  }

  /**
   * Crée une Checkout Session pour l'achat d'un abonnement
   */
  async createCheckoutSession(
    organizationId: string,
    planId: string,
    mode: 'subscription' | 'payment' = 'subscription'
  ): Promise<CheckoutSessionResult> {
    try {
      const plan = getPlanById(planId);
      
      if (!plan) {
        return { success: false, error: `Plan ${planId} not found` };
      }

      // Le plan découverte est gratuit, pas besoin de Stripe
      if (plan.price === 0) {
        return { 
          success: false, 
          error: 'Free plan does not require payment' 
        };
      }

      // Vérifier que le plan a un price ID Stripe
      if (!plan.stripePriceId) {
        return { 
          success: false, 
          error: `Stripe price ID not configured for plan ${planId}` 
        };
      }

      // Récupérer ou créer le customer Stripe
      const customer = await this.getOrCreateCustomer(organizationId);

      // Configuration de la session de checkout
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        mode: mode,
        payment_method_types: ['card'],
        
        line_items: [{
          price: plan.stripePriceId,
          quantity: 1,
        }],

        success_url: STRIPE_CONFIG.getSuccessUrl(planId, '{CHECKOUT_SESSION_ID}'),
        cancel_url: STRIPE_CONFIG.getCancelUrl(planId),

        metadata: createStripeMetadata(organizationId, planId),

        // Configuration pour les abonnements
        ...(mode === 'subscription' && {
          subscription_data: {
            metadata: createStripeMetadata(organizationId, planId),
          },
        }),

        // Permettre les codes promo en mode test
        ...(STRIPE_CONFIG.isTestMode && {
          allow_promotion_codes: true,
        }),

        // Configuration de facturation
        billing_address_collection: 'auto',
        tax_id_collection: {
          enabled: true,
        },

        // Configuration des emails
        customer_update: {
          address: 'auto',
          name: 'auto',
        },

        // Durée d'expiration de la session (30 minutes)
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      };

      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      console.info('✅ Checkout session created', {
        sessionId: session.id,
        organizationId,
        planId,
        amount: plan.price,
        currency: plan.currency,
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url || undefined,
      };

    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Récupère ou crée un customer Stripe
   */
  private async getOrCreateCustomer(organizationId: string): Promise<Stripe.Customer> {
    try {
      // Récupérer l'organisation de la DB
      const organization = await storage.getOrganization(organizationId);
      
      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      // Vérifier si un customer existe déjà
      if (organization.stripeCustomerId) {
        try {
          const existingCustomer = await this.stripe.customers.retrieve(
            organization.stripeCustomerId
          );
          
          if (existingCustomer && !existingCustomer.deleted) {
            return existingCustomer as Stripe.Customer;
          }
        } catch (error) {
          console.warn('⚠️ Existing Stripe customer not found, creating new one');
        }
      }

      // Créer un nouveau customer
      const customer = await this.stripe.customers.create({
        email: organization.email,
        name: organization.name,
        metadata: {
          organization_id: organizationId,
          contact_name: `${organization.contactFirstName} ${organization.contactLastName}`,
        },
      });

      // Sauvegarder l'ID du customer dans l'organisation
      await storage.updateOrganization(organizationId, {
        stripeCustomerId: customer.id,
      });

      console.info('✅ Stripe customer created', {
        customerId: customer.id,
        organizationId,
        email: organization.email,
      });

      return customer;

    } catch (error) {
      console.error('❌ Error getting/creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Traite les webhooks Stripe
   */
  async handleWebhook(
    payload: string | Buffer, 
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!STRIPE_CONFIG.webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        STRIPE_CONFIG.webhookSecret
      );

      console.info('📥 Stripe webhook received', {
        type: event.type,
        id: event.id,
      });

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
          
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
          
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          console.info(`📋 Unhandled webhook event type: ${event.type}`);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Gère la completion d'une checkout session
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    try {
      const organizationId = session.metadata?.organization_id;
      const planId = session.metadata?.plan_id;

      if (!organizationId || !planId) {
        throw new Error('Missing organization_id or plan_id in session metadata');
      }

      console.info('✅ Processing checkout session completion', {
        sessionId: session.id,
        organizationId,
        planId,
        amount: session.amount_total,
      });

      // Récupérer les détails du plan
      const plan = getPlanById(planId);
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }

      // Mettre à jour l'abonnement de l'organisation
      await storage.updateOrganization(organizationId, {
        planType: planId,
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      });

      // Réinitialiser les limites d'utilisation
      await this.resetSubscriptionLimits(organizationId, plan);

      console.info('✅ Organization subscription updated', {
        organizationId,
        planId,
      });

    } catch (error) {
      console.error('❌ Error processing checkout session completion:', error);
      throw error;
    }
  }

  /**
   * Gère la création d'un abonnement
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata?.organization_id;
    const planId = subscription.metadata?.plan_id;

    if (!organizationId || !planId) {
      console.warn('⚠️ Missing metadata in subscription created event');
      return;
    }

    console.info('📝 Subscription created', {
      subscriptionId: subscription.id,
      organizationId,
      planId,
      status: subscription.status,
    });

    // Mettre à jour le statut de l'abonnement
    await storage.updateOrganization(organizationId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status as any,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }

  /**
   * Gère la mise à jour d'un abonnement
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata?.organization_id;

    if (!organizationId) {
      console.warn('⚠️ Missing organization_id in subscription updated event');
      return;
    }

    console.info('🔄 Subscription updated', {
      subscriptionId: subscription.id,
      organizationId,
      status: subscription.status,
    });

    await storage.updateOrganization(organizationId, {
      subscriptionStatus: subscription.status as any,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
  }

  /**
   * Gère la suppression d'un abonnement
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata?.organization_id;

    if (!organizationId) {
      console.warn('⚠️ Missing organization_id in subscription deleted event');
      return;
    }

    console.info('🗑️ Subscription deleted', {
      subscriptionId: subscription.id,
      organizationId,
    });

    // Revenir au plan découverte
    await storage.updateOrganization(organizationId, {
      planType: 'decouverte',
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
    });

    // Réinitialiser aux limites du plan découverte
    const discoveryPlan = getPlanById('decouverte');
    if (discoveryPlan) {
      await this.resetSubscriptionLimits(organizationId, discoveryPlan);
    }
  }

  /**
   * Gère les paiements réussis
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.info('💳 Payment succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
    });
    // Logique additionnelle si nécessaire
  }

  /**
   * Gère les paiements échoués
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.warn('❌ Payment failed', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
    });
    // Logique de gestion des échecs de paiement
  }

  /**
   * Réinitialise les limites d'abonnement
   */
  private async resetSubscriptionLimits(organizationId: string, plan: StripePlan) {
    try {
      // Ici vous pouvez implémenter la logique de réinitialisation des compteurs
      // par exemple, remettre à zéro le nombre d'événements utilisés ce mois-ci
      
      console.info('🔄 Subscription limits reset', {
        organizationId,
        planId: plan.id,
        maxEvents: plan.maxEvents,
        maxInvitations: plan.maxInvitations,
      });

      // TODO: Implémenter la réinitialisation des compteurs dans storage
      // await storage.resetMonthlyLimits(organizationId);

    } catch (error) {
      console.error('❌ Error resetting subscription limits:', error);
    }
  }

  /**
   * Récupère les informations d'abonnement d'une organisation
   */
  async getSubscriptionInfo(organizationId: string): Promise<SubscriptionInfo | null> {
    try {
      const organization = await storage.getOrganization(organizationId);
      
      if (!organization) {
        return null;
      }

      const plan = getPlanById(organization.planType);
      
      return {
        planId: organization.planType,
        planName: plan?.name || 'Unknown',
        status: organization.subscriptionStatus || 'inactive',
        currentPeriodEnd: organization.subscriptionCurrentPeriodEnd,
        stripeCustomerId: organization.stripeCustomerId,
        stripeSubscriptionId: organization.stripeSubscriptionId,
      };

    } catch (error) {
      console.error('❌ Error getting subscription info:', error);
      return null;
    }
  }

  /**
   * Annule un abonnement
   */
  async cancelSubscription(organizationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const organization = await storage.getOrganization(organizationId);
      
      if (!organization?.stripeSubscriptionId) {
        // Pas d'abonnement Stripe, juste changer le plan en DB
        await storage.updateOrganization(organizationId, {
          planType: 'decouverte',
          subscriptionStatus: 'cancelled',
        });
        
        return { success: true };
      }

      // Annuler l'abonnement Stripe
      await this.stripe.subscriptions.cancel(organization.stripeSubscriptionId);

      console.info('✅ Subscription cancelled', {
        organizationId,
        subscriptionId: organization.stripeSubscriptionId,
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const stripeService = StripeServiceNew.getInstance();