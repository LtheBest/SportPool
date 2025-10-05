import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface StripeCheckoutProps {
  planId: string;
  organizationId?: string;
  isUpgrade?: boolean;
  onSuccess?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

interface StripeConfig {
  publishableKey: string;
  testMode: boolean;
}

interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  planId: string;
}

export default function StripeCheckout({ 
  planId, 
  organizationId, 
  isUpgrade = false, 
  onSuccess, 
  onError 
}: StripeCheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);

  // Load Stripe configuration on component mount
  useEffect(() => {
    loadStripeConfig();
  }, []);

  const loadStripeConfig = async () => {
    try {
      const response = await apiRequest('GET', '/api/stripe/config');
      const config = await response.json();
      setStripeConfig(config);
    } catch (error) {
      console.error('Failed to load Stripe config:', error);
      setError('Configuration de paiement non disponible');
    }
  };

  const handleCheckout = async () => {
    if (!stripeConfig) {
      setError('Configuration Stripe non chargée');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine which endpoint to use based on whether this is an upgrade
      const endpoint = isUpgrade 
        ? '/api/stripe/upgrade-subscription'
        : '/api/stripe/create-checkout-session';

      const requestData = isUpgrade
        ? { planId }
        : { organizationId, planId };

      const response = await apiRequest('POST', endpoint, requestData);
      const sessionData: CheckoutSession = await response.json();

      if (sessionData.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = sessionData.checkoutUrl;
      } else {
        throw new Error('URL de paiement non générée');
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      const errorMessage = error.message || 'Erreur lors du processus de paiement';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!stripeConfig) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Paiement sécurisé
        </CardTitle>
        <CardDescription>
          {isUpgrade 
            ? 'Mise à niveau de votre abonnement'
            : 'Finaliser votre inscription'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {stripeConfig.testMode && (
          <Alert>
            <AlertDescription>
              <strong>Mode Test:</strong> Utilisez la carte de test 4242 4242 4242 4242
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600">
          <ul className="space-y-1">
            <li>• Paiement 100% sécurisé via Stripe</li>
            <li>• Données chiffrées et protégées</li>
            <li>• Aucun engagement, résiliable à tout moment</li>
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleCheckout}
          disabled={isLoading || !!error}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Procéder au paiement
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Component for displaying payment success
export function PaymentSuccess({ sessionId }: { sessionId: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-semibold">Paiement confirmé !</h2>
          <p className="text-gray-600">
            Votre abonnement a été activé avec succès.
          </p>
          <Button asChild>
            <a href="/dashboard">
              Accéder à votre tableau de bord
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for displaying payment cancellation
export function PaymentCancelled() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <XCircle className="h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-semibold">Paiement annulé</h2>
          <p className="text-gray-600">
            Vous pouvez continuer avec l'offre Découverte ou reprendre le processus de paiement plus tard.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/dashboard">
                Continuer avec Découverte
              </a>
            </Button>
            <Button asChild>
              <a href="/subscription">
                Choisir une offre
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}