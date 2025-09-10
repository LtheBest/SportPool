import Stripe from 'stripe';
import { db } from './db';
import { organizations, subscriptionPlans, notifications } from '../shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

// Configuration Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51S3zPW8XM0zNL8ZMOwNztkR4s6cANPeVOKZBg1Qe4zVxbE1y0y7zNx4vLUGCLPNF6iTIEYRKfssMlcJiR6SnY5V500phodazFt', {
  apiVersion: '2024-06-20',
});

export interface SubscriptionLimits {
  maxEvents: number | null;
  maxInvitations: number | null;
}

export interface CreateSubscriptionRequest {
  organizationId: string;
  planType: 'decouverte' | 'premium';
  billingInterval: 'monthly' | 'annual';
  paymentMethodId?: string;
}

export interface UpgradeSubscriptionRequest {
  organizationId: string;
  newPlanType: 'premium';
  billingInterval: 'monthly' | 'annual';
  paymentMethodId: string;
}

// Limites par plan
export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  decouverte: {
    maxEvents: 1,
    maxInvitations: 20,
  },
  premium: {
    maxEvents: null, // illimité
    maxInvitations: null, // illimité
  },
};

// Prix des plans (en centimes)
export const PLAN_PRICES = {
  premium_monthly: 2900, // 29€/mois
  premium_annual: 29000, // 290€/an (2 mois gratuits)
};

/**
 * Initialise les plans d'abonnement dans la base de données
 */
export async function initializeSubscriptionPlans() {
  try {
    // Plan Découverte (gratuit)
    await db.insert(subscriptionPlans).values({
      name: 'Découverte',
      type: 'decouverte',
      description: 'Plan gratuit avec limitations : 1 événement et 20 invitations maximum',
      price: 0,
      billingInterval: 'monthly',
      maxEvents: 1,
      maxInvitations: 20,
      features: ['1 événement', '20 invitations max', 'Support communautaire'],
    }).onConflictDoNothing();

    // Plan Premium Mensuel
    await db.insert(subscriptionPlans).values({
      name: 'Premium Mensuel',
      type: 'premium',
      description: 'Plan premium avec accès illimité - Facturation mensuelle',
      price: PLAN_PRICES.premium_monthly,
      billingInterval: 'monthly',
      maxEvents: null,
      maxInvitations: null,
      features: ['Événements illimités', 'Invitations illimitées', 'Support prioritaire', 'Analytics avancées', 'Thèmes personnalisés'],
      stripePriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    }).onConflictDoNothing();

    // Plan Premium Annuel
    await db.insert(subscriptionPlans).values({
      name: 'Premium Annuel',
      type: 'premium',
      description: 'Plan premium avec accès illimité - Facturation annuelle (2 mois gratuits)',
      price: PLAN_PRICES.premium_annual,
      billingInterval: 'annual',
      maxEvents: null,
      maxInvitations: null,
      features: ['Événements illimités', 'Invitations illimitées', 'Support prioritaire', 'Analytics avancées', 'Thèmes personnalisés', '2 mois gratuits'],
      stripePriceId: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    }).onConflictDoNothing();

    console.log('Plans d\'abonnement initialisés avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des plans:', error);
  }
}

/**
 * Vérifie si une organisation peut créer un événement
 */
export async function canCreateEvent(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization[0]) {
      return { allowed: false, reason: 'Organisation non trouvée' };
    }

    const org = organization[0];
    const limits = SUBSCRIPTION_LIMITS[org.subscriptionType];

    // Si c'est premium, pas de limite
    if (org.subscriptionType === 'premium') {
      return { allowed: true };
    }

    // Vérifier les limites pour le plan découverte
    if (limits.maxEvents && org.eventCreatedCount >= limits.maxEvents) {
      return { 
        allowed: false, 
        reason: `Limite d'événements atteinte (${limits.maxEvents} max). Passez au plan Premium pour créer des événements illimités.`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Erreur lors de la vérification des limites d\'événements:', error);
    return { allowed: false, reason: 'Erreur lors de la vérification' };
  }
}

/**
 * Vérifie si une organisation peut envoyer des invitations
 */
export async function canSendInvitations(organizationId: string, invitationCount: number): Promise<{ allowed: boolean; reason?: string; remainingInvitations?: number }> {
  try {
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization[0]) {
      return { allowed: false, reason: 'Organisation non trouvée' };
    }

    const org = organization[0];
    const limits = SUBSCRIPTION_LIMITS[org.subscriptionType];

    // Si c'est premium, pas de limite
    if (org.subscriptionType === 'premium') {
      return { allowed: true };
    }

    // Vérifier les limites pour le plan découverte
    if (limits.maxInvitations) {
      const currentCount = org.invitationsSentCount || 0;
      const newTotal = currentCount + invitationCount;
      
      if (newTotal > limits.maxInvitations) {
        return { 
          allowed: false, 
          reason: `Limite d'invitations atteinte. Vous pouvez envoyer ${limits.maxInvitations - currentCount} invitations supplémentaires. Passez au plan Premium pour des invitations illimitées.`,
          remainingInvitations: Math.max(0, limits.maxInvitations - currentCount)
        };
      }
    }

    return { allowed: true, remainingInvitations: limits.maxInvitations ? limits.maxInvitations - (org.invitationsSentCount || 0) : undefined };
  } catch (error) {
    console.error('Erreur lors de la vérification des limites d\'invitations:', error);
    return { allowed: false, reason: 'Erreur lors de la vérification' };
  }
}

