// TeamMove - Gestionnaire d'abonnements moderne
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Check, X, AlertCircle, Crown, Star, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

// Types pour les plans
interface TeamMovePlan {
  id: string;
  name: string;
  description: string;
  price: number; // Prix en centimes
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  maxEvents?: number;
  maxParticipants?: number;
}

interface StripeConfig {
  publishableKey: string;
  mode: 'test' | 'production';
  account?: string;
  plans: TeamMovePlan[];
}

// Icônes pour les plans
const PlanIcons = {
  discovery: Star,
  premium: Crown,
  pro: Zap,
};

// Configuration Stripe
let stripePromise: Promise<any> | null = null;

function getStripe(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

// Composant principal
export function SubscriptionManager() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { toast } = useToast();

  // Récupérer la configuration Stripe
  const { data: stripeConfig, isLoading: configLoading, error: configError } = useQuery<StripeConfig>({
    queryKey: ['/api/stripe/config'],
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Récupérer les informations de l'organisation
  const { data: organization } = useQuery({
    queryKey: ['/api/me'],
  });

  // Mutation pour créer une session de checkout
  const createCheckoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
        planId
      });
      return response.json();
    },
    onSuccess: async (data) => {
      if (!stripeConfig?.publishableKey) {
        throw new Error('Configuration Stripe manquante');
      }

      const stripe = await getStripe(stripeConfig.publishableKey);
      
      if (!stripe) {
        throw new Error('Impossible de charger Stripe');
      }

      // Rediriger vers Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (error) {
        throw new Error(error.message || 'Erreur de redirection vers le paiement');
      }
    },
    onError: (error: any) => {
      console.error('Erreur checkout:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue lors de la création du paiement",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSelectedPlan(null);
      setIsUpgrading(false);
    }
  });

  // Mutation pour la mise à niveau
  const upgradeMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/stripe/upgrade-plan', {
        planId
      });
      return response.json();
    },
    onSuccess: async (data) => {
      if (!stripeConfig?.publishableKey) {
        throw new Error('Configuration Stripe manquante');
      }

      const stripe = await getStripe(stripeConfig.publishableKey);
      
      if (!stripe) {
        throw new Error('Impossible de charger Stripe');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (error) {
        throw new Error(error.message || 'Erreur de redirection vers le paiement');
      }
    },
    onError: (error: any) => {
      console.error('Erreur upgrade:', error);
      toast({
        title: "Erreur de mise à niveau",
        description: error.message || "Une erreur est survenue lors de la mise à niveau",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpgrading(false);
    }
  });

  // Fonction pour gérer l'achat d'un plan
  const handlePurchasePlan = async (planId: string) => {
    if (!organization) {
      toast({
        title: "Erreur d'authentification",
        description: "Vous devez être connecté pour acheter un abonnement",
        variant: "destructive",
      });
      return;
    }

    if (planId === 'discovery') {
      toast({
        title: "Offre gratuite",
        description: "L'offre Découverte est gratuite et déjà activée",
        variant: "default",
      });
      return;
    }

    setSelectedPlan(planId);

    // Vérifier s'il s'agit d'une mise à niveau
    const currentPlan = organization.planType || 'discovery';
    const isUpgrade = currentPlan !== 'discovery';

    if (isUpgrade) {
      setIsUpgrading(true);
      upgradeMutation.mutate(planId);
    } else {
      createCheckoutMutation.mutate(planId);
    }
  };

  // Formatage du prix
  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Gratuit';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  // Obtenir le badge de statut du plan
  const getPlanBadge = (planId: string) => {
    const currentPlan = organization?.planType || 'discovery';
    
    if (currentPlan === planId) {
      return <Badge variant="default" className="ml-2">Actuel</Badge>;
    }
    
    if (planId === 'discovery') {
      return <Badge variant="secondary" className="ml-2">Gratuit</Badge>;
    }
    
    return null;
  };

  // Gestion des erreurs de configuration
  if (configError) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            Configuration manquante
          </CardTitle>
          <CardDescription>
            Les paiements ne sont pas disponibles pour le moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {configError instanceof Error ? configError.message : 'Erreur de configuration Stripe'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Chargement
  if (configLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Aucun plan disponible
  if (!stripeConfig?.plans || stripeConfig.plans.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Aucun plan disponible</CardTitle>
          <CardDescription>
            Les plans d'abonnement ne sont pas encore configurés.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Plans d'abonnement TeamMove</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choisissez l'offre qui correspond le mieux aux besoins de votre organisation sportive.
        </p>
        {stripeConfig.mode === 'test' && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
            Mode test - Utilisez la carte 4242 4242 4242 4242
          </Badge>
        )}
      </div>

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {stripeConfig.plans.map((plan) => {
          const IconComponent = PlanIcons[plan.id as keyof typeof PlanIcons] || Star;
          const isCurrentPlan = organization?.planType === plan.id;
          const isLoading = selectedPlan === plan.id && (createCheckoutMutation.isPending || upgradeMutation.isPending);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isCurrentPlan ? 'ring-2 ring-primary' : ''
              } ${plan.id === 'premium' ? 'border-primary shadow-md' : ''}`}
            >
              {plan.id === 'premium' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Recommandé
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    plan.id === 'discovery' ? 'bg-blue-100 text-blue-600' :
                    plan.id === 'premium' ? 'bg-purple-100 text-purple-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    <IconComponent className="h-8 w-8" />
                  </div>
                </div>
                
                <CardTitle className="text-xl">
                  {plan.name}
                  {getPlanBadge(plan.id)}
                </CardTitle>
                
                <div className="text-3xl font-bold">
                  {formatPrice(plan.price, plan.currency)}
                  {plan.price > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval === 'month' ? 'mois' : 'an'}
                    </span>
                  )}
                </div>
                
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Fonctionnalités */}
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limites */}
                {plan.maxEvents !== undefined && (
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Événements:</span>
                      <span>{plan.maxEvents === -1 ? 'Illimités' : plan.maxEvents}</span>
                    </div>
                    {plan.maxParticipants !== undefined && (
                      <div className="flex justify-between">
                        <span>Participants:</span>
                        <span>{plan.maxParticipants === -1 ? 'Illimités' : plan.maxParticipants}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Bouton d'action */}
                <Button 
                  className="w-full mt-4" 
                  variant={isCurrentPlan ? "outline" : plan.id === 'premium' ? "default" : "secondary"}
                  onClick={() => handlePurchasePlan(plan.id)}
                  disabled={isCurrentPlan || isLoading || createCheckoutMutation.isPending || upgradeMutation.isPending}
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isCurrentPlan ? (
                    "Plan actuel"
                  ) : plan.id === 'discovery' ? (
                    "Offre gratuite"
                  ) : isUpgrading ? (
                    "Mise à niveau..."
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      {organization?.planType === 'discovery' ? 'Choisir ce plan' : 'Passer à ce plan'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Informations complémentaires */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground">
          🔒 Paiement sécurisé avec Stripe • Annulation à tout moment
        </p>
        <p className="text-xs text-muted-foreground">
          Toutes les données sont protégées selon RGPD. 
          {stripeConfig.mode === 'test' && ' Mode test activé - aucun paiement réel ne sera effectué.'}
        </p>
      </div>
    </div>
  );
}

export default SubscriptionManager;