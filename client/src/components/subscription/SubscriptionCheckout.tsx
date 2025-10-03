import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
  EmbeddedCheckout,
  EmbeddedCheckoutProvider
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { CheckCircle, CreditCard, Lock, Shield, Crown, Star, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

// Types pour les plans d'abonnement
interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'decouverte' | 'evenementielle' | 'pro_club' | 'pro_pme' | 'pro_entreprise';
  price: number;
  currency: string;
  billingInterval: 'monthly' | 'annual' | 'pack_single' | 'pack_10';
  maxEvents: number | null;
  maxInvitations: number | null;
  validityMonths: number | null;
  features: string[];
  description: string;
  stripePriceId?: string;
  popular?: boolean;
  recommended?: boolean;
}

interface StripeCheckoutProps {
  plans: SubscriptionPlan[];
  currentPlan?: string;
  onPlanSelect: (planId: string) => void;
  loading?: boolean;
}

// Clé publique Stripe (à configurer dans les variables d'environnement)
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || 
  'pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj'
);

// Composant principal de checkout Stripe
export function SubscriptionCheckout({ plans, currentPlan, onPlanSelect, loading }: StripeCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'selection' | 'payment'>('selection');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fonction pour formater le prix
  const formatPrice = (price: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price / 100);
  };

  // Fonction pour obtenir l'icône du plan
  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'decouverte':
        return <Star className="w-6 h-6 text-blue-500" />;
      case 'evenementielle':
        return <Sparkles className="w-6 h-6 text-orange-500" />;
      case 'pro_club':
      case 'pro_pme':
      case 'pro_entreprise':
        return <Crown className="w-6 h-6 text-purple-500" />;
      default:
        return <Star className="w-6 h-6 text-gray-500" />;
    }
  };

  // Fonction pour obtenir l'intervalle de facturation formaté
  const getBillingInterval = (interval: string) => {
    switch (interval) {
      case 'monthly':
        return '/mois';
      case 'annual':
        return '/an';
      case 'pack_single':
        return ' (pack unique)';
      case 'pack_10':
        return ' (pack 10)';
      default:
        return '';
    }
  };

  // Gestion de la sélection d'un plan
  const handlePlanSelection = async (planId: string) => {
    if (loading || isProcessing) return;
    
    setSelectedPlan(planId);
    const plan = plans.find(p => p.id === planId);
    
    if (!plan || plan.type === 'decouverte') {
      // Plan gratuit - traitement immédiat
      onPlanSelect(planId);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Utiliser l'API client avec authentification
      const successUrl = `${window.location.origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/dashboard/subscription?payment=cancelled`;
      
      const response = await api.subscription.createPayment(planId, successUrl, cancelUrl);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création de la session de paiement');
      }

      const data = await response.json();
      
      if (data.url) {
        // Rediriger vers l'URL de checkout Stripe moderne
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Utiliser le checkout intégré avec le sessionId
        setClientSecret(data.sessionId);
        setCheckoutMode('payment');
      } else {
        throw new Error("Aucune URL de redirection ou session ID fournie");
      }
      
    } catch (error: any) {
      console.error('Erreur lors de la création de la session:', error);
      toast.error(error.message || 'Erreur lors de la création de la session de paiement');
      setSelectedPlan(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rendu du composant de sélection des plans
  const renderPlanSelection = () => (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-900">
          Choisissez votre plan
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Sélectionnez l'offre qui correspond le mieux à vos besoins. 
          Paiement sécurisé par Stripe.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          <span>Paiement 100% sécurisé</span>
          <Lock className="w-4 h-4" />
          <span>Cryptage SSL</span>
        </div>
      </div>

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative transition-all duration-300 cursor-pointer",
              "hover:shadow-xl hover:scale-105",
              plan.popular && "ring-2 ring-blue-500 shadow-lg",
              plan.recommended && "ring-2 ring-green-500 shadow-lg",
              selectedPlan === plan.id && "ring-2 ring-purple-500 shadow-lg",
              currentPlan === plan.id && "bg-gradient-to-br from-blue-50 to-indigo-50"
            )}
            onClick={() => handlePlanSelection(plan.id)}
          >
            {/* Badge pour les plans populaires/recommandés */}
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                Populaire
              </Badge>
            )}
            {plan.recommended && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white">
                Recommandé
              </Badge>
            )}

            <CardHeader className="text-center space-y-4">
              {/* Icône du plan */}
              <div className="flex justify-center">
                {getPlanIcon(plan.type)}
              </div>

              {/* Nom et description */}
              <div>
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </div>

              {/* Prix */}
              <div className="space-y-2">
                <div className="text-3xl font-bold text-gray-900">
                  {plan.price === 0 ? (
                    'Gratuit'
                  ) : (
                    <>
                      {formatPrice(plan.price)}
                      <span className="text-lg text-gray-500">
                        {getBillingInterval(plan.billingInterval)}
                      </span>
                    </>
                  )}
                </div>
                {plan.validityMonths && (
                  <div className="text-sm text-gray-500">
                    Valable {plan.validityMonths} mois
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Limites d'usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Événements</span>
                  <span className="font-semibold">
                    {plan.maxEvents === null ? 'Illimités' : plan.maxEvents}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Invitations</span>
                  <span className="font-semibold">
                    {plan.maxInvitations === null ? 'Illimitées' : plan.maxInvitations}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Liste des fonctionnalités */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Fonctionnalités incluses :</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bouton de sélection */}
              <Button
                className={cn(
                  "w-full mt-6",
                  plan.type === 'decouverte' && "bg-gray-600 hover:bg-gray-700",
                  plan.type === 'evenementielle' && "bg-orange-600 hover:bg-orange-700",
                  ['pro_club', 'pro_pme', 'pro_entreprise'].includes(plan.type) && 
                    "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                )}
                disabled={loading || isProcessing || currentPlan === plan.id}
              >
                {isProcessing && selectedPlan === plan.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Traitement...
                  </>
                ) : currentPlan === plan.id ? (
                  'Plan actuel'
                ) : plan.type === 'decouverte' ? (
                  'Choisir ce plan'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Souscrire maintenant
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informations de sécurité */}
      <div className="text-center space-y-4 pt-8">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Paiement sécurisé par Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Données cryptées</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Conformité PCI DSS</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Tous les paiements sont traités de manière sécurisée. 
          Vos données de carte ne sont jamais stockées sur nos serveurs.
        </p>
      </div>
    </div>
  );

  // Composant de checkout intégré (si nécessaire)
  const renderEmbeddedCheckout = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Finalisation de votre commande
        </h2>
        <p className="text-gray-600">
          Saisissez vos informations de paiement de manière sécurisée
        </p>
      </div>
      
      {clientSecret && (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{
            clientSecret,
            onComplete: () => {
              toast.success('Paiement réussi ! Redirection en cours...');
              setTimeout(() => {
                window.location.href = '/dashboard?payment=success';
              }, 2000);
            }
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
      
      <div className="mt-6 text-center">
        <Button
          variant="outline"
          onClick={() => {
            setCheckoutMode('selection');
            setClientSecret('');
            setSelectedPlan(null);
          }}
        >
          Retour à la sélection
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="container mx-auto">
        {checkoutMode === 'selection' ? renderPlanSelection() : renderEmbeddedCheckout()}
      </div>
    </div>
  );
}

// Hook personnalisé pour récupérer les plans d'abonnement
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Utiliser l'API client 
        const response = await api.subscription.getPlans();
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des plans');
        }
        
        const data = await response.json();
        
        // Marquer certains plans comme populaires/recommandés
        const processedPlans = Object.values(data.plans as SubscriptionPlan[]).map((plan: SubscriptionPlan) => ({
          ...plan,
          popular: plan.type === 'pro_club',
          recommended: plan.type === 'evenementielle'
        }));
        
        setPlans(processedPlans);
      } catch (err: any) {
        setError(err.message);
        toast.error('Erreur lors du chargement des plans d\'abonnement');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}

export default SubscriptionCheckout;