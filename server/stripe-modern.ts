import Stripe from 'stripe';

// Configuration des types de plans et prix
interface PlanConfig {
  id: string;
  name: string;
  type: 'decouverte' | 'evenementielle' | 'pro';
  mode: 'payment' | 'subscription';
  price: number; // prix en centimes
  currency: string;
  interval?: 'month' | 'year';
  features: string[];
  description: string;
  stripePriceId?: string;
}

// Configuration des plans d'abonnement
export const STRIPE_PLANS: { [key: string]: PlanConfig } = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    type: 'decouverte',
    mode: 'payment', // Gratuit, pas de paiement réel
    price: 0,
    currency: 'EUR',
    features: [
      '1 événement maximum',
      'Jusqu\'à 20 invitations',
      'Gestion du covoiturage',
      'Support par email'
    ],
    description: 'Parfait pour découvrir TeamMove'
  },
  'evenementielle-single': {
    id: 'evenementielle-single',
    name: 'Pack Événement',
    type: 'evenementielle',
    mode: 'payment',
    price: 1500, // 15€
    currency: 'EUR',
    features: [
      '1 événement complet',
      'Invitations illimitées',
      'Personnalisation avancée',
      'Support prioritaire'
    ],
    description: 'Idéal pour un événement ponctuel',
    stripePriceId: process.env.STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID
  },
  'evenementielle-pack10': {
    id: 'evenementielle-pack10',
    name: 'Pack 10 Événements',
    type: 'evenementielle',
    mode: 'payment',
    price: 15000, // 150€
    currency: 'EUR',
    features: [
      '10 événements complets',
      'Invitations illimitées',
      'Personnalisation avancée',
      'Support prioritaire',
      'Valable 12 mois'
    ],
    description: 'Parfait pour les organisateurs réguliers',
    stripePriceId: process.env.STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID
  },
  'pro-club': {
    id: 'pro-club',
    name: 'Clubs & Associations',
    type: 'pro',
    mode: 'subscription',
    price: 1999, // 19,99€
    currency: 'EUR',
    interval: 'month',
    features: [
      'Événements illimités',
      'Invitations illimitées',
      'Branding personnalisé',
      'API d\'intégration',
      'Support prioritaire'
    ],
    description: 'Conçu pour les clubs et associations',
    stripePriceId: process.env.STRIPE_PRO_CLUB_PRICE_ID
  },
  'pro-pme': {
    id: 'pro-pme',
    name: 'PME',
    type: 'pro',
    mode: 'subscription',
    price: 4900, // 49€
    currency: 'EUR',
    interval: 'month',
    features: [
      'Tout de Clubs & Associations',
      'Multi-utilisateurs (5 admins)',
      'Gestion des équipes',
      'Reporting avancé',
      'Support téléphonique'
    ],
    description: 'Idéal pour les PME',
    stripePriceId: process.env.STRIPE_PRO_PME_PRICE_ID
  },
  'pro-entreprise': {
    id: 'pro-entreprise',
    name: 'Grandes Entreprises',
    type: 'pro',
    mode: 'subscription',
    price: 9900, // 99€
    currency: 'EUR',
    interval: 'month',
    features: [
      'Tout de PME',
      'Multi-utilisateurs illimités',
      'Gestion multi-sites',
      'API complète',
      'Support 24/7',
      'Account Manager dédié'
    ],
    description: 'Solution entreprise complète',
    stripePriceId: process.env.STRIPE_PRO_ENTREPRISE_PRICE_ID
  }
};

