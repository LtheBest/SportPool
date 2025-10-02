import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt', {
  apiVersion: '2024-09-30.acacia',
});

export interface CreateCheckoutSessionParams {
  mode: 'payment' | 'subscription';
  priceData: {
    currency: string;
    product_data: {
      name: string;
      description: string;
    };
    unit_amount: number;
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
    };
  };
  quantity: number;
  successUrl: string;
  cancelUrl: string;
  metadata: {
    organizationId: string;
    planId: string;
    planType: string;
  };
  customerEmail?: string;
}

export class StripeService {
  
  // Créer une session de checkout moderne
  static async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{ id: string; url: string | null }> {
    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: params.mode,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        automatic_tax: {
          enabled: true,
        },
        customer_creation: 'if_required',
      };

      // Configuration des line items selon le mode
      if (params.mode === 'payment') {
        // Paiement unique pour les packs événementiels
        sessionConfig.line_items = [{
          price_data: params.priceData,
          quantity: params.quantity,
        }];

        sessionConfig.payment_intent_data = {
          description: `${params.priceData.product_data.name} - TeamMove`,
          metadata: params.metadata,
        };
      } else {
        // Abonnement pour les formules Pro
        if (!params.priceData.recurring) {
          throw new Error('Recurring configuration required for subscription mode');
        }

        sessionConfig.line_items = [{
          price_data: params.priceData,
          quantity: params.quantity,
        }];

        sessionConfig.subscription_data = {
          description: `${params.priceData.product_data.name} - TeamMove`,
          metadata: params.metadata,
          trial_period_days: 0, // Pas d'essai gratuit pour le moment
        };
      }

