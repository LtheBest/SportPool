/**
 * Hook pour gérer les plans d'abonnement et les paiements
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

// Types
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number; // en centimes
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  maxEvents: number | null;
  maxInvitations: number | null;
  popular?: boolean;
}

export interface SubscriptionInfo {
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

interface UseSubscriptionPlansReturn {
  plans: Plan[];
  currentSubscription: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  createCheckoutSession: (planId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  refetch: () => Promise<void>;
}

// Plans statiques (pourraient venir d'une API)
const DEFAULT_PLANS: Plan[] = [
  {
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
  
  {
    id: 'evenementielle',
    name: 'Événementielle',
    description: 'Idéal pour les organisateurs réguliers',
    price: 1999, // 19.99€
    currency: 'eur',
    interval: 'month',
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
  
  {
    id: 'pro_club',
    name: 'Clubs & Associations',
    description: 'Pour les clubs sportifs et associations',
    price: 4999, // 49.99€
    currency: 'eur',
    interval: 'month',
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
  
  {
    id: 'pro_pme',
    name: 'PME',
    description: 'Solution complète pour PME',
    price: 9999, // 99.99€
    currency: 'eur',
    interval: 'month',
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
  
  {
    id: 'pro_entreprise',
    name: 'Grandes Entreprises',
    description: 'Solution enterprise sur mesure',
    price: 19999, // 199.99€
    currency: 'eur',
    interval: 'month',
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
];

export function useSubscriptionPlans(): UseSubscriptionPlansReturn {
  const { organization } = useAuth();
  
  const [plans] = useState<Plan[]>(DEFAULT_PLANS);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les informations d'abonnement actuelles
  const fetchSubscriptionInfo = async () => {
    if (!organization) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiRequest('GET', '/api/subscription/info');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des informations d\'abonnement');
      }

      const data = await response.json();
      setCurrentSubscription(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('Error fetching subscription info:', err);
    } finally {
      setLoading(false);
    }
  };

  // Créer une session de checkout Stripe
  const createCheckoutSession = async (planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        return { success: false, error: 'Plan non trouvé' };
      }

      // Si c'est le plan découverte (gratuit), pas besoin de Stripe
      if (plan.price === 0) {
        try {
          const response = await apiRequest('POST', '/api/subscription/change-plan', {
            planId: 'decouverte'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors du changement de plan');
          }

          toast.success('Plan changé vers Découverte');
          await fetchSubscriptionInfo(); // Refresh data
          
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          return { success: false, error: errorMessage };
        }
      }

      // Pour les plans payants, créer une session Stripe
      const response = await apiRequest('POST', '/api/subscription/create-checkout-session', {
        planId,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création de la session de paiement');
      }

      const { url, sessionId } = await response.json();
      
      if (!url) {
        throw new Error('URL de paiement non reçue');
      }

      return { success: true, url };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Error creating checkout session:', error);
      return { success: false, error: errorMessage };
    }
  };

  // Annuler l'abonnement
  const cancelSubscription = async () => {
    try {
      const response = await apiRequest('POST', '/api/subscription/cancel');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de l\'annulation');
      }

      toast.success('Abonnement annulé avec succès');
      await fetchSubscriptionInfo(); // Refresh data
      
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Error cancelling subscription:', error);
      return { success: false, error: errorMessage };
    }
  };

  // Charger les données au montage et quand l'organisation change
  useEffect(() => {
    fetchSubscriptionInfo();
  }, [organization]);

  return {
    plans,
    currentSubscription,
    loading,
    error,
    createCheckoutSession,
    cancelSubscription,
    refetch: fetchSubscriptionInfo,
  };
}