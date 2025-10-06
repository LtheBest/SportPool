// Configuration des plans d'abonnement côté client
export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'decouverte' | 'evenementielle' | 'pro_club' | 'pro_pme' | 'pro_entreprise';
  price: number; // Prix en centimes
  currency: string;
  billingInterval: 'monthly' | 'annual' | 'pack_single' | 'pack_10';
  maxEvents: number | null; // null = illimité
  maxInvitations: number | null; // null = illimité
  validityMonths: number | null; // null = pas d'expiration
  features: string[];
  description: string;
  stripePriceId?: string;
  isPopular?: boolean;
  badge?: string;
}

export const SUBSCRIPTION_PLANS: { [key: string]: SubscriptionPlan } = {
  // Offre découverte (gratuite)
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    type: 'decouverte',
    price: 0,
    currency: 'EUR',
    billingInterval: 'monthly',
    maxEvents: 1,
    maxInvitations: 20,
    validityMonths: null,
    features: [
      '1 événement maximum',
      'Jusqu\'à 20 invitations',
      'Gestion du covoiturage',
      'Support par email'
    ],
    description: 'Parfait pour découvrir TeamMove',
    badge: 'Gratuit'
  },

  // Offres événementielles
  'evenementielle-single': {
    id: 'evenementielle-single',
    name: 'Pack Événement',
    type: 'evenementielle',
    price: 1500, // 15€
    currency: 'EUR',
    billingInterval: 'pack_single',
    maxEvents: 1,
    maxInvitations: null, // Illimité pour un événement
    validityMonths: 12,
    features: [
      '1 événement complet',
      'Profil de personnalisation',
      'Gestion conducteurs/passagers',
      'Messagerie intégrée',
      'Suivi en temps réel',
      'Support prioritaire'
    ],
    description: 'Idéal pour organiser un événement ponctuel'
  },

  'evenementielle-pack10': {
    id: 'evenementielle-pack10',
    name: 'Pack 10 Événements',
    type: 'evenementielle',
    price: 15000, // 150€
    currency: 'EUR',
    billingInterval: 'pack_10',
    maxEvents: 10,
    maxInvitations: null, // Illimité
    validityMonths: 12,
    features: [
      '10 événements complets',
      'Profil de personnalisation',
      'Gestion conducteurs/passagers',
      'Messagerie intégrée',
      'Suivi en temps réel',
      'Support prioritaire',
      'Valable 12 mois'
    ],
    description: 'Parfait pour les organisateurs réguliers',
    badge: 'Économique',
    isPopular: true
  },

  // Formules Pro
  'pro-club': {
    id: 'pro-club',
    name: 'Clubs & Associations',
    type: 'pro_club',
    price: 1999, // 19,99€
    currency: 'EUR',
    billingInterval: 'monthly',
    maxEvents: null, // Illimité
    maxInvitations: null, // Illimité
    validityMonths: 1, // Mensuel
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
    description: 'Conçu pour les clubs sportifs et associations'
  },

  'pro-pme': {
    id: 'pro-pme',
    name: 'PME',
    type: 'pro_pme',
    price: 4900, // 49€
    currency: 'EUR',
    billingInterval: 'monthly',
    maxEvents: null, // Illimité
    maxInvitations: null, // Illimité
    validityMonths: 1, // Mensuel
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
    description: 'Idéal pour les petites et moyennes entreprises',
    badge: 'Professionnel'
  },

  'pro-entreprise': {
    id: 'pro-entreprise',
    name: 'Grandes Entreprises',
    type: 'pro_entreprise',
    price: 9900, // 99€
    currency: 'EUR',
    billingInterval: 'monthly',
    maxEvents: null, // Illimité
    maxInvitations: null, // Illimité
    validityMonths: 1, // Mensuel
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
    description: 'Solution entreprise complète et sur-mesure',
    badge: 'Entreprise'
  }
};

// Helper functions
export function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
  if (priceInCents === 0) return 'Gratuit';
  
  const price = priceInCents / 100;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(price);
}

export function getPlansByType(type?: string): SubscriptionPlan[] {
  const allPlans = Object.values(SUBSCRIPTION_PLANS);
  
  if (!type) return allPlans;
  
  return allPlans.filter(plan => {
    if (type === 'free') return plan.price === 0;
    if (type === 'paid') return plan.price > 0;
    if (type === 'event') return plan.type === 'evenementielle';
    if (type === 'pro') return plan.type.startsWith('pro_');
    return plan.type === type;
  });
}

export function getBillingIntervalLabel(interval: string): string {
  const labels: { [key: string]: string } = {
    'monthly': 'par mois',
    'annual': 'par an',
    'pack_single': 'paiement unique',
    'pack_10': 'pack de 10'
  };
  
  return labels[interval] || interval;
}

export function getPlanFeatures(planId: string): string[] {
  return SUBSCRIPTION_PLANS[planId]?.features || [];
}

export function isProPlan(planId: string): boolean {
  return planId.startsWith('pro-');
}

export function isEventPlan(planId: string): boolean {
  return planId.startsWith('evenementielle-');
}

export function getPlanUpgradePath(currentPlan: string): string[] {
  const upgradePaths: { [key: string]: string[] } = {
    'decouverte': ['evenementielle-single', 'evenementielle-pack10', 'pro-club'],
    'evenementielle-single': ['evenementielle-pack10', 'pro-club'],
    'evenementielle-pack10': ['pro-club'],
    'pro-club': ['pro-pme'],
    'pro-pme': ['pro-entreprise']
  };
  
  return upgradePaths[currentPlan] || [];
}

export default SUBSCRIPTION_PLANS;