import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  SubscriptionCheckout, 
  useSubscriptionPlans 
} from '../components/subscription/SubscriptionCheckout';
import { StripePaymentForm } from '../components/subscription/StripePaymentForm';
import { SubscriptionPlan } from '../components/subscription/SubscriptionPlan';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Crown, 
  CreditCard,
  Sparkles,
  Users,
  Building,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

// Types
interface CurrentSubscription {
  subscriptionType: string;
  subscriptionStatus: string;
  paymentMethod?: string;
  remainingEvents: number | null;
  remainingInvitations: number | null;
}

interface SubscriptionPlansPageProps {
  mode?: 'selection' | 'upgrade' | 'payment';
  preselectedPlan?: string;
}

export default function SubscriptionPlansPage({ 
  mode = 'selection', 
  preselectedPlan 
}: SubscriptionPlansPageProps) {
  const [location, setLocation] = useLocation();
  const { organization: user } = useAuth();
  
  // État local
  const [currentMode, setCurrentMode] = useState<'selection' | 'upgrade' | 'payment'>(mode);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(preselectedPlan || null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'error' | null>(null);

  // Hooks personnalisés
  const { plans, loading: plansLoading, error: plansError } = useSubscriptionPlans();

  // Récupérer les informations d'abonnement actuelles
  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      try {
        const response = await api.subscription.getInfo();
        
        if (response.ok) {
          const data = await response.json();
          setCurrentSubscription({
            subscriptionType: data.subscriptionType,
            subscriptionStatus: data.subscriptionStatus,
            paymentMethod: data.paymentMethod,
            remainingEvents: data.remainingEvents,
            remainingInvitations: data.remainingInvitations,
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'abonnement actuel:', error);
      }
    };

    if (user) {
      fetchCurrentSubscription();
    }
  }, [user]);

  // Gérer les paramètres d'URL pour le statut de paiement
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');

    if (paymentParam === 'success' && sessionId) {
      setPaymentStatus('success');
      toast.success('Paiement réussi ! Votre abonnement a été activé.');
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Rediriger vers le dashboard après un délai
      setTimeout(() => {
        setLocation('/dashboard');
      }, 3000);
    } else if (paymentParam === 'cancelled') {
      setPaymentStatus('error');
      toast.error('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.');
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [setLocation]);

  // Gestionnaires d'événements
  const handlePlanSelection = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setSelectedPlan(planId);

    // Si c'est le plan découverte (gratuit), traitement immédiat
    if (plan.type === 'decouverte') {
      try {
        setLoading(true);
        
        // Appel API pour changer vers le plan découverte
        const response = await api.subscription.cancel();

        if (response.ok) {
          toast.success('Votre abonnement a été changé vers le plan Découverte.');
          setLocation('/dashboard');
        } else {
          throw new Error('Erreur lors du changement d\'abonnement');
        }
      } catch (error: any) {
        console.error('Erreur:', error);
        toast.error(error.message || 'Erreur lors du changement d\'abonnement');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Pour les plans payants, créer une Checkout Session et rediriger vers Stripe
    try {
      setLoading(true);
      
      // Utiliser l'API service pour gérer automatiquement l'authentification JWT
      const response = await api.subscription.createPayment(
        planId,
        `${window.location.origin}/subscription/plans?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        `${window.location.origin}/subscription/plans?payment=cancelled`
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Erreur de communication avec le serveur' };
        }
        
        // Si la création de la session Checkout échoue, basculer vers le formulaire de paiement embarqué
        console.warn('Checkout session creation failed, falling back to embedded payment form');
        toast.info(
          errorData.message 
            ? `Impossible de créer la session de paiement : ${errorData.message}. Utilisation du formulaire de paiement alternatif.`
            : 'Utilisation du formulaire de paiement alternatif.'
        );
        setCurrentMode('payment');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Si pas d'URL, basculer vers le formulaire de paiement embarqué
        console.warn('No checkout URL returned, falling back to embedded payment form');
        toast.info('Le système de paiement principal est indisponible. Utilisation du formulaire de paiement alternatif.');
        setCurrentMode('payment');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Erreur lors de la création de la session de paiement:', error);
      
      // En cas d'erreur réseau ou autre, basculer vers le formulaire de paiement embarqué
      toast.info(
        error.message 
          ? `Erreur de connexion : ${error.message}. Utilisation du formulaire de paiement alternatif.`
          : 'Utilisation du formulaire de paiement alternatif.'
      );
      setCurrentMode('payment');
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentStatus('success');
    toast.success('Paiement réussi ! Activation de votre abonnement en cours...');
    
    // Redirection vers le dashboard
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setCurrentMode('selection');
    setSelectedPlan(null);
  };

  // Fonction pour obtenir les informations du plan sélectionné
  const getSelectedPlanInfo = () => {
    if (!selectedPlan) return null;
    return plans.find(p => p.id === selectedPlan);
  };

  // Rendu des différents modes
  const renderContent = () => {
    // Statut de paiement
    if (paymentStatus === 'success') {
      return (
        <div className="text-center py-12 space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement réussi !
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              Votre abonnement a été activé avec succès.
            </p>
            <p className="text-sm text-gray-500">
              Redirection vers votre tableau de bord...
            </p>
          </div>
          <Button
            onClick={() => setLocation('/dashboard')}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            Accéder au tableau de bord
          </Button>
        </div>
      );
    }

    if (paymentStatus === 'error') {
      return (
        <div className="text-center py-12 space-y-6">
          <div className="flex justify-center">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Paiement annulé
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              Aucun paiement n'a été effectué.
            </p>
            <p className="text-sm text-gray-500">
              Vous pouvez sélectionner un autre plan ou réessayer plus tard.
            </p>
          </div>
          <Button
            onClick={() => {
              setPaymentStatus(null);
              setCurrentMode('selection');
            }}
            variant="outline"
          >
            Choisir un plan
          </Button>
        </div>
      );
    }

    // Mode paiement
    if (currentMode === 'payment' && selectedPlan) {
      const plan = getSelectedPlanInfo();
      if (!plan) {
        setCurrentMode('selection');
        return null;
      }

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePaymentCancel}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Finalisation de votre abonnement
              </h1>
              <p className="text-gray-600">
                Plan sélectionné : {plan.name}
              </p>
            </div>
          </div>

          <StripePaymentForm
            planId={plan.id}
            planName={plan.name}
            planPrice={plan.price}
            currency={plan.currency}
            billingInterval={plan.billingInterval}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />
        </div>
      );
    }

    // Mode sélection (par défaut)
    return (
      <div className="space-y-8">
        {/* En-tête */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Nos plans d'abonnement
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choisissez l'offre qui correspond à vos besoins. 
            Changez de plan à tout moment selon l'évolution de votre organisation.
          </p>
        </div>

        {/* Abonnement actuel */}
        {currentSubscription && (
          <Alert className="max-w-4xl mx-auto">
            <Crown className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Abonnement actuel : </span>
              {currentSubscription.subscriptionType === 'decouverte' ? 'Découverte (Gratuit)' :
               currentSubscription.subscriptionType === 'evenementielle' ? 'Événementielle' :
               currentSubscription.subscriptionType === 'pro_club' ? 'Clubs & Associations' :
               currentSubscription.subscriptionType === 'pro_pme' ? 'PME' :
               currentSubscription.subscriptionType === 'pro_entreprise' ? 'Grandes Entreprises' :
               'Inconnu'}
              
              {currentSubscription.remainingEvents !== null && (
                <span className="ml-4 text-sm text-gray-600">
                  Événements restants : {currentSubscription.remainingEvents}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Composant de checkout */}
        {!plansLoading && !plansError && (
          <SubscriptionCheckout
            plans={plans}
            currentPlan={currentSubscription?.subscriptionType}
            onPlanSelect={handlePlanSelection}
            loading={loading}
          />
        )}

        {/* États de chargement et d'erreur */}
        {plansLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Chargement des plans...</span>
            </div>
          </div>
        )}

        {plansError && (
          <Alert className="max-w-2xl mx-auto">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des plans d'abonnement. 
              Veuillez rafraîchir la page ou contacter le support.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {renderContent()}
      </div>
    </div>
  );
}

// Hook pour gérer les plans d'abonnement depuis l'URL
export function useSubscriptionPlansRoute() {
  const [match, params] = useRoute('/subscription/plans/:mode?');
  const mode = params?.mode as 'selection' | 'upgrade' | 'payment' | undefined;
  
  return {
    isActive: !!match,
    mode: mode || 'selection',
  };
}