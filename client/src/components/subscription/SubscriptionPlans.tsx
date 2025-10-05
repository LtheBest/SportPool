/**
 * Composant moderne pour afficher et gérer les plans d'abonnement
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Crown, 
  Zap, 
  Building2, 
  Briefcase, 
  Enterprise,
  Sparkles,
  ArrowRight
} from 'lucide-react';
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
  icon?: React.ComponentType<any>;
  gradient?: string;
}

interface SubscriptionPlansProps {
  plans: Plan[];
  currentPlan?: string;
  onPlanSelect: (planId: string) => void;
  loading?: boolean;
}

// Configuration des icônes et styles par plan
const planStyles: Record<string, { 
  icon: React.ComponentType<any>; 
  gradient: string; 
  borderColor: string;
}> = {
  decouverte: {
    icon: Sparkles,
    gradient: 'from-green-400 to-blue-500',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  evenementielle: {
    icon: Zap,
    gradient: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  pro_club: {
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  pro_pme: {
    icon: Briefcase,
    gradient: 'from-orange-500 to-red-500',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  pro_entreprise: {
    icon: Enterprise,
    gradient: 'from-slate-600 to-slate-800',
    borderColor: 'border-slate-200 dark:border-slate-800',
  },
};

function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
  if (priceInCents === 0) return 'Gratuit';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

function PlanCard({ 
  plan, 
  isCurrentPlan, 
  onSelect, 
  loading 
}: { 
  plan: Plan; 
  isCurrentPlan: boolean; 
  onSelect: (planId: string) => void;
  loading: boolean;
}) {
  const style = planStyles[plan.id] || planStyles.decouverte;
  const Icon = style.icon;
  
  const handleSelect = () => {
    if (loading || isCurrentPlan) return;
    onSelect(plan.id);
  };

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-300 hover:scale-105 card-shadow
        ${isCurrentPlan ? `ring-2 ring-primary ${style.borderColor}` : 'hover:border-primary/50'}
        ${plan.popular ? 'border-primary scale-105' : ''}
      `}
    >
      {/* Badge populaire */}
      {plan.popular && (
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-10">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1">
            <Crown className="h-3 w-3 mr-1" />
            Populaire
          </Badge>
        </div>
      )}

      {/* Badge plan actuel */}
      {isCurrentPlan && (
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="secondary" className="text-xs">
            Plan actuel
          </Badge>
        </div>
      )}

      <CardHeader className={`text-center ${plan.popular ? 'pt-6' : ''}`}>
        {/* Icône avec gradient */}
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full bg-gradient-to-r ${style.gradient}`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>

        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-sm min-h-[2rem] flex items-center justify-center">
          {plan.description}
        </CardDescription>

        {/* Prix */}
        <div className="py-4">
          <div className="text-4xl font-bold text-primary">
            {formatPrice(plan.price, plan.currency)}
          </div>
          {plan.price > 0 && (
            <div className="text-sm text-muted-foreground">
              par {plan.interval === 'month' ? 'mois' : 'an'}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Limites */}
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Événements</span>
            <span className="font-medium">
              {plan.maxEvents ? `${plan.maxEvents}/mois` : 'Illimité'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invitations</span>
            <span className="font-medium">
              {plan.maxInvitations ? `${plan.maxInvitations}/event` : 'Illimité'}
            </span>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Fonctionnalités incluses
          </h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bouton d'action */}
        <Button
          onClick={handleSelect}
          disabled={loading || isCurrentPlan}
          className={`
            w-full modern-button transition-all duration-300
            ${isCurrentPlan 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : `bg-gradient-to-r ${style.gradient} hover:opacity-90`
            }
          `}
          size="lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Chargement...
            </div>
          ) : isCurrentPlan ? (
            'Plan actuel'
          ) : plan.price === 0 ? (
            'Choisir ce plan'
          ) : (
            <div className="flex items-center gap-2">
              Choisir ce plan
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </Button>

        {/* Message pour le plan gratuit */}
        {plan.price === 0 && !isCurrentPlan && (
          <p className="text-xs text-center text-muted-foreground">
            Aucun paiement requis
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SubscriptionPlans({
  plans,
  currentPlan,
  onPlanSelect,
  loading = false,
}: SubscriptionPlansProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handlePlanSelect = async (planId: string) => {
    try {
      setSelectedPlanId(planId);
      await onPlanSelect(planId);
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast.error('Erreur lors de la sélection du plan');
    } finally {
      setSelectedPlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Grid des plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlan === plan.id}
            onSelect={handlePlanSelect}
            loading={loading || selectedPlanId === plan.id}
          />
        ))}
      </div>

      {/* Informations additionnelles */}
      <div className="text-center space-y-4 pt-8 border-t">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-2">
            Questions fréquentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <strong>Puis-je changer de plan ?</strong>
              <br />
              Oui, vous pouvez upgrader ou downgrader à tout moment.
            </div>
            <div>
              <strong>Puis-je annuler ?</strong>
              <br />
              Oui, vous pouvez annuler votre abonnement à tout moment.
            </div>
            <div>
              <strong>Support inclus ?</strong>
              <br />
              Tous les plans incluent un support par email.
            </div>
            <div>
              <strong>Facturation ?</strong>
              <br />
              Facturation mensuelle automatique, résiliable à tout moment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}