import React from 'react';
import { useLocation, useRouter } from 'wouter';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentCancel() {
  const [location] = useLocation();
  const [, navigate] = useRouter();

  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const mode = urlParams.get('mode') || 'registration';
  const isRegistration = mode === 'registration';

  const handleRetry = () => {
    if (isRegistration) {
      navigate('/');
    } else {
      navigate('/subscription');
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Cancel Icon */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-red-800 dark:text-red-400 mb-2">
            Paiement annulé
          </h1>
          <p className="text-lg text-red-700 dark:text-red-300">
            {isRegistration 
              ? 'Votre inscription n\'a pas été finalisée car le paiement a été annulé.'
              : 'La mise à jour de votre plan a été annulée.'
            }
          </p>
        </div>

        {/* Information Card */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-xl">Que s'est-il passé ?</CardTitle>
            <CardDescription>Informations sur l'annulation de votre paiement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Aucun débit effectué</p>
                  <p className="text-sm text-muted-foreground">
                    Aucun montant n'a été prélevé sur votre carte bancaire. 
                    Le processus de paiement a été interrompu avant la finalisation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Vous pouvez réessayer</p>
                  <p className="text-sm text-muted-foreground">
                    {isRegistration 
                      ? 'Vous pouvez relancer le processus d\'inscription à tout moment'
                      : 'Vous pouvez choisir un autre plan ou réessayer le même paiement'
                    }
                  </p>
                </div>
              </div>

              {isRegistration && (
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArrowLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Plan Découverte disponible</p>
                    <p className="text-sm text-muted-foreground">
                      Vous pouvez toujours commencer avec notre plan gratuit et upgrader plus tard
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reasons Card */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Raisons possibles de l'annulation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Vous avez fermé la fenêtre de paiement</li>
              <li>• Vous avez cliqué sur le bouton "Retour" de Stripe</li>
              <li>• La session de paiement a expiré</li>
              <li>• Un problème technique temporaire</li>
              <li>• Vous avez choisi d'annuler volontairement</li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleRetry}
            size="lg" 
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRegistration ? 'Recommencer l\'inscription' : 'Choisir un autre plan'}
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            onClick={handleGoBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retourner au tableau de bord
          </Button>
        </div>

        {/* Help Section */}
        <Card className="bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                Besoin d'aide ?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
                Si vous rencontrez des difficultés ou avez des questions sur nos plans
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => navigate('/support')}>
                  Contacter le support
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('mailto:support@teammove.app')}>
                  Envoyer un email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}