class StripeModernService {
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY n\'est pas configuré');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  /**
   * Créer une session de checkout Stripe
   */
  async createCheckoutSession(params: {
    organizationId: string;
    planId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{
    sessionId: string;
    url: string | null;
    planId: string;
  }> {
    const { organizationId, planId, customerEmail, successUrl, cancelUrl } = params;

    // Vérifier que le plan existe
    const plan = STRIPE_PLANS[planId];
    if (!plan) {
      throw new Error(`Plan ${planId} non trouvé`);
    }

    // Plan découverte = gratuit, pas de session Stripe
    if (planId === 'decouverte') {
      throw new Error('Le plan Découverte est gratuit et ne nécessite pas de paiement');
    }

    // Valider les URLs de redirection
    if (!successUrl || !cancelUrl) {
      throw new Error('Aucune URL de redirection fournie');
    }

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: plan.mode,
        customer_email: customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId: organizationId,
          planId: planId,
          planType: plan.type,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        automatic_tax: { enabled: true },
      };

      // Configuration ligne d'articles
      if (plan.stripePriceId) {
        // Utiliser Price ID configuré
        sessionParams.line_items = [{
          price: plan.stripePriceId,
          quantity: 1,
        }];
      } else {
        // Créer le prix à la volée (fallback)
        const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
          currency: plan.currency.toLowerCase(),
          unit_amount: plan.price,
          product_data: {
            name: plan.name,
            description: plan.description,
            metadata: {
              planId: planId,
              planType: plan.type,
            },
          },
        };

        if (plan.mode === 'subscription' && plan.interval) {
          priceData.recurring = {
            interval: plan.interval,
          };
        }

        sessionParams.line_items = [{
          price_data: priceData,
          quantity: 1,
        }];
      }

      // Configuration spécifique selon le mode
      if (plan.mode === 'subscription') {
        sessionParams.subscription_data = {
          description: `${plan.name} - TeamMove`,
          metadata: {
            organizationId: organizationId,
            planId: planId,
          },
        };
      } else {
        sessionParams.payment_intent_data = {
          description: `${plan.name} - TeamMove`,
          metadata: {
            organizationId: organizationId,
            planId: planId,
          },
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      return {
        sessionId: session.id,
        url: session.url,
        planId: planId,
      };
    } catch (error: any) {
      console.error('Erreur création session Stripe:', error);
      throw new Error(`Erreur Stripe: ${error.message}`);
    }
  }

  /**
   * Récupérer et vérifier une session de paiement
   */
  async verifyPaymentSession(sessionId: string): Promise<{
    success: boolean;
    organizationId: string | null;
    planId: string | null;
    customerEmail: string | null;
    paymentStatus: string;
  }> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription']
      });

      const success = session.payment_status === 'paid';
      const organizationId = session.metadata?.organizationId || null;
      const planId = session.metadata?.planId || null;
      const customerEmail = session.customer_details?.email || null;

      return {
        success,
        organizationId,
        planId,
        customerEmail,
        paymentStatus: session.payment_status
      };
    } catch (error: any) {
      console.error('Erreur vérification session:', error);
      throw new Error(`Erreur vérification paiement: ${error.message}`);
    }
  }

  /**
   * Gérer les webhooks Stripe (optionnel)
   */
  async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET non configuré - webhook ignoré');
      return;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      console.log(`📨 Webhook reçu: ${event.type} - ID: ${event.id}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log(`ℹ️ Événement non géré: ${event.type}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur webhook:', error);
      throw new Error(`Erreur webhook: ${error.message}`);
    }
  }

  // Handlers de webhooks
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('✅ Checkout complété:', session.id);
    
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;
    
    if (organizationId && planId) {
      // Ici vous pouvez appeler votre service de souscription
      // pour mettre à jour l'organisation avec le nouveau plan
      console.log(`Mise à jour organisation ${organizationId} vers le plan ${planId}`);
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('💳 Paiement facture réussi:', invoice.id);
    // Logique pour gérer les paiements de renouvellement
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('❌ Paiement facture échoué:', invoice.id);
    // Logique pour gérer les échecs de paiement
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    console.log('🗑️ Abonnement annulé:', subscription.id);
    // Logique pour rétrograder l'utilisateur
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error: any) {
      console.error('Erreur annulation abonnement:', error);
      throw error;
    }
  }

  /**
   * Créer un portail client pour la gestion de facturation
   */
  async createCustomerPortal(customerId: string, returnUrl: string): Promise<{ url: string }> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error: any) {
      console.error('Erreur création portail client:', error);
      throw error;
    }
  }

  /**
   * Vérifier la configuration Stripe
   */
  async verifyConfiguration(): Promise<{
    valid: boolean;
    mode: 'test' | 'live';
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Tester la connexion
      await this.stripe.accounts.retrieve();
      
      // Vérifier les Price IDs
      const requiredPriceIds = [
        'STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID',
        'STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID',
        'STRIPE_PRO_CLUB_PRICE_ID',
        'STRIPE_PRO_PME_PRICE_ID',
        'STRIPE_PRO_ENTREPRISE_PRICE_ID'
      ];

      requiredPriceIds.forEach(envVar => {
        if (!process.env[envVar]) {
          issues.push(`${envVar} non configuré`);
        }
      });

      const apiKey = process.env.STRIPE_SECRET_KEY || '';
      const mode = apiKey.includes('test') ? 'test' : 'live';

      return {
        valid: issues.length === 0,
        mode,
        issues
      };
    } catch (error: any) {
      return {
        valid: false,
        mode: 'test',
        issues: [`Erreur de connexion Stripe: ${error.message}`]
      };
    }
  }

  /**
   * Obtenir la clé publique appropriée
   */
  getPublishableKey(): string {
    const apiKey = process.env.STRIPE_SECRET_KEY || '';
    const isTest = apiKey.includes('test');
    
    if (isTest) {
      return process.env.STRIPE_PUBLISHABLE_TEST_KEY || 
             process.env.VITE_STRIPE_PUBLIC_KEY || 
             '';
    }
    
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Vérifier si on est en mode test
   */
  isTestMode(): boolean {
    const apiKey = process.env.STRIPE_SECRET_KEY || '';
    return apiKey.includes('test');
  }
}

// Instance singleton
let stripeService: StripeModernService | null = null;

export function getStripeService(): StripeModernService {
  if (!stripeService) {
    stripeService = new StripeModernService();
  }
  return stripeService;
}

// Exports
export { StripeModernService, type PlanConfig };
export default getStripeService;