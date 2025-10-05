import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function PaymentSuccessPage() {
  const [location] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    processPaymentSuccess();
  }, []);

  const processPaymentSuccess = async () => {
    try {
      // Extract parameters from URL
      const urlParams = new URLSearchParams(location.split('?')[1]);
      const sessionId = urlParams.get('session_id');
      const organizationId = urlParams.get('org_id');

      if (!sessionId) {
        setPaymentStatus('error');
        setMessage('Session de paiement non trouvée');
        setIsProcessing(false);
        return;
      }

      // Process payment with backend
      const response = await apiRequest('POST', '/api/stripe/payment-success', {
        sessionId,
        organizationId,
      });

      const result = await response.json();

      if (result.success) {
        setPaymentStatus('success');
        setMessage(result.message || 'Abonnement activé avec succès !');
        setPlanName(result.planName || '');
      } else {
        setPaymentStatus('error');
        setMessage(result.message || 'Erreur lors du traitement du paiement');
      }

    } catch (error: any) {
      console.error('Payment processing error:', error);
      setPaymentStatus('error');
      setMessage('Erreur lors du traitement du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
              <h2 className="text-2xl font-semibold">Traitement du paiement...</h2>
              <p className="text-gray-600">
                Veuillez patienter pendant que nous confirmons votre paiement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-semibold text-green-700">Paiement confirmé !</h2>
              {planName && (
                <p className="text-lg font-medium text-gray-700">
                  Abonnement <span className="text-green-600">{planName}</span> activé
                </p>
              )}
              <p className="text-gray-600">{message}</p>
              
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Vous avez maintenant accès à toutes les fonctionnalités de votre plan !
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2 w-full">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => window.location.href = '/dashboard'}
                >
                  Accéder au tableau de bord
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/events'}
                >
                  Créer un événement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <h2 className="text-2xl font-semibold text-red-700">Erreur de paiement</h2>
            <p className="text-gray-600">{message}</p>
            
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Si vous pensez qu'il s'agit d'une erreur, contactez notre support.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2 w-full">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/subscription'}
              >
                Réessayer le paiement
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.href = '/dashboard'}
              >
                Retourner au tableau de bord
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}