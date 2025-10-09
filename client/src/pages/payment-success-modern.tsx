import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Crown,
  CreditCard,
  Home,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface PaymentVerificationResult {
  success: boolean;
  message: string;
  data?: {
    planName: string;
    organizationId: string;
    paymentStatus: string;
  };
}

export default function PaymentSuccessModern() {
  const [location, setLocation] = useLocation();
  const { organization, isAuthenticated } = useAuth();
  
  // État local
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentResult, setPaymentResult] = useState<PaymentVerificationResult | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Récupérer les paramètres URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const organizationId = urlParams.get('org_id');

  useEffect(() => {
    // Nettoyer l'URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    if (!sessionId) {
      setVerificationStatus('error');
      setPaymentResult({
        success: false,
        message: 'Aucune session de paiement trouvée'
      });
      return;
    }

    verifyPayment();
  }, [sessionId, organizationId]);

  // Compte à rebours pour redirection automatique
  useEffect(() => {
    if (verificationStatus === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (verificationStatus === 'success' && countdown === 0) {
      handleRedirectToDashboard();
    }
  }, [verificationStatus, countdown]);

  // Vérifier le paiement auprès du serveur
  const verifyPayment = async () => {
    try {
      setVerificationStatus('loading');

      const response = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          organizationId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('success');
        setPaymentResult(data);
        toast.success('Paiement confirmé ! Votre abonnement a été activé.');
      } else {
        setVerificationStatus('error');
        setPaymentResult({
          success: false,
          message: data.error || 'Erreur lors de la vérification du paiement'
        });
        toast.error('Erreur lors de la vérification du paiement');
      }
    } catch (error: any) {
      console.error('Erreur vérification paiement:', error);
      setVerificationStatus('error');
      setPaymentResult({
        success: false,
        message: 'Erreur de connexion lors de la vérification'
      });
      toast.error('Erreur de connexion');
    }
  };

  // Rediriger vers le tableau de bord
  const handleRedirectToDashboard = () => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    } else {
      setLocation('/login?redirect=dashboard');
    }
  };

  // Rediriger vers les plans d'abonnement
  const handleBackToPlans = () => {
    setLocation('/subscription/plans');
  };

  // Rendu du contenu principal
  const renderContent = () => {
    if (verificationStatus === 'loading') {
      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-2xl text-gray-900">
              Vérification du paiement...
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              Nous vérifions votre paiement auprès de notre système de facturation.
              Veuillez patienter quelques instants.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                ℹ️ Cette vérification peut prendre jusqu'à 30 secondes.
                Ne fermez pas cette fenêtre.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (verificationStatus === 'error') {
      return (
        <Card className="max-w-2xl mx-auto border-red-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-red-700">
              Erreur de vérification
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                {paymentResult?.message || 'Une erreur est survenue lors de la vérification de votre paiement.'}
              </AlertDescription>
            </Alert>
            
            <p className="text-gray-600">
              Votre paiement a peut-être été traité, mais nous n'avons pas pu le vérifier immédiatement.
              Veuillez contacter notre support ou réessayer plus tard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                onClick={verifyPayment}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Réessayer la vérification
              </Button>
              <Button
                variant="outline"
                onClick={handleBackToPlans}
              >
                Retour aux plans
              </Button>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-gray-900 mb-2">Besoin d'aide ?</h4>
              <p className="text-gray-600 text-sm mb-3">
                Si le problème persiste, contactez notre équipe support avec les informations suivantes :
              </p>
              <div className="text-xs text-gray-500 font-mono bg-white p-2 rounded border">
                Session ID: {sessionId}<br/>
                {organizationId && `Organization ID: ${organizationId}`}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Succès
    return (
      <Card className="max-w-2xl mx-auto border-green-200 bg-green-50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-green-700">
            Paiement réussi !
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <Alert className="border-green-200 bg-green-100">
            <Crown className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <span className="font-semibold">
                Félicitations ! Votre abonnement "{paymentResult?.data?.planName}" a été activé avec succès.
              </span>
            </AlertDescription>
          </Alert>

          <div className="bg-white border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🎉 Que se passe-t-il maintenant ?
            </h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Abonnement activé</p>
                  <p className="text-gray-600 text-sm">Votre plan est maintenant actif et toutes les fonctionnalités sont disponibles.</p>
                </div>
              </div>
              <div className="flex items-start">
                <CreditCard className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Facture envoyée</p>
                  <p className="text-gray-600 text-sm">Vous recevrez votre facture par email dans les prochaines minutes.</p>
                </div>
              </div>
              <div className="flex items-start">
                <Settings className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Profil à jour</p>
                  <p className="text-gray-600 text-sm">Vos permissions et limites ont été mises à jour automatiquement.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{countdown}</span>
                </div>
              </div>
              <p className="text-blue-800 font-medium">
                Redirection automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-blue-700 text-sm">
              Vous allez être redirigé vers votre tableau de bord pour commencer à utiliser votre abonnement.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              onClick={handleRedirectToDashboard}
              className="bg-green-600 hover:bg-green-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Accéder au tableau de bord
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCountdown(0)} // Arrêter le countdown
            >
              Rester sur cette page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Confirmation de paiement
          </h1>
          <p className="text-xl text-gray-600">
            Vérification de votre transaction TeamMove
          </p>
        </div>

        {renderContent()}

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Besoin d'aide ? Contactez notre support à{' '}
            <a href="mailto:support@teammove.fr" className="text-blue-600 hover:underline">
              support@teammove.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}