      // Ajouter l'email du client s'il est fourni
      if (params.customerEmail) {
        sessionConfig.customer_email = params.customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      return { 
        id: session.id,
        url: session.url || null
      };
    } catch (error: any) {
      console.error('Erreur création session Stripe:', error);
      throw new Error(`Erreur Stripe: ${error.message}`);
    }
  }

  // Récupérer une session de checkout
  static async getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription']
      });
    } catch (error: any) {
      console.error('Erreur récupération session:', error);
      throw new Error(`Erreur récupération session: ${error.message}`);
    }
  }

  // Créer un customer Stripe
  static async createCustomer(organizationId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          organizationId: organizationId,
        },
      });

      return customer;
    } catch (error: any) {
      console.error('Erreur création customer:', error);
      throw new Error(`Erreur customer: ${error.message}`);
    }
  }

  // Rechercher ou créer un customer
  static async findOrCreateCustomer(organizationId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      // Chercher un customer existant par email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        
        // Mettre à jour les métadonnées si nécessaire
        if (customer.metadata?.organizationId !== organizationId) {
          return await stripe.customers.update(customer.id, {
            metadata: {
              organizationId: organizationId,
            },
          }) as Stripe.Customer;
        }
        
        return customer;
      }

      // Créer un nouveau customer
      return await this.createCustomer(organizationId, email, name);
    } catch (error: any) {
      console.error('Erreur recherche/création customer:', error);
      throw error;
    }
  }

  // Récupérer les informations d'abonnement
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'customer']
      });
    } catch (error: any) {
      console.error('Erreur récupération abonnement:', error);
      throw error;
    }
  }

  // Annuler un abonnement
  static async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        return await stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error: any) {
      console.error('Erreur annulation abonnement:', error);
      throw error;
    }
  }

  // Créer un portail client pour la gestion de facturation
  static async createCustomerPortal(customerId: string, returnUrl: string): Promise<{ url: string }> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error: any) {
      console.error('Erreur création portail client:', error);
      throw error;
    }
  }

  // Récupérer les factures d'un client
  static async getCustomerInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: limit,
        expand: ['data.payment_intent']
      });

      return invoices.data;
    } catch (error: any) {
      console.error('Erreur récupération factures:', error);
      throw error;
    }
  }

  // Récupérer une facture spécifique
  static async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await stripe.invoices.retrieve(invoiceId, {
        expand: ['payment_intent', 'subscription', 'customer']
      });
    } catch (error: any) {
      console.error('Erreur récupération facture:', error);
      throw error;
    }
  }

  // Générer une facture proforma pour prévisualisation
  static async createProformaInvoice(customerId: string, items: any[]): Promise<Stripe.Invoice> {
    try {
      const invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: false, // Ne pas collecter automatiquement
        collection_method: 'send_invoice',
      });

      // Ajouter les éléments de facturation
      for (const item of items) {
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoice.id,
          amount: item.amount,
          currency: item.currency || 'eur',
          description: item.description,
        });
      }

      // Finaliser la facture pour calcul des taxes
      return await stripe.invoices.finalizeInvoice(invoice.id);
    } catch (error: any) {
      console.error('Erreur création facture proforma:', error);
      throw error;
    }
  }

  // Gérer les webhooks Stripe
  static async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('⚠️  STRIPE_WEBHOOK_SECRET non configuré - webhook ignoré');
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      console.log(`📨 Webhook reçu: ${event.type} - ID: ${event.id}`);

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

        case 'payment_intent.created':
          await this.handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
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

        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        default:
          console.log(`ℹ️  Événement webhook non géré: ${event.type}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur webhook Stripe:', error);
      throw new Error(`Erreur webhook: ${error.message}`);
    }
  }

  // Gestion des événements webhook
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('✅ Checkout session completed:', session.id);
    
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;
    
    if (!organizationId || !planId) {
      console.error('❌ Métadonnées manquantes dans la session checkout');
      return;
    }

    // Importer et utiliser le service d'abonnement pour traiter le paiement
    try {
      const { SubscriptionService } = await import('./subscription-service');
      await SubscriptionService.handlePaymentSuccess(session.id, organizationId, planId);
    } catch (error) {
      console.error('❌ Erreur traitement paiement réussi:', error);
    }
  }

  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('💳 Payment succeeded:', paymentIntent.id);
    // Logique additionnelle si nécessaire
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('❌ Payment failed:', paymentIntent.id);
    // Notifier l'utilisateur du paiement échoué
  }

  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('📄 Invoice payment succeeded:', invoice.id);
    // Traitement des paiements d'abonnement réussis
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('❌ Invoice payment failed:', invoice.id);
    // Traitement des paiements d'abonnement échoués
  }

  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('🆕 Subscription created:', subscription.id);
    // Traitement de création d'abonnement
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('🔄 Subscription updated:', subscription.id);
    // Traitement de mise à jour d'abonnement
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('🗑️  Subscription deleted:', subscription.id);
    // Traitement de suppression d'abonnement - rétrograder l'utilisateur
  }

  private static async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    console.log('🆕 Payment Intent created:', paymentIntent.id);
    // Peut être utilisé pour tracer les tentatives de paiement
  }

  private static async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    console.log('💳 Payment method attached:', paymentMethod.id);
    // Traitement quand une méthode de paiement est attachée à un client
  }

  private static async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    console.log('👤 Customer created:', customer.id);
    // Traitement lors de la création d'un nouveau client Stripe
  }

  private static async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    console.log('👤 Customer updated:', customer.id);
    // Traitement lors de la mise à jour d'un client
  }

  // Mode test/production
  static isTestMode(): boolean {
    const apiKey = process.env.STRIPE_SECRET_KEY || '';
    return apiKey.includes('_test_') || apiKey.startsWith('sk_test_');
  }

  // Obtenir les clés publiques selon le mode
  static getPublishableKey(): string {
    if (this.isTestMode()) {
      return process.env.STRIPE_PUBLISHABLE_TEST_KEY || 'pk_test_...';
    }
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }

  // Vérifier la configuration Stripe
  static async verifyConfiguration(): Promise<{ valid: boolean; mode: string; issues?: string[] }> {
    try {
      const issues: string[] = [];
      
      // Vérifier les clés d'API
      if (!process.env.STRIPE_SECRET_KEY) {
        issues.push('STRIPE_SECRET_KEY manquante');
      }

      const mode = this.isTestMode() ? 'test' : 'production';

      // Test de connexion basique
      try {
        await stripe.accounts.retrieve();
      } catch (error) {
        issues.push('Connexion à Stripe échouée');
      }

      return {
        valid: issues.length === 0,
        mode,
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