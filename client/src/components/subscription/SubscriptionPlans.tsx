import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Check, 
  Crown, 
  Zap, 
  Building2, 
  Sparkles,
  CreditCard,
  Loader2,
  Star
} from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    eventsPerMonth: number;
    participantsPerEvent: number;
    storageGB: number;
  };
}

interface CurrentSubscription {
  subscriptionType: string;
  subscriptionStatus: string;
  planName: string;
  price: number;
  features: string[];
  limits: any;
}

const PLAN_ICONS = {
  discovery: Sparkles,
  starter: Zap,
  professional: Crown,
  enterprise: Building2,
};

const PLAN_COLORS = {
  discovery: 'text-gray-600 bg-gray-100',
  starter: 'text-blue-600 bg-blue-100',
  professional: 'text-purple-600 bg-purple-100',
  enterprise: 'text-gold-600 bg-yellow-100',
};

interface SubscriptionPlansProps {
  onPlanSelect?: (planId: string) => void;
  currentPlanId?: string;
  mode?: 'selection' | 'upgrade' | 'comparison';
}

export default function SubscriptionPlans({ 
  onPlanSelect,
  currentPlanId = 'discovery',
  mode = 'selection'
}: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  // Récupérer les plans disponibles
  const { data: plans = [], isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/stripe/plans'],
  });

  // Récupérer l'abonnement actuel
  const { data: currentSubscription } = useQuery<CurrentSubscription>({
    queryKey: ['/api/stripe/subscription'],
  });

  // Mutation pour créer une session de checkout
  const checkoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
        planId
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de paiement",
        description: error?.message || "Impossible d'initialiser le paiement",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: string) => {
    if (planId === 'discovery') {
      toast({
        title: "Plan gratuit",
        description: "Le plan Découverte est gratuit et activé par défaut.",
      });
      return;
    }

    if (planId === currentPlanId) {
      toast({
        title: "Plan actuel",
        description: "Vous utilisez déjà ce plan d'abonnement.",
      });
      return;
    }

    setSelectedPlan(planId);
    
    if (onPlanSelect) {
      onPlanSelect(planId);
    } else {
      // Lancer directement le checkout
      checkoutMutation.mutate(planId);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${(price / 100).toFixed(2)} €/mois`;
  };

  const isCurrentPlan = (planId: string) => {
    return planId === currentPlanId || planId === currentSubscription?.subscriptionType;
  };

  const canUpgrade = (planId: string) => {
    const planOrder = ['discovery', 'starter', 'professional', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlanId);
    const targetIndex = planOrder.indexOf(planId);
    return targetIndex > currentIndex;
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    if (isCurrentPlan(plan.id)) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Plan Actuel</Badge>;
    }
    
    if (plan.id === 'professional') {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Plus Populaire</Badge>;
    }
    
    if (plan.id === 'enterprise') {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Recommandé</Badge>;
    }
    
    return null;
  };

  if (plansLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mode === 'upgrade' && (
        <Alert>
          <Star className="w-4 h-4" />
          <AlertDescription>
            Choisissez un nouveau plan pour bénéficier de fonctionnalités avancées.
            Votre facturation sera ajustée automatiquement.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const IconComponent = PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS] || Sparkles;
          const isSelected = selectedPlan === plan.id;
          const isCurrent = isCurrentPlan(plan.id);
          const canSelect = mode === 'comparison' || canUpgrade(plan.id) || plan.id === 'discovery';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 ${
                isSelected ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${isCurrent ? 'border-green-500 bg-green-50' : ''} ${
                plan.id === 'professional' ? 'ring-2 ring-purple-300' : ''
              }`}
            >
              {plan.id === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Plus Populaire
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${PLAN_COLORS[plan.id as keyof typeof PLAN_COLORS]}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  {getPlanBadge(plan)}
                </div>
                
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price)}
                  </div>
                  {plan.price > 0 && (
                    <div className="text-sm text-gray-500">
                      Facturation mensuelle
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      Événements: {plan.limits.eventsPerMonth === -1 ? 'Illimité' : `${plan.limits.eventsPerMonth}/mois`}
                    </div>
                    <div>
                      Participants: {plan.limits.participantsPerEvent === -1 ? 'Illimité' : plan.limits.participantsPerEvent}
                    </div>
                    <div>
                      Stockage: {plan.limits.storageGB === -1 ? 'Illimité' : `${plan.limits.storageGB} GB`}
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={!canSelect || checkoutMutation.isPending || isCurrent}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {checkoutMutation.isPending && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : isCurrent ? (
                    "Plan Actuel"
                  ) : plan.price === 0 ? (
                    "Gratuit"
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {mode === 'upgrade' ? 'Passer à ce plan' : 'Choisir ce plan'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mode === 'comparison' && (
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Tous les plans incluent un support par email et des mises à jour gratuites.</p>
          <p>Vous pouvez changer de plan ou annuler à tout moment.</p>
        </div>
      )}
    </div>
  );
}