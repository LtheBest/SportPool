import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  XCircle, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';

export default function PaymentCancelledPage() {
  const [, setLocation] = useLocation();
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    
    if (planParam) {
      setPlanId(planParam);
    }
  }, []);

  const handleRetryPayment = () => {
    if (planId) {
      setLocation(`/subscription?plan=${planId}&mode=upgrade`);
    } else {
      setLocation('/subscription');
    }
  };

  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleContactSupport = () => {
    // Ouvrir le chat support ou rediriger vers la page de contact
    setLocation('/dashboard?tab=support');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Message principal */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-orange-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-orange-900 mb-2">
              Paiement annulé
            </h1>
            
            <p className="text-lg text-orange-800 mb-6">
              Votre paiement a été annulé. Aucun frais n'a été prélevé sur votre carte.
            </p>
          </CardContent>
        </Card>

        {/* Informations */}
        <Card>
          <CardHeader>
            <CardTitle>Que s'est-il passé ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Vous avez annulé le processus de paiement ou celui-ci n'a pas pu être complété. 
              Voici quelques raisons possibles :
            </p>
            
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Vous avez cliqué sur le bouton "Retour" ou fermé la fenêtre de paiement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Problème temporaire avec votre méthode de paiement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Connexion internet instable pendant la transaction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Vous avez changé d'avis concernant l'abonnement</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions suggérées */}
        <Card>
          <CardHeader>
            <CardTitle>Que voulez-vous faire maintenant ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <Button 
                onClick={handleRetryPayment} 
                size="lg" 
                className="w-full justify-start h-auto p-4"
              >
                <RotateCcw className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Réessayer le paiement</div>
                  <div className="text-sm opacity-90">
                    Retourner à la sélection des plans et réessayer
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={handleBackToDashboard} 
                variant="outline" 
                size="lg" 
                className="w-full justify-start h-auto p-4"
              >
                <ArrowLeft className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Retour au tableau de bord</div>
                  <div className="text-sm text-gray-600">
                    Continuer avec votre plan actuel
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={handleContactSupport} 
                variant="outline" 
                size="lg" 
                className="w-full justify-start h-auto p-4 border-blue-200 hover:bg-blue-50"
              >
                <HelpCircle className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-blue-600">Contacter le support</div>
                  <div className="text-sm text-blue-600">
                    Besoin d'aide ? Notre équipe est là pour vous
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations de sécurité */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <Alert>
              <AlertDescription>
                <strong>Votre sécurité est notre priorité :</strong> Aucune information de paiement 
                n'a été stockée et aucun montant n'a été débité de votre compte.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Options de contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Besoin d'assistance ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-gray-50">
                <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h3 className="font-medium mb-1">Email</h3>
                <p className="text-sm text-gray-600">support@teammove.app</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gray-50">
                <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium mb-1">Chat en direct</h3>
                <p className="text-sm text-gray-600">Disponible 9h-18h</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gray-50">
                <Phone className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <h3 className="font-medium mb-1">Téléphone</h3>
                <p className="text-sm text-gray-600">01 23 45 67 89</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message de réassurance */}
        <div className="text-center text-gray-600 text-sm">
          <p>Vous pouvez souscrire à un abonnement à tout moment.</p>
          <p>Nos plans sont flexibles et peuvent être modifiés ou annulés facilement.</p>
        </div>
      </div>
    </div>
  );
}