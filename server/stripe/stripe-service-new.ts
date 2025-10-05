import Stripe from 'stripe';
import { stripeConfig, getStripePlan, type StripePlan } from './stripe-config';

// Initialisation Stripe sécurisée
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion,
  typescript: true,
});

export interface CreateCheckoutParams {
  planId: string;
  organizationId: string;
  customerEmail: string;
  mode: 'registration' | 'upgrade';
  organizationName?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string | null;
  plan: StripePlan;
}

export class NewStripeService {
  
  /**
   * Créer une session Stripe Checkout
   */
  static async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResponse> {
    console.log('🎯 Création session checkout:', { planId: params.planId, mode: params.mode });
    
    // Validation des paramètres
    if (!stripeConfig.isValid()) {
      throw new Error('Configuration Stripe invalide');
    }
    
    const plan = getStripePlan(params.planId);
    if (!plan) {
      throw new Error(`Plan non trouvé: ${params.planId}`);
    }
    
    // Plan gratuit - pas besoin de Stripe
    if (plan.priceAmount === 0) {
      throw new Error('Le plan Découverte ne nécessite pas de paiement');
    }
    
    try {
      // Configuration de base de la session
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: plan.type === 'subscription' ? 'subscription' : 'payment',
        success_url: stripeConfig.getSuccessUrl(params.mode),
        cancel_url: stripeConfig.getCancelUrl(params.mode),
        
        // Métadonnées pour le webhook
        metadata: {
          organizationId: params.organizationId,
          planId: params.planId,
          mode: params.mode,
          ...params.metadata
        },
        
        // Configuration client
        customer_email: params.customerEmail,
        billing_address_collection: 'required',
        phone_number_collection: {
          enabled: true
        },
        
        // Options avancées
        allow_promotion_codes: true,
        automatic_tax: {
          enabled: true
        },
        
        // Configuration des line items
        line_items: [{
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: plan.description,
              metadata: {
                planId: plan.id,
                features: JSON.stringify(plan.features)
              }
            },
            unit_amount: plan.priceAmount,
            ...(plan.type === 'subscription' && plan.interval && {
              recurring: {
                interval: plan.interval
              }
            })
          },
          quantity: 1
        }],
        
