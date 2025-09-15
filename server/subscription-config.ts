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
    description: 'Parfait pour découvrir TeamMove'
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
    description: 'Parfait pour les organisateurs réguliers'
  },

  // Formules Pro
  'pro_club': {
    id: 'pro_club',
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

  'pro_pme': {
    id: 'pro_pme',
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
    description: 'Idéal pour les petites et moyennes entreprises'
  },

  'pro_entreprise': {
    id: 'pro_entreprise',
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
    description: 'Solution entreprise complète et sur-mesure'
  }
};

// Configuration Stripe pour les nouveaux prix
export const STRIPE_PRICE_CONFIG = {
  'evenementielle-single': {
    price: 1500,
    mode: 'payment', // Paiement unique
    description: 'Pack Événement - 15€'
  },
  'evenementielle-pack10': {
    price: 15000,
    mode: 'payment', // Paiement unique
    description: 'Pack 10 Événements - 150€'
  },
  'pro_club': {
    price: 1999,
    mode: 'subscription',
    interval: 'month',
    description: 'Clubs & Associations - 19,99€/mois'
  },
  'pro_pme': {
    price: 4900,
    mode: 'subscription',
    interval: 'month',
    description: 'PME - 49€/mois'
  },
  'pro_entreprise': {
    price: 9900,
    mode: 'subscription',
    interval: 'month',
    description: 'Grandes Entreprises - 99€/mois'
  }
};

// Nouvelles limites d'abonnement (remplace les anciennes)
export const NEW_SUBSCRIPTION_LIMITS = {
  decouverte: {
    maxEvents: 1,
    maxInvitations: 20,
    name: 'Découverte',
    price: 0,
    features: SUBSCRIPTION_PLANS.decouverte.features
  },
  evenementielle: {
    maxEvents: null, // Géré par packageRemainingEvents
    maxInvitations: null,
    name: 'Événementielle',
    price: 1500, // Prix de base
    features: SUBSCRIPTION_PLANS['evenementielle-single'].features
  },
  pro_club: {
    maxEvents: null,
    maxInvitations: null,
    name: 'Clubs & Associations',
    price: 1999,
    features: SUBSCRIPTION_PLANS['pro_club'].features
  },
  pro_pme: {
    maxEvents: null,
    maxInvitations: null,
    name: 'PME',
    price: 4900,
    features: SUBSCRIPTION_PLANS['pro_pme'].features
  },
  pro_entreprise: {
    maxEvents: null,
    maxInvitations: null,
    name: 'Grandes Entreprises',
    price: 9900,
    features: SUBSCRIPTION_PLANS['pro_entreprise'].features
  }
};

// Validation des abonnements
export function validateSubscription(organization: any): {
  isValid: boolean;
  reason?: string;
  needsRenewal?: boolean;
} {
  if (!organization) {
    return { isValid: false, reason: 'Organisation non trouvée' };
  }

  // L'offre découverte est toujours valide
  if (organization.subscriptionType === 'decouverte') {
    return { isValid: true };
  }

  // Pour les offres événementielles avec pack
  if (organization.subscriptionType === 'evenementielle') {
    // Vérifier l'expiration du pack
    if (organization.packageExpiryDate && new Date(organization.packageExpiryDate) < new Date()) {
      return { 
        isValid: false, 
        reason: 'Pack événementiel expiré', 
        needsRenewal: true 
      };
    }

    // Vérifier s'il reste des événements
    if (organization.packageRemainingEvents !== null && organization.packageRemainingEvents <= 0) {
      return { 
        isValid: false, 
        reason: 'Plus d\'événements disponibles dans le pack', 
        needsRenewal: true 
      };
    }

    return { isValid: true };
  }

  // Pour les formules Pro (mensuel)
  if (['pro_club', 'pro_pme', 'pro_entreprise'].includes(organization.subscriptionType)) {
    // Vérifier si l'abonnement est actif
    if (organization.subscriptionStatus !== 'active') {
      return { 
        isValid: false, 
        reason: 'Abonnement inactif', 
        needsRenewal: true 
      };
    }

    // Vérifier l'expiration mensuelle
    if (organization.subscriptionEndDate && new Date(organization.subscriptionEndDate) < new Date()) {
      return { 
        isValid: false, 
        reason: 'Abonnement expiré', 
        needsRenewal: true 
      };
    }

    return { isValid: true };
  }

  return { isValid: false, reason: 'Type d\'abonnement non reconnu' };
}

// Calculer les jours restants avant expiration
export function getDaysUntilExpiry(organization: any): number | null {
  if (!organization) return null;

  let expiryDate: Date | null = null;

  if (organization.subscriptionType === 'evenementielle' && organization.packageExpiryDate) {
    expiryDate = new Date(organization.packageExpiryDate);
  } else if (['pro_club', 'pro_pme', 'pro_entreprise'].includes(organization.subscriptionType) && organization.subscriptionEndDate) {
    expiryDate = new Date(organization.subscriptionEndDate);
  }

  if (!expiryDate) return null;

  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}