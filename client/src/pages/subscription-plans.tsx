import React from 'react';
import { useLocation } from 'wouter';
import { ModernPricingPlans } from '@/components/stripe/ModernPricingPlans';
import { useAuth } from '@/hooks/useAuth';

export default function SubscriptionPlansPage() {
  const [location] = useLocation();
  const { organization } = useAuth();
  
  // Déterminer le mode basé sur l'URL ou l'état de l'utilisateur
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const mode = urlParams.get('mode') as 'registration' | 'upgrade' || 
    (organization ? 'upgrade' : 'registration');
  
  const currentPlan = organization?.subscriptionType || 'decouverte';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <ModernPricingPlans 
          mode={mode}
          currentPlan={currentPlan}
          className="max-w-7xl mx-auto"
        />
      </div>
    </div>
  );
}