        // Locale française
        locale: 'fr'
      };
      
      // Configuration spécifique pour les abonnements
      if (plan.type === 'subscription') {
        sessionConfig.subscription_data = {
          description: `Abonnement ${plan.name} - TeamMove`,
          metadata: {
            organizationId: params.organizationId,
            planId: params.planId,
            mode: params.mode
          },
          trial_settings: {
            end_behavior: {
              missing_payment_method: 'cancel'
            }
          }
        };
      }
      
      // Configuration pour les paiements uniques
      if (plan.type === 'payment') {
        sessionConfig.payment_intent_data = {
          description: `${plan.name} - TeamMove`,
          metadata: {
            organizationId: params.organizationId,
            planId: params.planId,
            mode: params.mode
          }
        };
      }
      
      // Création de la session
      const session = await stripe.checkout.sessions.create(sessionConfig);
      
      console.log('✅ Session checkout créée:', session.id);
      
      return {
        sessionId: session.id,
        url: session.url,
        plan
      };
      
    } catch (error: any) {
      console.error('❌ Erreur création session Stripe:', error);
      throw new Error(`Erreur de paiement: ${error.message}`);
    }
  }
  
  /**
   * Récupérer une session checkout
   */
  static async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription', 'customer']
      });
    } catch (error: any) {
      console.error('❌ Erreur récupération session:', error);
      throw new Error(`Session introuvable: ${error.message}`);
    }
  }
  
  /**
   * Créer ou récupérer un client Stripe
   */
  static async findOrCreateCustomer(email: string, organizationId: string, name?: string): Promise<Stripe.Customer> {
    try {
      // Chercher un client existant
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        
        // Mettre à jour les métadonnées si nécessaire
        if (customer.metadata?.organizationId !== organizationId) {
          return await stripe.customers.update(customer.id, {
            metadata: {
              organizationId,
              updatedAt: new Date().toISOString()
            }
          }) as Stripe.Customer;
        }
        
        return customer;
      }
      
      // Créer un nouveau client
      return await stripe.customers.create({
        email,
        name: name || email.split('@')[0],
        metadata: {
          organizationId,
          createdAt: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('❌ Erreur gestion client Stripe:', error);
      throw new Error(`Erreur client: ${error.message}`);
    }
  }
  
  /**
   * Gérer les webhooks Stripe
   */
  static async handleWebhook(
    payload: string | Buffer, 
    signature: string
  ): Promise<{ success: boolean; event?: Stripe.Event; error?: string }> {
    
    if (!stripeConfig.webhookSecret) {
      return { success: false, error: 'Webhook secret non configuré' };
    }
    
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeConfig.webhookSecret
      );
      
      console.log(`📨 Webhook reçu: ${event.type} [${event.id}]`);
      
      // Traitement selon le type d'événement
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
          
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionChanged(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
          
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
          
        default:
          console.log(`ℹ️  Événement webhook non géré: ${event.type}`);
      }
      
      return { success: true, event };
      
    } catch (error: any) {
      console.error('❌ Erreur webhook Stripe:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Gestionnaires d'événements webhook
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('✅ Checkout session completed:', session.id);
    
    const { organizationId, planId, mode } = session.metadata || {};
    
    if (!organizationId || !planId) {
      console.error('❌ Métadonnées manquantes dans la session');
      return;
    }
    
    try {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { handleSuccessfulPayment } = await import('./stripe-payment-handler');
      await handleSuccessfulPayment({
        sessionId: session.id,
        organizationId,
        planId,
        mode: mode as 'registration' | 'upgrade',
        paymentIntentId: session.payment_intent as string,
        subscriptionId: session.subscription as string,
        customerEmail: session.customer_details?.email || '',
        amountPaid: session.amount_total || 0
      });
    } catch (error) {
      console.error('❌ Erreur traitement paiement réussi:', error);
    }
  }
  
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('💳 Payment succeeded:', paymentIntent.id);
    // Logique additionnelle pour les paiements réussis
  }
  
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('❌ Payment failed:', paymentIntent.id);
    // Logique pour les paiements échoués
  }
  
  private static async handleSubscriptionChanged(subscription: Stripe.Subscription): Promise<void> {
    console.log('🔄 Subscription changed:', subscription.id);
    
    try {
      const { handleSubscriptionUpdate } = await import('./stripe-payment-handler');
      await handleSubscriptionUpdate(subscription);
    } catch (error) {
      console.error('❌ Erreur mise à jour abonnement:', error);
    }
  }
  
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('🗑️  Subscription deleted:', subscription.id);
    
    try {
      const { handleSubscriptionCancellation } = await import('./stripe-payment-handler');
      await handleSubscriptionCancellation(subscription);
    } catch (error) {
      console.error('❌ Erreur annulation abonnement:', error);
    }
  }
  
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('📄 Invoice payment succeeded:', invoice.id);
    // Logique pour les factures payées
  }
  
  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('❌ Invoice payment failed:', invoice.id);
    // Logique pour les factures impayées
  }
  
  /**
   * Créer un portail client pour la gestion des abonnements
   */
  static async createCustomerPortal(
    customerId: string, 
    returnUrl: string
  ): Promise<{ url: string }> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
      
      return { url: session.url };
    } catch (error: any) {
      console.error('❌ Erreur portail client:', error);
      throw new Error(`Erreur portail: ${error.message}`);
    }
  }
  
  /**
   * Vérifier la configuration Stripe
   */
  static async verifyConfiguration(): Promise<{
    valid: boolean;
    mode: string;
    account?: Stripe.Account;
    issues?: string[];
  }> {
    try {
      const issues: string[] = [];
      
      if (!stripeConfig.secretKey) {
        issues.push('STRIPE_SECRET_KEY manquante');
      }
      
      if (!stripeConfig.publishableKey) {
        issues.push('VITE_STRIPE_PUBLIC_KEY manquante');
      }
      
      const mode = stripeConfig.isTestMode() ? 'test' : 'production';
      
      // Test de connexion
      let account: Stripe.Account | undefined;
      try {
        account = await stripe.accounts.retrieve();
        console.log(`✅ Stripe connecté - Mode: ${mode}, Account: ${account.id}`);
      } catch (error) {
        issues.push('Impossible de se connecter à Stripe');
      }
      
      return {
        valid: issues.length === 0,
        mode,
        account,
        issues: issues.length > 0 ? issues : undefined
      };
      
    } catch (error: any) {
      return {
        valid: false,
        mode: 'unknown',
        issues: [error.message]
      };
    }
  }
}

export { stripe };