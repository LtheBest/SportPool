import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building, Star, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStripe } from '@/hooks/useStripe';
import { toast } from 'sonner';

interface ModernPricingPlansProps {
  mode: 'registration' | 'upgrade';
  currentPlan?: string;
  onPlanSelected?: (planId: string) => void;
  className?: string;
}

const planIcons = {
  decouverte: Star,
  evenement_single: Zap,
  evenement_pack10: Zap,
  pro_club: Crown,
  pro_pme: Building,
  pro_entreprise: Building
};

const planColors = {
  decouverte: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700',
  evenement_single: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20',
  evenement_pack10: 'bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20',
  pro_club: 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20',
  pro_pme: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20',
  pro_entreprise: 'bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20'
};

export function ModernPricingPlans({ 
  mode, 
  currentPlan, 
  onPlanSelected, 
  className = '' 
}: ModernPricingPlansProps) {
  const { getPlans, redirectToCheckout, loading: stripeLoading, isTestMode } = useStripe();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const plansData = await getPlans();
      setPlans(plansData);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des plans: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'decouverte') {
      // Plan gratuit - pas de paiement nécessaire
      onPlanSelected?.(planId);
      return;
    }

    if (planId === currentPlan) {
      toast.info('Vous avez déjà ce plan');
      return;
    }

    setProcessingPlan(planId);
    
    try {
      await redirectToCheckout(planId, mode);
    } catch (error: any) {
      toast.error('Erreur de paiement: ' + error.message);
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading || stripeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement des plans...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">
          {mode === 'registration' ? 'Choisissez votre plan' : 'Changer de plan'}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Des solutions adaptées à tous les besoins, du découverte à l'entreprise.
        </p>
        {isTestMode && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Mode Test - Aucun paiement réel ne sera effectué
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-3 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const IconComponent = planIcons[plan.id as keyof typeof planIcons] || Star;
          const isCurrentPlan = currentPlan === plan.id;
          const isProcessing = processingPlan === plan.id;
          const colorClass = planColors[plan.id as keyof typeof planColors] || planColors.decouverte;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
                plan.recommended ? 'ring-2 ring-primary scale-105' : ''
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {/* Recommended Badge */}
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Recommandé
                </div>
              )}
              
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-br-lg">
                  Plan actuel
                </div>
              )}

              <CardHeader className={`pb-8 ${colorClass}`}>
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {plan.description}
                    </CardDescription>
                  </div>
                </div>
                
                <div className="pt-4">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-bold tracking-tight">
                      {plan.priceFormatted.split(',')[0]}
                    </span>
                    {plan.priceFormatted.includes(',') && (
                      <span className="text-lg text-muted-foreground">
                        ,{plan.priceFormatted.split(',')[1]}
                      </span>
                    )}
                    {plan.interval && (
                      <span className="text-lg text-muted-foreground">
                        /{plan.interval === 'month' ? 'mois' : 'an'}
                      </span>
                    )}
                  </div>
                  {plan.type === 'payment' && plan.id !== 'decouverte' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Paiement unique - Valable 12 mois
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Limites */}
                <div className="space-y-2 text-sm">
                  {plan.maxEvents !== null && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.maxEvents === 1 ? '1 événement' : `${plan.maxEvents} événements`}
                      </span>
                    </div>
                  )}
                  {plan.maxEvents === null && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Événements illimités</span>
                    </div>
                  )}
                  
                  {plan.maxInvitations !== null && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Jusqu'à {plan.maxInvitations} invitations</span>
                    </div>
                  )}
                  {plan.maxInvitations === null && (
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Invitations illimitées</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {plan.features.slice(0, 6).map((feature: string, index: number) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 6 && (
                    <div className="text-xs text-muted-foreground">
                      et {plan.features.length - 6} autres fonctionnalités...
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.recommended ? 'default' : 'outline'}
                  size="lg"
                  disabled={isCurrentPlan || isProcessing}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirection...
                    </>
                  ) : isCurrentPlan ? (
                    'Plan actuel'
                  ) : plan.id === 'decouverte' ? (
                    mode === 'registration' ? 'Commencer gratuitement' : 'Rétrograder'
                  ) : (
                    <>
                      {mode === 'registration' ? 'Choisir ce plan' : 'Passer à ce plan'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center space-y-4 pt-8 border-t">
        <p className="text-sm text-muted-foreground">
          Tous les plans incluent un support client et la garantie de remboursement de 14 jours.
        </p>
        {isTestMode && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              <strong>Mode Test Stripe activé</strong><br />
              Utilisez les numéros de carte de test : 4242 4242 4242 4242 (Visa) ou 5555 5555 5555 4444 (Mastercard)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}