import Stripe from 'stripe';
import { Request, Response } from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Plans d'abonnement disponibles
export const SUBSCRIPTION_PLANS = {
  DISCOVERY: {
    id: 'discovery',
    name: 'Découverte',
    price: 0,
    priceId: null, // Plan gratuit
    features: [
      'Création d\'événements limitée (3/mois)',
      'Jusqu\'à 20 participants par événement',
      'Support par email',
      'Fonctionnalités de base'
    ],
    limits: {
      eventsPerMonth: 3,
      participantsPerEvent: 20,
      storageGB: 1
    }
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 1999, // 19.99€ en centimes
    priceId: 'price_starter_monthly', // À créer dans Stripe
    features: [
      'Création d\'événements illimitée',
      'Jusqu\'à 100 participants par événement',
      'Messagerie avancée',
      'Import CSV',
      'Statistiques de base',
      'Support prioritaire'
    ],
    limits: {
      eventsPerMonth: -1, // Illimité
      participantsPerEvent: 100,
      storageGB: 10
    }
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professionnel',
    price: 4999, // 49.99€ en centimes
    priceId: 'price_professional_monthly', // À créer dans Stripe
    features: [
      'Tout du plan Starter',
      'Participants illimités',
      'Personnalisation avancée',
      'Branding personnalisé',
      'Analytics avancées',
      'Support téléphonique',
      'API Access'
    ],
    limits: {
      eventsPerMonth: -1, // Illimité
      participantsPerEvent: -1, // Illimité
      storageGB: 100
    }
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9999, // 99.99€ en centimes
    priceId: 'price_enterprise_monthly', // À créer dans Stripe
    features: [
      'Tout du plan Professionnel',
      'Multi-organisation',
      'Intégrations personnalisées',
      'Support dédié 24/7',
      'Formation personnalisée',
      'SLA garanti'
    ],
    limits: {
      eventsPerMonth: -1, // Illimité
      participantsPerEvent: -1, // Illimité
      storageGB: -1 // Illimité
    }
  }
};

export class StripeService {
  
  /**
   * Créer une session de checkout Stripe
   */
  static async createCheckoutSession(
    planId: keyof typeof SUBSCRIPTION_PLANS,
    customerId?: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<Stripe.Checkout.Session> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    if (!plan || !plan.priceId) {
      throw new Error('Plan invalide ou indisponible pour le paiement');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/payment/cancelled`,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      metadata: {
        planId: plan.id,
        planName: plan.name,
      },
    });

    return session;
  }

  /**
   * Créer un client Stripe
   */
  static async createCustomer(
    email: string,
    name?: string,
    organizationId?: string
  ): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId: organizationId || '',
      },
    });

    return customer;
  }

  /**
   * Récupérer les détails d'une session de checkout
   */
  static async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });
  }

  /**
   * Récupérer une souscription
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Annuler une souscription
   */
  static async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Créer un portail de facturation
   */
  static async createBillingPortal(
    customerId: string,
    returnUrl?: string
  ): Promise<Stripe.BillingPortal.Session> {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || process.env.APP_URL,
    });
  }

  /**
   * Webhook handler pour les événements Stripe
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await StripeService.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'invoice.payment_succeeded':
          await StripeService.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await StripeService.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.deleted':
          await StripeService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.updated':
          await StripeService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Webhook handler error' });
    }
  }

  /**
   * Gérer la completion d'un checkout
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Checkout completed:', session.id);
    
    // Ici, vous devrez implémenter la logique pour :
    // 1. Récupérer l'organisation depuis la DB
    // 2. Mettre à jour le plan de l'organisation
    // 3. Activer les fonctionnalités correspondantes
    // 4. Envoyer un email de confirmation
    
    const { planId } = session.metadata!;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    // TODO: Implémenter la mise à jour de la base de données
    console.log(`Plan ${planId} activé pour le client ${customerId}, subscription: ${subscriptionId}`);
  }

  /**
   * Gérer le succès d'un paiement
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment succeeded:', invoice.id);
    
    // TODO: Implémenter la logique de renouvellement d'abonnement
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;
    
    console.log(`Paiement réussi pour le client ${customerId}, subscription: ${subscriptionId}`);
  }

  /**
   * Gérer l'échec d'un paiement
   */
  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment failed:', invoice.id);
    
    // TODO: Implémenter la logique d'échec de paiement
    // 1. Marquer l'organisation comme en défaut de paiement
    // 2. Envoyer un email de notification
    // 3. Désactiver certaines fonctionnalités si nécessaire
    
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;
    
    console.log(`Paiement échoué pour le client ${customerId}, subscription: ${subscriptionId}`);
  }

  /**
   * Gérer la suppression d'un abonnement
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    
    // TODO: Implémenter la logique d'annulation
    // 1. Rétrograder l'organisation au plan gratuit
    // 2. Désactiver les fonctionnalités premium
    // 3. Envoyer un email de confirmation
    
    const customerId = subscription.customer as string;
    
    console.log(`Abonnement annulé pour le client ${customerId}`);
  }

  /**
   * Gérer la mise à jour d'un abonnement
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    
    // TODO: Implémenter la logique de mise à jour
    // 1. Mettre à jour le plan dans la DB
    // 2. Ajuster les fonctionnalités disponibles
    
    const customerId = subscription.customer as string;
    
    console.log(`Abonnement mis à jour pour le client ${customerId}`);
  }

  /**
   * Créer les prix dans Stripe (à exécuter une seule fois)
   */
  static async createPrices(): Promise<void> {
    try {
      // Prix pour le plan Starter
      const starterPrice = await stripe.prices.create({
        unit_amount: SUBSCRIPTION_PLANS.STARTER.price,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: {
          name: SUBSCRIPTION_PLANS.STARTER.name,
          description: 'Plan Starter - Fonctionnalités avancées pour les organisations',
        },
      });
      console.log('Starter price created:', starterPrice.id);

      // Prix pour le plan Professional
      const professionalPrice = await stripe.prices.create({
        unit_amount: SUBSCRIPTION_PLANS.PROFESSIONAL.price,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: {
          name: SUBSCRIPTION_PLANS.PROFESSIONAL.name,
          description: 'Plan Professionnel - Toutes les fonctionnalités avancées',
        },
      });
      console.log('Professional price created:', professionalPrice.id);

      // Prix pour le plan Enterprise
      const enterprisePrice = await stripe.prices.create({
        unit_amount: SUBSCRIPTION_PLANS.ENTERPRISE.price,
        currency: 'eur',
        recurring: { interval: 'month' },
        product_data: {
          name: SUBSCRIPTION_PLANS.ENTERPRISE.name,
          description: 'Plan Enterprise - Solution complète pour grandes organisations',
        },
      });
      console.log('Enterprise price created:', enterprisePrice.id);

      console.log('\n=== MISE À JOUR NÉCESSAIRE ===');
      console.log('Veuillez mettre à jour les priceId dans SUBSCRIPTION_PLANS:');
      console.log(`STARTER.priceId: "${starterPrice.id}"`);
      console.log(`PROFESSIONAL.priceId: "${professionalPrice.id}"`);
      console.log(`ENTERPRISE.priceId: "${enterprisePrice.id}"`);
    } catch (error) {
      console.error('Error creating prices:', error);
    }
  }
}

export default StripeService;