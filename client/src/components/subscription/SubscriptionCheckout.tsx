// client/src/components/subscription/SubscriptionCheckout.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  CheckCircle, 
  Crown, 
  Users,
  Building,
  Briefcase,
  Sparkles,
  ArrowRight,
  Loader2
} from 'lucide-react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
  features: string[];
  maxEvents?: number;
  maxInvitations?: number;
}

interface SubscriptionCheckoutProps {
  plans: SubscriptionPlan[];
  currentPlan?: string;
  onPlanSelect: (planId: string) => Promise<void>;
  loading?: boolean;
}

// Icônes pour chaque type de plan
const planIcons = {
  decouverte: Sparkles,
  evenementielle: Users,
  pro_club: Building,
  pro_pme: Briefcase,
  pro_entreprise: Crown,
};

// Couleurs pour chaque plan
const planColors = {
  decouverte: 'bg-gradient-to-br from-green-500 to-emerald-600',
  evenementielle: 'bg-gradient-to-br from-blue-500 to-cyan-600',
  pro_club: 'bg-gradient-to-br from-purple-500 to-indigo-600',
  pro_pme: 'bg-gradient-to-br from-orange-500 to-red-600',
  pro_entreprise: 'bg-gradient-to-br from-yellow-500 to-amber-600',
};

export function SubscriptionCheckout({ 
  plans, 
  currentPlan, 
  onPlanSelect, 
  loading = false 
}: SubscriptionCheckoutProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const formatPrice = (price: number, currency: string, interval: string) => {
    if (price === 0) return 'Gratuit';
    
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);

    if (interval === 'one_time') {
      return formatted;
    }
    
    return `${formatted}/${interval === 'month' ? 'mois' : 'an'}`;
  };

  const handlePlanSelection = async (planId: string) => {
    if (loading || processingPlan) return;
    
    setSelectedPlan(planId);
    setProcessingPlan(planId);
    
    try {
      await onPlanSelect(planId);
    } catch (error) {
      console.error('Plan selection error:', error);
    } finally {
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planId: string) => {
    const IconComponent = planIcons[planId as keyof typeof planIcons] || Sparkles;
    return IconComponent;
  };

  const getPlanColor = (planId: string) => {
    return planColors[planId as keyof typeof planColors] || 'bg-gradient-to-br from-gray-500 to-gray-600';
  };

  const isCurrentPlan = (planId: string) => {
    return currentPlan === planId;
  };

  const isPlanProcessing = (planId: string) => {
    return processingPlan === planId;
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {plans.map((plan) => {
          const IconComponent = getPlanIcon(plan.id);
          const isActive = isCurrentPlan(plan.id);
          const isProcessing = isPlanProcessing(plan.id);
          const isPopular = plan.id === 'pro_club'; // Plan populaire
          
          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                isActive 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:shadow-lg border-gray-200'
              } ${isPopular ? 'border-2 border-purple-300' : ''}`}
            >
              {/* Badge populaire */}
              {isPopular && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                  Populaire
                </div>
              )}

              {/* Badge plan actuel */}
              {isActive && (
                <div className="absolute top-0 left-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-br-lg">
                  Plan actuel
                </div>
              )}

              <CardHeader className="text-center space-y-4">
                {/* Icône du plan */}
                <div className={`w-16 h-16 rounded-full ${getPlanColor(plan.id)} flex items-center justify-center mx-auto`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-4">
                    {plan.description}
                  </p>
                </div>

                {/* Prix */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price, plan.currency, plan.interval)}
                  </div>
                  {plan.interval !== 'one_time' && plan.price > 0 && (
                    <div className="text-sm text-gray-500">
                      Facturation {plan.interval === 'month' ? 'mensuelle' : 'annuelle'}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Fonctionnalités */}
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limites */}
                {(plan.maxEvents || plan.maxInvitations) && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500 space-y-1">
                      {plan.maxEvents && (
                        <div>• {plan.maxEvents} événements max</div>
                      )}
                      {plan.maxInvitations && (
                        <div>• {plan.maxInvitations} invitations par événement</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bouton d'action */}
                <div className="pt-4">
                  {isActive ? (
                    <Button 
                      disabled 
                      className="w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Plan actuel
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePlanSelection(plan.id)}
                      disabled={loading || isProcessing}
                      className={`w-full ${
                        plan.id === 'decouverte' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : isPopular 
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        <>
                          {plan.price === 0 ? 'Choisir ce plan' : 'Souscrire'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Informations complémentaires */}
      <div className="mt-12 text-center space-y-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🔒 Paiement sécurisé
          </h3>
          <p className="text-gray-600 text-sm">
            Tous les paiements sont traités de manière sécurisée par Stripe. 
            Vos informations de paiement ne sont jamais stockées sur nos serveurs.
          </p>
        </div>
        
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <span>✓ Changement de plan à tout moment</span>
          <span>✓ Support client réactif</span>
          <span>✓ Facturation transparente</span>
        </div>
      </div>
    </div>
  );
}

// Hook personnalisé pour récupérer les plans
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/subscriptions/plans', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }
        
        const data = await response.json();
        if (data.success) {
          setPlans(data.plans);
        } else {
          throw new Error(data.message || 'Failed to fetch plans');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}