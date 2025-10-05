import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <XCircle className="h-16 w-16 text-orange-500" />
            <h2 className="text-2xl font-semibold text-orange-700">Paiement annulé</h2>
            <p className="text-gray-600">
              Votre paiement a été annulé. Aucun montant n'a été débité de votre compte.
            </p>
            
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-700">
                Vous pouvez continuer à utiliser TeamMove avec l'offre Découverte gratuite 
                ou reprendre le processus de paiement quand vous le souhaitez.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
              <h3 className="font-medium text-blue-900 mb-2">Avec l'offre Découverte :</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Créez jusqu'à 1 événement</li>
                <li>• Invitez jusqu'à 20 participants</li>
                <li>• Gestion du covoiturage de base</li>
                <li>• Messagerie simple</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 w-full pt-4">
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => window.location.href = '/dashboard'}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continuer avec Découverte
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/subscription'}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Choisir une offre payante
              </Button>
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/'}
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}