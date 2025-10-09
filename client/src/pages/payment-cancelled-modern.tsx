import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  XCircle, 
  ArrowLeft, 
  CreditCard,
  RefreshCcw,
  HelpCircle,
  Home,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export default function PaymentCancelledModern() {
  const [location, setLocation] = useLocation();
  const { organization, isAuthenticated } = useAuth();
  
  // État local
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Récupérer les paramètres URL
  const urlParams = new URLSearchParams(window.location.search);
  const organizationId = urlParams.get('org_id');
  const planId = urlParams.get('plan_id');

  useEffect(() => {
    // Nettoyer l'URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);

    // Afficher une notification
    toast.error('Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.');
  }, []);

  // Compte à rebours pour redirection automatique
  useEffect(() => {
    if (autoRedirect && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoRedirect && countdown === 0) {
      handleBackToPlans();
    }
  }, [countdown, autoRedirect]);

  // Rediriger vers les plans d'abonnement
  const handleBackToPlans = () => {
    setLocation('/subscription/plans');
  };

  // Rediriger vers le tableau de bord
  const handleBackToDashboard = () => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    } else {
      setLocation('/');
    }
  };

  // Réessayer le même plan
  const handleRetryPayment = () => {
    if (planId) {
      // Rediriger vers la page des plans avec le plan présélectionné
      setLocation(`/subscription/plans?selected=${planId}`);
    } else {
      handleBackToPlans();
    }
  };

  // Arrêter la redirection automatique
  const handleStopAutoRedirect = () => {
    setAutoRedirect(false);
    setCountdown(0);
  };

  // Raisons communes d'annulation et solutions
  const commonReasons = [
    {
      reason: "Problème avec votre carte bancaire",
      solutions: [
        "Vérifiez que votre carte n'est pas expirée",
        "Assurez-vous d'avoir suffisamment de fonds",
        "Contactez votre banque si le problème persiste"
      ]
    },
    {
      reason: "Vous avez fermé la fenêtre par accident",
      solutions: [
        "Cliquez sur 'Réessayer le paiement' ci-dessous",
        "Vos informations sont sauvegardées"
      ]
    },
    {
      reason: "Vous voulez changer de plan",
      solutions: [
        "Retournez à la page des plans",
        "Comparez les différentes offres",
        "Sélectionnez le plan qui vous convient le mieux"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-orange-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Paiement annulé
          </h1>
          <p className="text-xl text-gray-600">
            Votre transaction n'a pas été finalisée
          </p>
        </div>

        <Card className="max-w-3xl mx-auto border-orange-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-orange-500" />
            </div>
            <CardTitle className="text-2xl text-orange-700">
              Aucun paiement effectué
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="border-orange-200 bg-orange-50">
              <CreditCard className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <span className="font-semibold">Rassurez-vous :</span> Aucun montant n'a été débité de votre compte. 
                Votre transaction a été interrompue avant tout prélèvement.
              </AlertDescription>
            </Alert>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
                Pourquoi votre paiement a-t-il été annulé ?
              </h3>
              
              <div className="space-y-4">
                {commonReasons.map((item, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2">{item.reason}</h4>
                    <ul className="space-y-1">
                      {item.solutions.map((solution, sIndex) => (
                        <li key={sIndex} className="text-gray-600 text-sm flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {autoRedirect && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{countdown}</span>
                    </div>
                  </div>
                  <p className="text-blue-800 font-medium">
                    Redirection vers les plans dans {countdown} seconde{countdown > 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopAutoRedirect}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Annuler la redirection
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Button
                onClick={handleRetryPayment}
                className="bg-green-600 hover:bg-green-700"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Réessayer le paiement
              </Button>
              
              <Button
                variant="outline"
                onClick={handleBackToPlans}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voir tous les plans
              </Button>

              {isAuthenticated && (
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                  className="sm:col-span-2"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Retour au tableau de bord
                </Button>
              )}
            </div>

            {/* Informations de contact et support */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-green-600" />
                Besoin d'aide ?
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Support technique</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Notre équipe est disponible pour vous aider avec vos paiements.
                  </p>
                  <a 
                    href="mailto:support@teammove.fr" 
                    className="text-blue-600 hover:underline text-sm"
                  >
                    support@teammove.fr
                  </a>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Questions fréquentes</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Consultez notre centre d'aide pour les questions courantes.
                  </p>
                  <a 
                    href="/faq" 
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Centre d'aide
                  </a>
                </div>
              </div>

              {organizationId && (
                <div className="mt-4 p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-900 mb-2">Informations de session</h4>
                  <p className="text-xs text-gray-500 font-mono">
                    ID Organisation: {organizationId}
                    {planId && <><br/>Plan sélectionné: {planId}</>}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Communiquez ces informations à notre support si vous rencontrez des difficultés.
                  </p>
                </div>
              )}
            </div>

            {/* Avantages de nos plans */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                💡 Pourquoi choisir un plan TeamMove ?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 text-sm">Organisation simplifiée de vos événements</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 text-sm">Gestion automatique du covoiturage</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 text-sm">Communication facilitée avec vos participants</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700 text-sm">Support client réactif et personnalisé</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            TeamMove • Plateforme de covoiturage sportif •{' '}
            <a href="/" className="text-blue-600 hover:underline">
              teammove.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}