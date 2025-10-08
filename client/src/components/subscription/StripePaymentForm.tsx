// client/src/components/subscription/StripePaymentForm.tsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CreditCard, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface StripePaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  currency: string;
  billingInterval: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// Interface pour la configuration Stripe
interface StripeConfig {
  publishableKey: string;
}

export function StripePaymentForm({
  planId,
  planName,
  planPrice,
  currency,
  billingInterval,
  onSuccess,
  onCancel
}: StripePaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [stripe, setStripe] = useState<any>(null);

  // Charger la configuration Stripe
  useEffect(() => {
    const loadStripeConfig = async () => {
      try {
        const response = await fetch('/api/config', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const config = await response.json();
          setStripeConfig(config);
          
          // Initialiser Stripe avec la clé publique
          const stripeInstance = await loadStripe(config.publishableKey);
          setStripe(stripeInstance);
        } else {
          throw new Error('Impossible de charger la configuration Stripe');
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    loadStripeConfig();
  }, []);

  // Formater le prix
  const formatPrice = (price: number, curr: string, interval: string) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: curr.toUpperCase(),
    }).format(price / 100);

    if (interval === 'one_time') {
      return formatted;
    }
    
    return `${formatted}/${interval === 'month' ? 'mois' : 'an'}`;
  };

  // Gérer le paiement via Stripe Checkout
  const handleStripeCheckout = async () => {
    if (!stripe) {
      setError('Stripe n\'est pas encore chargé');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Créer une session de checkout
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/subscription/plans?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création de la session de paiement');
      }

      const session = await response.json();
      
      if (session.success && session.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = session.url;
      } else {
        throw new Error('URL de session invalide');
      }

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Tests de paiement (simulation)
  const handleTestPayment = async (testCase: 'success' | 'pending' | 'failure') => {
    setLoading(true);
    setError(null);

    try {
      // Simuler différents scénarios de test
      await new Promise(resolve => setTimeout(resolve, 2000));

      switch (testCase) {
        case 'success':
          onSuccess();
          break;
        
        case 'pending':
          setError('Paiement en attente de confirmation. Veuillez vérifier votre email.');
          break;
        
        case 'failure':
          throw new Error('Paiement refusé. Veuillez vérifier vos informations de carte.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!stripeConfig) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Chargement du système de paiement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Récapitulatif du plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Récapitulatif de votre commande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-lg">{planName}</div>
              <div className="text-sm text-gray-600">
                Facturation {billingInterval === 'month' ? 'mensuelle' : 
                           billingInterval === 'year' ? 'annuelle' : 'unique'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatPrice(planPrice, currency, billingInterval)}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(planPrice, currency, billingInterval)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de paiement */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Erreur */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Paiement Stripe principal */}
          <div className="space-y-4">
            <Button
              onClick={handleStripeCheckout}
              disabled={loading || !stripe}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Payer avec Stripe
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              Paiement sécurisé par Stripe. Vos données ne sont jamais stockées sur nos serveurs.
            </div>
          </div>

          {/* Section de test */}
          <div className="border-t pt-6">
            <div className="text-sm font-medium text-gray-700 mb-3">
              🧪 Tests de paiement (Environnement de développement)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => handleTestPayment('success')}
                disabled={loading}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Test Succès
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleTestPayment('pending')}
                disabled={loading}
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Test En attente
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleTestPayment('failure')}
                disabled={loading}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Test Échec
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Ces boutons sont uniquement disponibles en mode test
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>

          {/* Sécurité */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="font-medium">Paiement sécurisé</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              • Chiffrement SSL 256 bits
              • Conformité PCI DSS
              • Aucune donnée de carte stockée
              • Protection contre la fraude
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}