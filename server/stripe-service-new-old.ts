// Nouvelle intégration Stripe complètement refaite
import Stripe from 'stripe';
import { db } from './db';
import { organizations } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { SUBSCRIPTION_PLANS, STRIPE_PRICE_IDS } from './subscription-config';
import { SubscriptionService } from './subscription-service';
import { emailServiceEnhanced } from './email-enhanced';

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export interface CheckoutSessionParams {
  organizationId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PaymentResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export class StripeServiceNew {
  /**
   * Créer une session de checkout pour un abonnement
   */
  static async createCheckoutSession(params: CheckoutSessionParams): Promise<PaymentResult> {
    try {
      const { organizationId, planId, successUrl, cancelUrl, customerEmail } = params;

      // Vérifier que le plan existe
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        return { success: false, error: 'Plan d\'abonnement invalide' };
      }

      // Le plan découverte est gratuit
      if (planId === 'discovery') {
        return { success: false, error: 'Le plan Découverte est gratuit et ne nécessite pas de paiement' };
      }

      // Récupérer les informations de l'organisation
      const organization = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
      if (!organization.length) {
        return { success: false, error: 'Organisation non trouvée' };
      }

      const currentOrg = organization[0];
      const email = customerEmail || currentOrg.email;

      // Créer la session Stripe
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency,
              product_data: {
                name: plan.name,
                description: plan.description,
                metadata: {
                  planId: planId,
                  features: plan.features.join(', ')
                }
              },
              unit_amount: Math.round(plan.price * 100), // Prix en centimes
              ...(plan.interval !== 'month' ? {} : {
                recurring: {
                  interval: plan.interval,
                }
              }),
            },
            quantity: 1,
          },
        ],
        mode: plan.interval === 'month' ? 'subscription' : 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        customer_email: email,
        metadata: {
          userId: userId.toString(),
          planId: planId,
          userEmail: email,
          userName: currentUser.username || 'Utilisateur'
        },
        // Configuration pour les abonnements
        ...(plan.interval === 'month' && {
          subscription_data: {
            metadata: {
              userId: userId.toString(),
              planId: planId,
            },
          },
        }),
        // Configuration de facture
        invoice_creation: {
          enabled: true,
        },
        // Messages personnalisés
        custom_text: {
          submit: {
            message: `Vous allez souscrire au plan ${plan.name} pour ${plan.price}€/${plan.interval === 'month' ? 'mois' : 'unique'}.`
          }
        }
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        return { success: false, error: 'Impossible de créer l\'URL de paiement' };
      }

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };

    } catch (error: any) {
      console.error('Erreur création session Stripe:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création de la session de paiement'
      };
    }
  }

  /**
   * Vérifier le statut d'une session de checkout
   */
  static async verifyCheckoutSession(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'subscription', 'line_items']
      });

      return {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        metadata: session.metadata,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentIntent: session.payment_intent,
        subscription: session.subscription,
        lineItems: session.line_items
      };
    } catch (error: any) {
      console.error('Erreur vérification session:', error);
      throw new Error(`Impossible de vérifier la session: ${error.message}`);
    }
  }

  /**
   * Traiter un paiement réussi
   */
  static async processSuccessfulPayment(sessionId: string) {
    try {
      const session = await this.verifyCheckoutSession(sessionId);
      
      if (session.paymentStatus !== 'paid') {
        throw new Error('Paiement non complété');
      }

      const userId = parseInt(session.metadata?.userId || '0');
      const planId = session.metadata?.planId;

      if (!userId || !planId) {
        throw new Error('Informations manquantes dans la session');
      }

      // Calculer la date d'expiration pour les abonnements
      let expiresAt: Date | undefined;
      if (planId === 'premium' || planId === 'pro') {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Mettre à jour l'abonnement de l'utilisateur
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id;

      const success = await SubscriptionService.updateSubscription(
        userId,
        planId,
        subscriptionId,
        expiresAt
      );

      if (!success) {
        throw new Error('Erreur lors de la mise à jour de l\'abonnement');
      }

      // Envoyer un email de confirmation
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length > 0) {
        const plan = SUBSCRIPTION_PLANS[planId];
        await emailServiceEnhanced.sendSubscriptionConfirmation(
          user[0].email,
          user[0].username || 'Utilisateur',
          plan.name,
          plan.price,
          expiresAt
        );
      }

      return {
        success: true,
        userId,
        planId,
        sessionId,
        subscriptionId
      };

    } catch (error: any) {
      console.error('Erreur traitement paiement:', error);
      throw error;
    }
  }

  /**
   * Annuler un abonnement Stripe
   */
  static async cancelSubscription(userId: number): Promise<boolean> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) {
        return false;
      }

      const stripeSubscriptionId = user[0].stripeSubscriptionId;
      
      // Annuler dans Stripe si il y a un ID d'abonnement
      if (stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(stripeSubscriptionId);
        } catch (error) {
          console.error('Erreur annulation Stripe:', error);
          // Continuer même si l'annulation Stripe échoue
        }
      }

      // Mettre à jour localement
      const success = await SubscriptionService.cancelSubscription(userId);
      
      if (success) {
        // Envoyer un email de confirmation d'annulation
        await emailServiceEnhanced.sendSubscriptionCancellation(
          user[0].email,
          user[0].username || 'Utilisateur'
        );
      }

      return success;
    } catch (error: any) {
      console.error('Erreur annulation abonnement:', error);
      return false;
    }
  }

  /**
   * Gérer les webhooks Stripe
   */
  static async handleWebhook(body: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET non configuré');
      return { success: false, error: 'Webhook secret non configuré' };
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: any) {
      console.error('Erreur vérification signature webhook:', error.message);
      return { success: false, error: 'Signature webhook invalide' };
    }

    console.log(`📨 Webhook reçu: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'payment_intent.succeeded':
          console.log('💰 Paiement réussi:', event.data.object.id);
          break;
        
        case 'payment_intent.payment_failed':
          console.log('❌ Paiement échoué:', event.data.object.id);
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        default:
          console.log(`ℹ️ Type d'événement non géré: ${event.type}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erreur traitement webhook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Traiter la completion d'une session checkout
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ Checkout complété:', session.id);
    
    try {
      await this.processSuccessfulPayment(session.id);
    } catch (error) {
      console.error('Erreur traitement paiement réussi:', error);
    }
  }

  /**
   * Traiter un échec de paiement
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log('❌ Paiement échoué:', paymentIntent.id);
    
    // Envoyer un email d'échec si possible
    if (paymentIntent.metadata?.userId && paymentIntent.metadata?.userEmail) {
      try {
        await emailServiceEnhanced.sendPaymentFailed(
          paymentIntent.metadata.userEmail,
          paymentIntent.metadata.userName || 'Utilisateur'
        );
      } catch (error) {
        console.error('Erreur envoi email échec paiement:', error);
      }
    }
  }

  /**
   * Traiter l'annulation d'un abonnement
   */
  private static async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    console.log('🗑️ Abonnement annulé:', subscription.id);
    
    try {
      // Trouver l'utilisateur par l'ID d'abonnement
      const user = await db.select()
        .from(users)
        .where(eq(users.stripeSubscriptionId, subscription.id))
        .limit(1);
      
      if (user.length > 0) {
        await SubscriptionService.cancelSubscription(user[0].id);
      }
    } catch (error) {
      console.error('Erreur traitement annulation abonnement:', error);
    }
  }

  /**
   * Traiter la mise à jour d'un abonnement
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    console.log('🔄 Abonnement mis à jour:', subscription.id);
    
    // Logique pour traiter les mises à jour d'abonnement
    // (changements de prix, renouvellements, etc.)
  }

  /**
   * Obtenir la clé publique Stripe
   */
  static getPublishableKey(): string {
    return process.env.VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_PUBLISHABLE_TEST_KEY || '';
  }

  /**
   * Vérifier la configuration Stripe
   */
  static async verifyConfiguration() {
    try {
      const account = await stripe.accounts.retrieve();
      return { 
        success: true, 
        mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
        accountId: account.id,
        country: account.country
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Créer ou récupérer un customer Stripe
   */
  static async createOrGetCustomer(email: string, name?: string): Promise<string> {
    try {
      // Chercher un customer existant
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id;
      }

      // Créer un nouveau customer
      const customer = await stripe.customers.create({
        email: email,
        name: name || 'Utilisateur TeamMove'
      });

      return customer.id;
    } catch (error: any) {
      console.error('Erreur création customer Stripe:', error);
      throw new Error(`Impossible de créer le customer: ${error.message}`);
    }
  }

  /**
   * Obtenir les plans d'abonnement disponibles
   */
  static getAvailablePlans() {
    return Object.values(SUBSCRIPTION_PLANS).filter(plan => plan.id !== 'discovery');
  }
}