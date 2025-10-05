import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Users, Building, Briefcase, CreditCard } from 'lucide-react';
import StripeCheckout from '@/components/stripe/StripeCheckout';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Types
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  features: string[];
  recommended?: boolean;
  icon: 'users' | 'building' | 'briefcase' | 'crown';
}

// Plans configuration (should match backend SUBSCRIPTION_PLANS)
const SUBSCRIPTION_PLANS: Record<string, Plan> = {
  decouverte: {
    id: 'decouverte',
    name: 'Découverte',
    description: 'Parfait pour commencer',
    price: 0,
    type: 'decouverte',
    icon: 'users',
    features: [
      '1 événement par mois',
      '20 invitations par mois',
      'Gestion de base du covoiturage',
      'Messagerie simple',
      'Support par email'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Pour les petites organisations',
    price: 19,
    type: 'starter',
    icon: 'building',
    recommended: true,
    features: [
      '10 événements par mois',
      '200 invitations par mois',
      'Gestion avancée du covoiturage',
      'Messagerie de groupe',
      'Rappels automatiques',
      'Support prioritaire'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Pour les organisations actives',
    price: 49,
    type: 'pro',
    icon: 'briefcase',
    features: [
      'Événements illimités',
      'Invitations illimitées',
      'IA pour optimisation trajets',
      'Analytics avancés',
      'API access',
      'Support téléphonique',
      'Formation personnalisée'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Solutions sur mesure',
    price: 99,
    type: 'enterprise',
    icon: 'crown',
    features: [
      'Tout du plan Pro',
      'Multi-organisations',
      'SSO (Single Sign-On)',
      'Intégrations personnalisées',
      'Déploiement on-premise',
      'Account manager dédié',
      'SLA garanti'
    ]
  }
};

interface StripeSubscriptionManagerProps {
  currentPlan?: string;
  isUpgrade?: boolean;
}

const iconMap = {
  users: Users,
  building: Building,
  briefcase: Briefcase,
  crown: Crown,
};

export default function StripeSubscriptionManager({ 
  currentPlan = 'decouverte', 
  isUpgrade = false 
}: StripeSubscriptionManagerProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { organization } = useAuth();

  const plans = Object.values(SUBSCRIPTION_PLANS);

  const handlePlanSelect = async (planId: string) => {
    // If selecting the free plan, handle directly
    if (planId === 'decouverte') {
      if (isUpgrade) {
        // This would downgrade to free plan - confirm with user
        if (confirm('Êtes-vous sûr de vouloir passer au plan gratuit ? Vous perdrez l\'accès aux fonctionnalités premium.')) {
          try {
            // Call API to downgrade (implementation would go here)
            toast.success('Votre abonnement a été changé vers le plan Découverte.');
          } catch (error) {
            toast.error('Erreur lors du changement de plan');
          }
        }
      }
      return;
    }

    // For paid plans, show Stripe checkout
    setSelectedPlan(planId);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (sessionId: string) => {
    toast.success('Redirection vers le paiement...');
    setShowCheckout(false);
  };

  const handleCheckoutError = (error: string) => {
    toast.error(`Erreur: ${error}`);
    setShowCheckout(false);
  };

  if (showCheckout && selectedPlan) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowCheckout(false)}
            className="mb-4"
          >
            ← Retour aux plans
          </Button>
          <h1 className="text-3xl font-bold mb-2">Finaliser l'abonnement</h1>
          <p className="text-gray-600">
            Plan sélectionné: <span className="font-semibold">{SUBSCRIPTION_PLANS[selectedPlan]?.name}</span>
          </p>
        </div>

        <div className="flex justify-center">
          <StripeCheckout
            planId={selectedPlan}
            organizationId={organization?.id}
            isUpgrade={isUpgrade}
            onSuccess={handleCheckoutSuccess}
            onError={handleCheckoutError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          {isUpgrade ? 'Choisissez votre nouveau plan' : 'Choisissez votre offre'}
        </h1>
        <p className="text-xl text-gray-600">
          Sélectionnez l'offre qui correspond le mieux à vos besoins
        </p>
        {currentPlan && (
          <Badge variant="secondary" className="mt-2">
            Plan actuel: {SUBSCRIPTION_PLANS[currentPlan]?.name || currentPlan}
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const IconComponent = iconMap[plan.icon];
          const isCurrentPlan = plan.id === currentPlan;
          const isPaidPlan = plan.price > 0;

          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                plan.recommended ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${isCurrentPlan ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">Recommandé</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  <IconComponent className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500">/mois</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pb-6">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrentPlan ? (
                  <Button disabled className="w-full">
                    Plan actuel
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.recommended ? 'default' : 'outline'}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {isPaidPlan ? (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {isUpgrade ? 'Changer de plan' : 'Choisir ce plan'}
                      </>
                    ) : (
                      'Choisir gratuit'
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {isUpgrade && (
        <Alert className="mt-8">
          <AlertDescription>
            <strong>Note:</strong> Les changements de plan prennent effet immédiatement. 
            Vous pourrez annuler ou modifier votre abonnement à tout moment depuis votre tableau de bord.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}