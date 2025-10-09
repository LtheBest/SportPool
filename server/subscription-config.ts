// Subscription Configuration for TeamMove
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    eventsPerMonth: number;
    participantsPerEvent: number;
    storageGB: number;
    advancedFeatures: boolean;
  };
  stripeProductId?: string;
  stripePriceId?: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  discovery: {
    id: 'discovery',
    name: 'Découverte',
    description: 'Plan gratuit pour découvrir TeamMove',
    price: 0,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Création d\'événements limitée',
      'Invitations par email',
      'Support communautaire',
      '2 Go de stockage'
    ],
    limits: {
      eventsPerMonth: 3,
      participantsPerEvent: 20,
      storageGB: 2,
      advancedFeatures: false
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Plan premium avec fonctionnalités avancées',
    price: 9.99,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Événements illimités',
      'Participants illimités',
      'Fonctionnalités avancées',
      'Support prioritaire',
      '50 Go de stockage',
      'Analytics détaillées',
      'Intégrations tierces'
    ],
    limits: {
      eventsPerMonth: -1, // Illimité
      participantsPerEvent: -1, // Illimité
      storageGB: 50,
      advancedFeatures: true
    },
    stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    description: 'Solution complète pour les organisateurs professionnels',
    price: 19.99,
    currency: 'EUR',
    interval: 'month',
    features: [
      'Tous les avantages Premium',
      'Multi-organisateurs',
      'API personnalisée',
      'Support 24/7',
      '200 Go de stockage',
      'Marque personnalisée',
      'Rapports avancés'
    ],
    limits: {
      eventsPerMonth: -1, // Illimité
      participantsPerEvent: -1, // Illimité
      storageGB: 200,
      advancedFeatures: true
    },
    stripeProductId: process.env.STRIPE_PRO_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID
  }
};

export const DEFAULT_PLAN = 'discovery';

// Stripe Price IDs pour les tests (à remplacer par les vrais IDs)
export const STRIPE_PRICE_IDS = {
  premium_monthly: 'price_premium_monthly_test',
  premium_yearly: 'price_premium_yearly_test',
  pro_monthly: 'price_pro_monthly_test',
  pro_yearly: 'price_pro_yearly_test'
};

// Configuration des limites par défaut
export const PLAN_LIMITS = {
  discovery: {
    maxEvents: 3,
    maxParticipants: 20,
    canDeleteEvents: false,
    canUseAdvancedFeatures: false
  },
  premium: {
    maxEvents: -1, // Illimité
    maxParticipants: -1, // Illimité
    canDeleteEvents: true,
    canUseAdvancedFeatures: true
  },
  pro: {
    maxEvents: -1, // Illimité
    maxParticipants: -1, // Illimité
    canDeleteEvents: true,
    canUseAdvancedFeatures: true
  }
};