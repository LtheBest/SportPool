import { useState, useEffect } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';

interface StripeConfig {
  publishableKey: string;
  isTestMode: boolean;
  currency: string;
  locale: string;
}

interface StripePlan {
  id: string;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  interval?: 'month' | 'year';
  type: 'payment' | 'subscription';
  features: string[];
  maxEvents: number | null;
  maxInvitations: number | null;
  recommended?: boolean;
  priceFormatted: string;
}

interface CreateCheckoutResponse {
  sessionId: string;
  url: string;
  plan: {
    id: string;
    name: string;
    price: string;
  };
}

export function useStripe() {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialiser Stripe
  useEffect(() => {
    async function initializeStripe() {
      try {
        // Récupérer la configuration Stripe
        const response = await apiRequest('GET', '/api/stripe/config');
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Erreur de configuration Stripe');
        }
        
        const stripeConfig = result.data as StripeConfig;
        setConfig(stripeConfig);
        
        // Charger Stripe.js
        const stripeInstance = await loadStripe(stripeConfig.publishableKey, {
          locale: 'fr'
        });
        
        if (!stripeInstance) {
          throw new Error('Impossible de charger Stripe');
        }
        
        setStripe(stripeInstance);
        setError(null);
        
      } catch (err: any) {
        console.error('❌ Erreur initialisation Stripe:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    initializeStripe();
  }, []);

  // Récupérer les plans disponibles
  const getPlans = async (): Promise<StripePlan[]> => {
    try {
      const response = await apiRequest('GET', '/api/stripe/plans');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur récupération des plans');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération plans:', error);
      throw error;
    }
  };

  // Créer une session de checkout
  const createCheckoutSession = async (
    planId: string,
    mode: 'registration' | 'upgrade' = 'registration'
  ): Promise<CreateCheckoutResponse> => {
    try {
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
        planId,
        mode
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur création session de paiement');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('❌ Erreur création checkout:', error);
      throw error;
    }
  };

  // Rediriger vers Stripe Checkout
  const redirectToCheckout = async (
    planId: string,
    mode: 'registration' | 'upgrade' = 'registration'
  ): Promise<void> => {
    if (!stripe) {
      throw new Error('Stripe non initialisé');
    }

    try {
      const session = await createCheckoutSession(planId, mode);
      
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.sessionId
      });
      
      if (error) {
        throw new Error(error.message || 'Erreur redirection checkout');
      }
    } catch (error: any) {
      console.error('❌ Erreur redirection checkout:', error);
      throw error;
    }
  };

  // Créer une session portail client
  const createPortalSession = async (): Promise<string> => {
    try {
      const response = await apiRequest('POST', '/api/stripe/create-portal-session');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur accès portail');
      }
      
      return result.data.url;
    } catch (error: any) {
      console.error('❌ Erreur portail client:', error);
      throw error;
    }
  };

  // Récupérer les détails d'une session
  const getSession = async (sessionId: string) => {
    try {
      const response = await apiRequest('GET', `/api/stripe/session/${sessionId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Session non trouvée');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération session:', error);
      throw error;
    }
  };

  return {
    stripe,
    config,
    loading,
    error,
    getPlans,
    createCheckoutSession,
    redirectToCheckout,
    createPortalSession,
    getSession,
    isTestMode: config?.isTestMode || false
  };
}