import Stripe from 'stripe';

// Configuration Stripe sécurisée
export const stripeConfig = {
  // Configuration des clés API
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // API version pour la compatibilité
  apiVersion: '2024-09-30.acacia' as Stripe.LatestApiVersion,
  
  // URLs de configuration
  baseUrl: process.env.APP_URL || 'https://teammove.onrender.com',
  
  // Validation de la configuration
  isValid(): boolean {
    return !!(this.secretKey && this.publishableKey);
  },
  
  // Mode test/production
  isTestMode(): boolean {
    return this.secretKey.includes('_test_') || this.secretKey.startsWith('sk_test_');
  },
  
  // URLs de redirection
  getSuccessUrl(mode: 'registration' | 'upgrade' = 'registration'): string {
    return `${this.baseUrl}/payment/success?mode=${mode}`;
  },
  
  getCancelUrl(mode: 'registration' | 'upgrade' = 'registration'): string {
    return `${this.baseUrl}/payment/cancel?mode=${mode}`;
  }
};

// Configuration des plans d'abonnement avec Stripe Price IDs
export interface StripePlan {
  id: string;
  name: string;
  description: string;
  priceAmount: number; // en centimes
  currency: string;
  interval?: 'month' | 'year';
  type: 'payment' | 'subscription'; // payment pour one-time, subscription pour récurrent
  features: string[];
  maxEvents: number | null; // null = illimité
  maxInvitations: number | null;
  recommended?: boolean;
}

export const STRIPE_PLANS: Record<string, StripePlan> = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    description: 'Parfait pour découvrir TeamMove',
    priceAmount: 0,
    currency: 'eur',
    type: 'payment',
    features: [
      '1 événement maximum',
      'Jusqu\'à 20 invitations',
      'Gestion du covoiturage',
      'Support par email'
    ],
    maxEvents: 1,
    maxInvitations: 20
  },
  
  evenement_single: {
    id: 'evenement_single',
    name: 'Pack Événement',
    description: 'Idéal pour organiser un événement ponctuel',
    priceAmount: 1500, // 15€
    currency: 'eur',
    type: 'payment',
    features: [
      '1 événement complet',
      'Profil de personnalisation',
      'Gestion conducteurs/passagers',
      'Messagerie intégrée',
      'Suivi en temps réel',
      'Support prioritaire'
    ],
    maxEvents: 1,
    maxInvitations: null
  },
  
  evenement_pack10: {
    id: 'evenement_pack10',
    name: 'Pack 10 Événements',
    description: 'Parfait pour les organisateurs réguliers',
    priceAmount: 15000, // 150€
    currency: 'eur',
    type: 'payment',
    features: [
      '10 événements complets',
      'Profil de personnalisation',
      'Gestion conducteurs/passagers',
      'Messagerie intégrée',
      'Suivi en temps réel',
      'Support prioritaire',
      'Valable 12 mois'
    ],
    maxEvents: 10,
    maxInvitations: null,
    recommended: true
  },
  
  pro_club: {
    id: 'pro_club',
    name: 'Clubs & Associations',
    description: 'Conçu pour les clubs sportifs et associations',
    priceAmount: 1999, // 19,99€
    currency: 'eur',
    interval: 'month',
    type: 'subscription',
    features: [
      'Événements illimités',
      'Invitations illimitées',
      'Profil de personnalisation avancé',
      'Gestion multi-conducteurs',
      'Messagerie avancée',
      'Suivi en temps réel',
      'Statistiques détaillées',
      'Support prioritaire',
      'API d\'intégration',
      'Branding personnalisé'
    ],
    maxEvents: null,
    maxInvitations: null
  },
  
  pro_pme: {
    id: 'pro_pme',
    name: 'PME',
    description: 'Idéal pour les petites et moyennes entreprises',
    priceAmount: 4900, // 49€
    currency: 'eur',
    interval: 'month',
    type: 'subscription',
    features: [
      'Tout de Clubs & Associations',
      'Multi-utilisateurs (5 admins)',
      'Gestion des équipes',
      'Reporting avancé',
      'Intégrations tierces',
      'Support téléphonique',
      'Formation personnalisée',
      'SLA garanti'
    ],
    maxEvents: null,
    maxInvitations: null
  },
  
  pro_entreprise: {
    id: 'pro_entreprise',
    name: 'Grandes Entreprises',
    description: 'Solution entreprise complète et sur-mesure',
    priceAmount: 9900, // 99€
    currency: 'eur',
    interval: 'month',
    type: 'subscription',
    features: [
      'Tout de PME',
      'Multi-utilisateurs illimités',
      'Gestion multi-sites',
      'API complète',
      'SSO/SAML',
      'Hébergement dédié (option)',
      'Support 24/7',
      'Account Manager dédié',
      'Personnalisation complète',
      'Conformité RGPD avancée'
    ],
    maxEvents: null,
    maxInvitations: null
  }
};

// Helper pour obtenir un plan par ID
export function getStripePlan(planId: string): StripePlan | null {
  return STRIPE_PLANS[planId] || null;
}

// Helper pour formater le prix
export function formatPrice(amount: number, currency = 'eur'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2
  }).format(amount / 100);
}

// Validation des webhooks
export function validateWebhookConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!stripeConfig.webhookSecret) {
    issues.push('STRIPE_WEBHOOK_SECRET non configuré');
  }
  
  if (!stripeConfig.secretKey) {
    issues.push('STRIPE_SECRET_KEY non configurée');
  }
  
  if (!stripeConfig.publishableKey) {
    issues.push('VITE_STRIPE_PUBLIC_KEY non configurée');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}