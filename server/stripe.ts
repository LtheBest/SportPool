// server/stripe.ts
import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS, STRIPE_PRICE_CONFIG } from './subscription-config.js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

// Initialiser Stripe avec la clé secrète
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Interface pour les données de session de paiement
export interface PaymentSessionData {
  planId: string;
  organizationId: string;
  organizationEmail: string;
  mode: 'payment' | 'subscription';
}

// Créer une session de checkout Stripe
export async function createCheckoutSession(data: PaymentSessionData): Promise<Stripe.Checkout.Session> {
  const plan = SUBSCRIPTION_PLANS[data.planId];
  if (!plan) {
    throw new Error(`Plan not found: ${data.planId}`);
  }

  const stripeConfig = STRIPE_PRICE_CONFIG[data.planId];
  if (!stripeConfig) {
    throw new Error(`Stripe configuration not found for plan: ${data.planId}`);
  }

  // URLs de retour
  const baseUrl = process.env.APP_URL || 'http://localhost:8080';
  const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan_id=${data.planId}`;
  const cancelUrl = `${baseUrl}/payment/cancelled?plan_id=${data.planId}`;

  // Configuration de base de la session
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer_email: data.organizationEmail,
    mode: stripeConfig.mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      plan_id: data.planId,
      organization_id: data.organizationId,
    },
    billing_address_collection: 'required',
    locale: 'fr',
  };

  if (stripeConfig.mode === 'payment') {
    // Paiement unique pour les packs événementiels
    sessionConfig.line_items = [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: plan.name,
            description: stripeConfig.description,
          },
          unit_amount: plan.price,
        },
        quantity: 1,
      },
    ];
    sessionConfig.payment_intent_data = {
      metadata: {
        plan_id: data.planId,
        organization_id: data.organizationId,
      },
    };
  } else {
    // Abonnement récurrent pour les formules Pro
    sessionConfig.line_items = [
      {
        price_data: {
          currency: plan.currency.toLowerCase(),
          product_data: {
            name: plan.name,
            description: stripeConfig.description,
          },
          unit_amount: plan.price,
          recurring: {
            interval: stripeConfig.interval as 'month' | 'year',
          },
        },
        quantity: 1,
      },
    ];
    sessionConfig.subscription_data = {
      metadata: {
        plan_id: data.planId,
        organization_id: data.organizationId,
      },
    };
  }

  return await stripe.checkout.sessions.create(sessionConfig);
}

// Récupérer une session de checkout
export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.retrieve(sessionId);
}

// Gérer les événements webhook
export async function handleWebhookEvent(event: Stripe.Event) {
  console.log('🔔 Stripe Webhook Event:', event.type);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }
}

// Gérer la finalisation d'une session de checkout
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout session completed:', session.id);
  
  const planId = session.metadata?.plan_id;
  const organizationId = session.metadata?.organization_id;

  if (!planId || !organizationId) {
    console.error('❌ Missing metadata in session:', session.metadata);
    return;
  }

  // Importer dynamiquement le service de base de données pour éviter les imports circulaires
  const { updateOrganizationSubscription } = await import('./subscription-service.js');
  
  if (session.mode === 'payment') {
    // Paiement unique - activer le pack événementiel
    await updateOrganizationSubscription(organizationId, {
      subscriptionType: 'evenementielle',
      subscriptionStatus: 'active',
      stripeCustomerId: session.customer as string,
      stripeSessionId: session.id,
      packageRemainingEvents: planId === 'evenementielle-single' ? 1 : 10,
      packageExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 12 mois
    });
  } else if (session.mode === 'subscription') {
    // Abonnement récurrent - activer la formule Pro
    const subscriptionType = planId.replace('-', '_') as 'pro_club' | 'pro_pme' | 'pro_entreprise';
    
    await updateOrganizationSubscription(organizationId, {
      subscriptionType,
      subscriptionStatus: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      stripeSessionId: session.id,
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    });
  }

  // Envoyer un email de confirmation
  const { sendSubscriptionConfirmationEmail } = await import('./email-enhanced.js');
  await sendSubscriptionConfirmationEmail(organizationId, planId);
}

// Gérer le succès d'un paiement de facture (pour les abonnements récurrents)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Invoice payment succeeded:', invoice.id);
  
  if (!invoice.subscription) return;

  // Mettre à jour la date de fin d'abonnement
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const organizationId = subscription.metadata?.organization_id;

  if (organizationId) {
    const { extendOrganizationSubscription } = await import('./subscription-service.js');
    await extendOrganizationSubscription(organizationId, 30); // Étendre de 30 jours
  }
}

// Gérer l'échec d'un paiement de facture
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Invoice payment failed:', invoice.id);
  
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const organizationId = subscription.metadata?.organization_id;

  if (organizationId) {
    // Envoyer un email d'alerte pour le paiement échoué
    const { sendPaymentFailedEmail } = await import('./email-enhanced.js');
    await sendPaymentFailedEmail(organizationId);
  }
}

// Gérer la création d'un abonnement
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription created:', subscription.id);
  // L'abonnement est déjà géré par handleCheckoutSessionCompleted
}

// Gérer la mise à jour d'un abonnement
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id);
  
  const organizationId = subscription.metadata?.organization_id;
  if (!organizationId) return;

  const { updateOrganizationSubscription } = await import('./subscription-service.js');
  
  // Mettre à jour le statut de l'abonnement
  let status: 'active' | 'cancelled' | 'past_due' = 'active';
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    status = 'cancelled';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  }

  await updateOrganizationSubscription(organizationId, {
    subscriptionStatus: status,
    stripeSubscriptionId: subscription.id,
  });
}

// Gérer la suppression d'un abonnement
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id);
  
  const organizationId = subscription.metadata?.organization_id;
  if (!organizationId) return;

  const { updateOrganizationSubscription } = await import('./subscription-service.js');
  
  // Revenir à l'offre découverte
  await updateOrganizationSubscription(organizationId, {
    subscriptionType: 'decouverte',
    subscriptionStatus: 'cancelled',
    stripeSubscriptionId: null,
  });

  // Envoyer un email de confirmation de l'annulation
  const { sendSubscriptionCancelledEmail } = await import('./email-enhanced.js');
  await sendSubscriptionCancelledEmail(organizationId);
}

// Annuler un abonnement
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Récupérer les informations d'un abonnement
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

// Créer un client Stripe
export async function createCustomer(email: string, name: string): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
  });
}

// Récupérer un client Stripe
export async function getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return await stripe.customers.retrieve(customerId);
}