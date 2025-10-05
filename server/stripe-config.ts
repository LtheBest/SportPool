/**
 * Configuration Stripe moderne pour TeamMove
 * Gestion des abonnements avec Checkout Session
 */

// Types pour les plans d'abonnement
export interface StripePlan {
  id: string;
  name: string;
  description: string;
  price: number; // en centimes
  currency: string;
  interval: 'month' | 'year';
  stripePriceId?: string; // ID du prix Stripe (à créer)
  features: string[];
  maxEvents: number | null; // null = illimité
  maxInvitations: number | null; // null = illimité
  popular?: boolean;
}

// Configuration des plans d'abonnement
export const STRIPE_PLANS: Record<string, StripePlan> = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    description: 'Parfait pour tester la plateforme',
    price: 0,
    currency: 'eur',
    interval: 'month',
    features: [
      '1 événement par mois',
      '10 invitations par événement',
      'Support par email',
      'Fonctionnalités de base'
    ],
    maxEvents: 1,
    maxInvitations: 10,
  },
  
  evenementielle: {
    id: 'evenementielle',
    name: 'Événementielle',
    description: 'Idéal pour les organisateurs réguliers',
    price: 1999, // 19.99€
    currency: 'eur',
    interval: 'month',
    stripePriceId: process.env.STRIPE_EVENEMENTIELLE_PRICE_ID,
    features: [
      '10 événements par mois',
      '50 invitations par événement',
      'Analyses et statistiques',
      'Support prioritaire',
      'Personnalisation avancée'
    ],
    maxEvents: 10,
    maxInvitations: 50,
    popular: true,
  },
  
  pro_club: {
    id: 'pro_club',
    name: 'Clubs & Associations',
    description: 'Pour les clubs sportifs et associations',
    price: 4999, // 49.99€
    currency: 'eur',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_CLUB_PRICE_ID,
    features: [
      'Événements illimités',
      'Invitations illimitées',
      'Gestion multi-utilisateurs',
      'Branding personnalisé',
      'API dédiée',
      'Support téléphonique'
    ],
    maxEvents: null,
    maxInvitations: null,
  },
  
  pro_pme: {
    id: 'pro_pme',
    name: 'PME',
    description: 'Solution complète pour PME',
    price: 9999, // 99.99€
    currency: 'eur',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_PME_PRICE_ID,
    features: [
      'Tout du plan Club',
      'Intégrations avancées',
      'Reporting avancé',
      'Formation personnalisée',
      'SLA garantie',
      'Gestionnaire de compte dédié'
    ],
    maxEvents: null,
    maxInvitations: null,
  },
  
  pro_entreprise: {
    id: 'pro_entreprise',
    name: 'Grandes Entreprises',
    description: 'Solution enterprise sur mesure',
    price: 19999, // 199.99€
    currency: 'eur',
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_ENTREPRISE_PRICE_ID,
    features: [
      'Tout du plan PME',
      'Déploiement sur mesure',
      'Intégration SSO',
      'Conformité RGPD avancée',
      'Audit de sécurité',
      'Support 24/7'
    ],
    maxEvents: null,
    maxInvitations: null,
  },
};

// Configuration Stripe
export const STRIPE_CONFIG = {
  // URLs de redirection
  baseUrl: process.env.APP_URL || 'https://teammove.onrender.com',
  
  // Webhook configuration
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Test mode detection
  isTestMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false,
  
  // Currency
  defaultCurrency: 'eur',
  
  // URLs de redirection après paiement
  getSuccessUrl: (planId: string, sessionId?: string) => {
    const baseUrl = STRIPE_CONFIG.baseUrl;
    const params = new URLSearchParams({
      payment: 'success',
      plan: planId,
      ...(sessionId && { session_id: sessionId })
    });
    return `${baseUrl}/subscription/success?${params.toString()}`;
  },
  
  getCancelUrl: (planId: string) => {
    const baseUrl = STRIPE_CONFIG.baseUrl;
    const params = new URLSearchParams({
      payment: 'cancelled',
      plan: planId,
    });
    return `${baseUrl}/subscription/plans?${params.toString()}`;
  },
};

// Utilitaires
export function getPlanById(planId: string): StripePlan | null {
  return STRIPE_PLANS[planId] || null;
}

export function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

export function validatePlanUpgrade(currentPlan: string, newPlan: string): boolean {
  const planOrder = ['decouverte', 'evenementielle', 'pro_club', 'pro_pme', 'pro_entreprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const newIndex = planOrder.indexOf(newPlan);
  
  // Permet de passer à n'importe quel plan (upgrade ou downgrade)
  return currentIndex !== newIndex && newIndex >= 0;
}

// Configuration des métadonnées Stripe
export function createStripeMetadata(organizationId: string, planId: string, userId?: string) {
  return {
    organization_id: organizationId,
    plan_id: planId,
    user_id: userId || '',
    app_name: 'TeamMove',
    created_at: new Date().toISOString(),
  };
}