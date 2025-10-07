import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  ArrowRight, 
  Download, 
  Mail,
  Calendar,
  CreditCard,
  Loader2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PaymentSession {
  sessionId: string;
  paymentStatus: string;
  customerEmail: string;
  planId: string;
  planName: string;
  amountTotal: number;
  currency: string;
}

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    } else {
      // Rediriger si pas de session ID
      setTimeout(() => setLocation('/dashboard'), 3000);
    }
  }, [setLocation]);

  const { data: session, isLoading, error } = useQuery<PaymentSession>({
    queryKey: ['/api/stripe/session', sessionId],
    enabled: !!sessionId,
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleDownloadReceipt = async () => {
    // TODO: Implémenter le téléchargement de facture
    // Pour l'instant, on affiche juste un message
    alert('La fonction de téléchargement de facture sera bientôt disponible.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Vérification du paiement...</h2>
            <p className="text-gray-600">Nous vérifions les détails de votre transaction.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Erreur de vérification
            </h2>
            <p className="text-red-700 mb-6">
              Impossible de vérifier votre paiement. Veuillez contacter le support.
            </p>
            <Button onClick={handleGoToDashboard} variant="outline">
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaymentSuccessful = session.paymentStatus === 'paid';

  if (!isPaymentSuccessful) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">
              Paiement en attente
            </h2>
            <p className="text-yellow-700 mb-6">
              Votre paiement est en cours de traitement. Vous recevrez une confirmation par email.
            </p>
            <Button onClick={handleGoToDashboard}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Message de succès principal */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-green-900 mb-2">
              Paiement réussi ! 🎉
            </h1>
            
            <p className="text-lg text-green-800 mb-6">
              Votre abonnement <strong>{session.planName}</strong> a été activé avec succès.
            </p>
            
            <Badge variant="default" className="bg-green-600 text-white text-sm px-4 py-2">
              Abonnement actif
            </Badge>
          </CardContent>
        </Card>

        {/* Détails de la transaction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Détails de la transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Plan souscrit</label>
                <p className="text-lg font-semibold">{session.planName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Montant payé</label>
                <p className="text-lg font-semibold">{formatAmount(session.amountTotal, session.currency)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email de facturation</label>
                <p className="text-gray-900">{session.customerEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">ID de transaction</label>
                <p className="text-sm text-gray-600 font-mono">{session.sessionId.substring(0, 20)}...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prochaines étapes */}
        <Card>
          <CardHeader>
            <CardTitle>Prochaines étapes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="w-4 h-4" />
              <AlertDescription>
                Un email de confirmation avec votre facture a été envoyé à <strong>{session.customerEmail}</strong>.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span>Votre abonnement est maintenant actif</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span>Toutes les fonctionnalités premium sont débloquées</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span>Vous pouvez gérer votre abonnement depuis votre tableau de bord</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleGoToDashboard} size="lg" className="flex-1 sm:flex-none">
            <ArrowRight className="w-4 h-4 mr-2" />
            Accéder au tableau de bord
          </Button>
          
          <Button onClick={handleDownloadReceipt} variant="outline" size="lg" className="flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Télécharger la facture
          </Button>
        </div>

        {/* Message d'assistance */}
        <Card className="bg-gray-50">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">
              Des questions ? Contactez notre équipe support à{' '}
              <a href="mailto:support@teammove.app" className="text-blue-600 hover:underline">
                support@teammove.app
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}