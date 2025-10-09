import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  Crown, 
  CreditCard,
  Sparkles,
  Users,
  Building,
  Briefcase,
  ArrowRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

// Types
interface SubscriptionPlan {
  id: string;
  name: string;
  type: string;
  price: number;
  currency: string;
  mode: 'payment' | 'subscription';
  interval?: string;
  features: string[];
  description: string;
}

interface SubscriptionInfo {
  subscriptionType: string;
  subscriptionStatus: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  packageRemainingEvents?: number | null;
  packageExpiryDate?: string;
  currentPlan: {
    id: string;
    name: string;
    type: string;
    features: string[];
  };
}

interface ModernSubscriptionPlansProps {
  onPlanSelect?: (planId: string) => void;
  showCurrentPlan?: boolean;
  embedded?: boolean;
}

export default function ModernSubscriptionPlans({ 
  onPlanSelect, 
  showCurrentPlan = true,
  embedded = false 
}: ModernSubscriptionPlansProps) {
  const { organization, isAuthenticated } = useAuth();
  
  // État local
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<{
    publishableKey: string;
    testMode: boolean;
  } | null>(null);

  // Charger les données
  useEffect(() => {
    Promise.all([
      loadPlans(),
      loadSubscriptionInfo(),
      loadStripeConfig()
    ]).finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Charger les plans disponibles
  const loadPlans = async () => {
    try {
      const response = await fetch('/api/stripe/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement plans:', error);
    }
  };

  // Charger les informations d'abonnement actuelles
  const loadSubscriptionInfo = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch('/api/stripe/subscription-info', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo(data.data);
      }
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
    }
  };

  // Charger la configuration Stripe
  const loadStripeConfig = async () => {
    try {
      const response = await fetch('/api/stripe/config');
      if (response.ok) {
        const data = await response.json();
        setStripeConfig(data.data);
      }
    } catch (error) {
      console.error('Erreur configuration Stripe:', error);
    }
  };

  // Gérer la sélection d'un plan
  const handlePlanSelection = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setProcessingPlan(planId);

    try {
      // Plan découverte (gratuit) - traitement direct
      if (planId === 'decouverte') {
        if (isAuthenticated) {
          // Downgrade vers découverte
          const response = await fetch('/api/stripe/upgrade-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ planId: 'decouverte' }),
          });

          if (response.ok) {
            toast.success('Votre abonnement a été changé vers le plan Découverte');
            await loadSubscriptionInfo(); // Recharger les données
            if (onPlanSelect) onPlanSelect(planId);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors du changement d\'abonnement');
          }
        } else {
          // Nouvel utilisateur - plan gratuit
          if (onPlanSelect) onPlanSelect(planId);
        }
        return;
      }

      // Plans payants - créer session de paiement
      const endpoint = isAuthenticated ? '/api/stripe/upgrade-subscription' : '/api/stripe/create-checkout';
      const body = isAuthenticated 
        ? { planId }
        : { 
            planId,
            organizationId: organization?.id,
            customerEmail: organization?.email 
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du paiement');
      }

      const data = await response.json();
      
      // Rediriger vers Stripe Checkout
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error('Aucune URL de redirection fournie');
      }

    } catch (error: any) {
      console.error('Erreur sélection plan:', error);
      toast.error(error.message || 'Erreur lors du traitement du paiement');
    } finally {
      setProcessingPlan(null);
    }
  };

  // Obtenir l'icône selon le type de plan
  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'decouverte':
        return <Sparkles className="w-6 h-6" />;
      case 'evenementielle':
        return <CreditCard className="w-6 h-6" />;
      case 'pro':
        return <Crown className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  // Obtenir le badge selon le type
  const getPlanBadge = (plan: SubscriptionPlan) => {
    if (plan.id === 'decouverte') {
      return <Badge variant="secondary">Gratuit</Badge>;
    }
    if (plan.type === 'evenementielle') {
      return <Badge variant="outline">Pack unique</Badge>;
    }
    if (plan.type === 'pro') {
      return <Badge variant="default">Abonnement</Badge>;
    }
    return null;
  };

  // Obtenir le texte du bouton
  const getButtonText = (plan: SubscriptionPlan) => {
    const isCurrentPlan = subscriptionInfo?.subscriptionType === plan.id;
    
    if (isCurrentPlan) {
      return 'Plan actuel';
    }
    
    if (plan.id === 'decouverte') {
      return subscriptionInfo ? 'Passer au plan gratuit' : 'Commencer gratuitement';
    }
    
    if (subscriptionInfo) {
      return plan.price === 0 ? 'Changer de plan' : 'Passer à ce plan';
    }
    
    return plan.price === 0 ? 'Commencer' : 'Choisir ce plan';
  };

  // Formater le prix
  const formatPrice = (price: number, currency: string, mode: string, interval?: string) => {
    if (price === 0) return 'Gratuit';
    
    const formattedPrice = (price / 100).toFixed(2);
    const symbol = currency === 'EUR' ? '€' : currency;
    
    if (mode === 'subscription' && interval) {
      return `${formattedPrice} ${symbol}/${interval === 'month' ? 'mois' : 'an'}`;
    }
    
    return `${formattedPrice} ${symbol}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Chargement des plans...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${embedded ? '' : 'container mx-auto px-4 py-8'}`}>
      {/* En-tête */}
      {!embedded && (
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Choisissez votre plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Sélectionnez l'offre qui correspond parfaitement à vos besoins d'organisation d'événements sportifs.
          </p>
        </div>
      )}

      {/* Abonnement actuel */}
      {showCurrentPlan && subscriptionInfo && (
        <Alert className="max-w-4xl mx-auto">
          <Crown className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Plan actuel : </span>
            {subscriptionInfo.currentPlan.name}
            {subscriptionInfo.packageRemainingEvents !== null && (
              <span className="ml-4 text-sm text-gray-600">
                Événements restants : {subscriptionInfo.packageRemainingEvents}
              </span>
            )}
            {subscriptionInfo.subscriptionEndDate && (
              <span className="ml-4 text-sm text-gray-600">
                Expire le : {new Date(subscriptionInfo.subscriptionEndDate).toLocaleDateString('fr-FR')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Stripe */}
      {stripeConfig?.testMode && (
        <Alert className="max-w-4xl mx-auto bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <span className="font-medium">Mode test activé</span> - Les paiements ne seront pas réels
          </AlertDescription>
        </Alert>
      )}

      {/* Grille des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = subscriptionInfo?.subscriptionType === plan.id;
          const isProcessing = processingPlan === plan.id;
          const isPopular = plan.id === 'pro-club'; // Mettre en avant ce plan

          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                isCurrentPlan ? 'ring-2 ring-green-500 bg-green-50' : ''
              } ${
                isPopular ? 'ring-2 ring-blue-500 scale-105' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg font-medium">
                  Populaire
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-1 -left-1 bg-green-500 text-white text-xs px-2 py-1 rounded-br-lg font-medium">
                  Actuel
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.type)}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {getPlanBadge(plan)}
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price, plan.currency, plan.mode, plan.interval)}
                </div>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-2">
                {/* Fonctionnalités */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Bouton d'action */}
                <Button
                  onClick={() => handlePlanSelection(plan.id)}
                  disabled={isCurrentPlan || isProcessing}
                  className={`w-full ${
                    isCurrentPlan 
                      ? 'bg-green-100 text-green-700 cursor-default hover:bg-green-100' 
                      : plan.id === 'decouverte'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : isPopular
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : ''
                  }`}
                  variant={
                    isCurrentPlan 
                      ? 'secondary' 
                      : plan.id === 'decouverte' 
                        ? 'outline' 
                        : 'default'
                  }
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      {getButtonText(plan)}
                      {!isCurrentPlan && plan.price > 0 && (
                        <ArrowRight className="w-4 h-4 ml-2" />
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Informations complémentaires */}
      <div className="max-w-4xl mx-auto space-y-4 text-center text-gray-600">
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            <span>Changement de plan à tout moment</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            <span>Support client inclus</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            <span>Données sécurisées</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Tous les prix sont en euros et incluent la TVA applicable. 
          Les abonnements sont renouvelés automatiquement et peuvent être annulés à tout moment.
        </p>
      </div>
    </div>
  );
}