/**
 * Incrémente le compteur d'événements créés
 */
export async function incrementEventCount(organizationId: string) {
  try {
    await db.update(organizations)
      .set({ 
        eventCreatedCount: sql`${organizations.eventCreatedCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId));
  } catch (error) {
    console.error('Erreur lors de l\'incrémentation du compteur d\'événements:', error);
  }
}

/**
 * Incrémente le compteur d'invitations envoyées
 */
export async function incrementInvitationCount(organizationId: string, count: number = 1) {
  try {
    await db.update(organizations)
      .set({ 
        invitationsSentCount: sql`${organizations.invitationsSentCount} + ${count}`,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId));
  } catch (error) {
    console.error('Erreur lors de l\'incrémentation du compteur d\'invitations:', error);
  }
}

/**
 * Crée un customer Stripe pour une organisation
 */
export async function createStripeCustomer(organizationId: string) {
  try {
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization[0]) {
      throw new Error('Organisation non trouvée');
    }

    const org = organization[0];

    const customer = await stripe.customers.create({
      email: org.email,
      name: org.name,
      description: `Organisation ${org.name} - ${org.type}`,
      metadata: {
        organizationId: org.id,
        organizationType: org.type,
      },
    });

    // Mettre à jour l'organisation avec l'ID customer Stripe
    await db.update(organizations)
      .set({ 
        stripeCustomerId: customer.id,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId));

    return customer;
  } catch (error) {
    console.error('Erreur lors de la création du customer Stripe:', error);
    throw error;
  }
}

/**
 * Crée une souscription Stripe
 */
export async function createStripeSubscription(request: CreateSubscriptionRequest) {
  try {
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, request.organizationId))
      .limit(1);

    if (!organization[0]) {
      throw new Error('Organisation non trouvée');
    }

    const org = organization[0];

    // Créer le customer s'il n'existe pas
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer(request.organizationId);
      customerId = customer.id;
    }

    // Pour le plan découverte, pas besoin de Stripe
    if (request.planType === 'decouverte') {
      await db.update(organizations)
        .set({
          subscriptionType: 'decouverte',
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          paymentMethod: request.billingInterval,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, request.organizationId));

      return { success: true, subscriptionId: null };
    }

    // Pour le plan premium, créer une souscription Stripe
    const priceId = request.billingInterval === 'monthly' 
      ? process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID 
      : process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID;

    if (!priceId) {
      throw new Error('Prix Stripe non configuré');
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Mettre à jour l'organisation
    await db.update(organizations)
      .set({
        subscriptionType: 'premium',
        subscriptionStatus: 'active',
        stripeSubscriptionId: subscription.id,
        subscriptionStartDate: new Date(),
        paymentMethod: request.billingInterval,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, request.organizationId));

    // Créer une notification
    await db.insert(notifications).values({
      organizationId: request.organizationId,
      type: 'success',
      title: 'Abonnement Premium activé',
      message: `Votre abonnement Premium ${request.billingInterval === 'monthly' ? 'mensuel' : 'annuel'} a été activé avec succès !`,
    });

    return { 
      success: true, 
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret 
    };
  } catch (error) {
    console.error('Erreur lors de la création de la souscription:', error);
    throw error;
  }
}

/**
 * Upgrade d'une souscription vers Premium
 */
export async function upgradeSubscription(request: UpgradeSubscriptionRequest) {
  try {
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, request.organizationId))
      .limit(1);

    if (!organization[0]) {
      throw new Error('Organisation non trouvée');
    }

    const org = organization[0];

    // Si déjà premium, pas besoin d'upgrade
    if (org.subscriptionType === 'premium') {
      throw new Error('Organisation déjà en Premium');
    }

    // Créer la souscription Premium
    const result = await createStripeSubscription({
      organizationId: request.organizationId,
      planType: 'premium',
      billingInterval: request.billingInterval,
      paymentMethodId: request.paymentMethodId,
    });

    return result;
  } catch (error) {
    console.error('Erreur lors de l\'upgrade:', error);
    throw error;
  }
}

/**
 * Annule une souscription Stripe
 */
export async function cancelSubscription(organizationId: string) {
  try {
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization[0]) {
      throw new Error('Organisation non trouvée');
    }

    const org = organization[0];

    if (org.stripeSubscriptionId) {
      // Annuler la souscription Stripe à la fin de la période
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Mettre à jour l'organisation
    await db.update(organizations)
      .set({
        subscriptionStatus: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId));

    // Créer une notification
    await db.insert(notifications).values({
      organizationId,
      type: 'warning',
      title: 'Abonnement annulé',
      message: 'Votre abonnement Premium a été annulé. Il restera actif jusqu\'à la fin de la période de facturation.',
    });

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de l\'annulation:', error);
    throw error;
  }
}

/**
 * Reset mensuel des compteurs pour les plans découverte
 */
export async function resetMonthlyLimits() {
  try {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Reset les compteurs pour les organisations découverte
    await db.update(organizations)
      .set({
        eventCreatedCount: 0,
        invitationsSentCount: 0,
        lastResetDate: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(organizations.subscriptionType, 'decouverte'),
          lt(organizations.lastResetDate, oneMonthAgo)
        )
      );

    console.log('Reset mensuel des limites effectué');
  } catch (error) {
    console.error('Erreur lors du reset mensuel:', error);
  }
}

export { stripe };