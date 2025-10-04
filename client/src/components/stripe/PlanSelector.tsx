import React, { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStripe } from '@/hooks/useStripe';

interface PlanSelectorProps {
  value: string;
  onChange: (planId: string) => void;
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

export function PlanSelector({ value, onChange, className = '' }: PlanSelectorProps) {
  const { getPlans, loading } = useStripe();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const plansData = await getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Erreur chargement plans:', error);
    }
  };

  if (loading || plans.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm text-muted-foreground mb-4">
        Choisissez l'offre qui correspond à vos besoins
      </div>
      
      <div className="space-y-3">
        {plans.map((plan) => {
          const IconComponent = planIcons[plan.id as keyof typeof planIcons] || Star;
          const isSelected = value === plan.id;
          
          return (
            <Card 
              key={plan.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:shadow-md hover:border-primary/50'
              }`}
              onClick={() => onChange(plan.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {plan.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      {plan.priceFormatted}
                    </div>
                    {plan.interval && (
                      <div className="text-xs text-muted-foreground">
                        /{plan.interval === 'month' ? 'mois' : 'an'}
                      </div>
                    )}
                  </div>
                </div>
                
                {plan.recommended && (
                  <Badge variant="secondary" className="w-fit">
                    Recommandé
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Limites */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                  {plan.maxEvents === null ? (
                    <span>• Événements illimités</span>
                  ) : (
                    <span>• {plan.maxEvents} événement{plan.maxEvents > 1 ? 's' : ''}</span>
                  )}
                  
                  {plan.maxInvitations === null ? (
                    <span>• Invitations illimitées</span>
                  ) : (
                    <span>• {plan.maxInvitations} invitations max</span>
                  )}
                </div>
                
                {/* Features principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {plan.features.slice(0, 4).map((feature: string, index: number) => (
                    <div key={index} className="flex items-start space-x-1">
                      <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <div className="text-xs text-muted-foreground col-span-full">
                      +{plan.features.length - 4} autres fonctionnalités
                    </div>
                  )}
                </div>
                
                {/* Indicateur de sélection */}
                {isSelected && (
                  <div className="mt-3 p-2 bg-primary/10 rounded-md">
                    <div className="flex items-center space-x-2 text-primary text-sm">
                      <Check className="h-4 w-4" />
                      <span className="font-medium">Plan sélectionné</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        Vous pourrez changer de plan à tout moment depuis votre tableau de bord
      </div>
    </div>
  );
}