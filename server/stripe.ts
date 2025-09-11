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

export { stripe };
export default StripeService;