/**
 * Composant pour gérer le processus de paiement Stripe
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Loader2,
  Lock,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';

// Types
interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

interface PaymentProcessProps {
  plan: Plan;
  onBack: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

interface PaymentStatus {
  status: 'idle' | 'loading' | 'redirecting' | 'success' | 'error';
  message?: string;
  sessionId?: string;
}

function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

export function PaymentProcess({ 
  plan, 
  onBack, 
  onSuccess, 
  onError 
}: PaymentProcessProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'idle' });

  // Vérifier le statut du paiement depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentParam = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');

    if (paymentParam === 'success' && sessionId) {
      setPaymentStatus({ 
        status: 'success', 
        message: 'Paiement réussi !',
        sessionId 
      });
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Appeler le callback de succès après un délai
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else if (paymentParam === 'cancelled') {
      setPaymentStatus({ 
        status: 'error', 
        message: 'Paiement annulé par l\'utilisateur.' 
      });
      
      // Nettoyer l'URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [onSuccess]);

  const handlePayment = async () => {
    try {
      setPaymentStatus({ status: 'loading', message: 'Création de la session de paiement...' });

      // Créer la session de checkout Stripe
      const response = await apiRequest('POST', '/api/subscription/create-checkout-session', {
        planId: plan.id,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création de la session de paiement');
      }

      const { sessionId, url } = await response.json();

      if (!url) {
        throw new Error('URL de paiement non reçue');
      }

      setPaymentStatus({ 
        status: 'redirecting', 
        message: 'Redirection vers Stripe...',
        sessionId 
      });

      // Rediriger vers Stripe Checkout
      window.location.href = url;

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur de paiement inconnue';
      
      setPaymentStatus({ 
        status: 'error', 
        message: errorMessage 
      });
      
      onError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Render selon le statut
  if (paymentStatus.status === 'success') {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">
                  Paiement réussi !
                </h2>
                <p className="text-green-600 dark:text-green-400 mt-2">
                  Votre abonnement au plan <strong>{plan.name}</strong> a été activé avec succès.
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground">
                  Session de paiement : {paymentStatus.sessionId}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus.status === 'error') {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-700 dark:text-red-300">
                  Erreur de paiement
                </h2>
                <p className="text-red-600 dark:text-red-400 mt-2">
                  {paymentStatus.message}
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={handlePayment}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Réessayer le paiement
                </Button>
                <Button
                  variant="outline"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour aux plans
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={paymentStatus.status === 'loading' || paymentStatus.status === 'redirecting'}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Finalisation de votre abonnement</h1>
          <p className="text-muted-foreground">
            Plan sélectionné : <strong>{plan.name}</strong>
          </p>
        </div>
      </div>

      {/* Résumé du plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Résumé de votre commande
          </CardTitle>
          <CardDescription>
            Vérifiez les détails de votre abonnement avant de procéder au paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">
                Abonnement {plan.interval === 'month' ? 'mensuel' : 'annuel'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatPrice(plan.price, plan.currency)}
              </div>
              <div className="text-sm text-muted-foreground">
                par {plan.interval === 'month' ? 'mois' : 'an'}
              </div>
            </div>
          </div>

          {/* Fonctionnalités incluses */}
          <div>
            <h4 className="font-medium mb-2">Fonctionnalités incluses :</h4>
            <ul className="space-y-1">
              {plan.features.slice(0, 4).map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {feature}
                </li>
              ))}
              {plan.features.length > 4 && (
                <li className="text-sm text-muted-foreground">
                  ... et {plan.features.length - 4} autres fonctionnalités
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Informations de sécurité */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="flex items-center gap-2">
          <Lock className="h-3 w-3" />
          Paiement sécurisé par Stripe. Vos informations de carte sont chiffrées et protégées.
        </AlertDescription>
      </Alert>

      {/* Statut du paiement */}
      {paymentStatus.status !== 'idle' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            {(paymentStatus.status === 'loading' || paymentStatus.status === 'redirecting') && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {paymentStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Bouton de paiement */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Button
              onClick={handlePayment}
              disabled={paymentStatus.status === 'loading' || paymentStatus.status === 'redirecting'}
              className="w-full modern-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {paymentStatus.status === 'loading' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Préparation...
                </div>
              ) : paymentStatus.status === 'redirecting' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirection vers Stripe...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Procéder au paiement - {formatPrice(plan.price, plan.currency)}
                </div>
              )}
            </Button>

            <div className="text-xs text-center text-muted-foreground space-y-1">
              <p>
                En cliquant sur "Procéder au paiement", vous acceptez nos conditions d'utilisation.
              </p>
              <p>
                Vous serez redirigé vers Stripe pour finaliser votre paiement en toute sécurité.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}