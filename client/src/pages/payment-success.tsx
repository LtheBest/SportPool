import React, { useEffect, useState } from 'react';
import { useLocation, useRouter } from 'wouter';
import { CheckCircle, Loader2, ArrowRight, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStripe } from '@/hooks/useStripe';
import { useAuth } from '@/hooks/useAuth';

export default function PaymentSuccess() {
  const [location] = useLocation();
  const [, navigate] = useRouter();
  const { getSession } = useStripe();
  const { organization, refreshToken } = useAuth();
  
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extraire les paramètres de l'URL
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const sessionId = urlParams.get('session_id');
    const mode = urlParams.get('mode') || 'registration';

    if (!sessionId) {
      setError('Session de paiement non trouvée');
      setLoading(false);
      return;
    }

    loadSessionData(sessionId);
  }, [location]);

  const loadSessionData = async (sessionId: string) => {
    try {
      const session = await getSession(sessionId);
      setSessionData(session);
      
      // Rafraîchir les données utilisateur pour récupérer le nouveau plan
      await refreshToken();
      
    } catch (error: any) {
      console.error('Erreur chargement session:', error);
      setError(error.message || 'Erreur de vérification du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const mode = urlParams.get('mode');
    
    if (mode === 'registration') {
      navigate('/dashboard');
    } else {
      navigate('/subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Vérification du paiement...</h2>
          <p className="text-muted-foreground">Merci de patienter pendant que nous vérifions votre paiement.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Erreur de vérification</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Retourner au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const mode = urlParams.get('mode') || 'registration';
  const isRegistration = mode === 'registration';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Success Icon */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 dark:text-green-400 mb-2">
            {isRegistration ? 'Inscription confirmée !' : 'Plan mis à jour !'}
          </h1>
          <p className="text-lg text-green-700 dark:text-green-300">
            {isRegistration 
              ? 'Votre paiement a été traité avec succès et votre compte est maintenant actif.'
              : 'Votre nouveau plan a été activé avec succès.'
            }
          </p>
        </div>

        {/* Payment Summary */}
        {sessionData && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-green-200 dark:border-green-800">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Résumé du paiement</CardTitle>
                  <CardDescription>Détails de votre transaction</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  {sessionData.status === 'paid' ? 'Payé' : sessionData.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan sélectionné</p>
                  <p className="text-lg font-semibold">{sessionData.planId || 'Plan Premium'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Montant payé</p>
                  <p className="text-lg font-semibold">
                    {sessionData.amountTotal ? `${(sessionData.amountTotal / 100).toFixed(2)} €` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mode de paiement</p>
                  <p className="text-lg font-semibold">
                    {sessionData.mode === 'subscription' ? 'Abonnement' : 'Paiement unique'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email de facturation</p>
                  <p className="text-lg font-semibold">{sessionData.customerEmail || organization?.email}</p>
                </div>
              </div>

              {/* Transaction ID */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">ID de transaction</p>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                  {sessionData.id}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Prochaines étapes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Email de confirmation envoyé</p>
                  <p className="text-sm text-muted-foreground">
                    Un email de confirmation avec votre reçu a été envoyé à {organization?.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Accédez à votre tableau de bord</p>
                  <p className="text-sm text-muted-foreground">
                    {isRegistration 
                      ? 'Commencez à créer vos premiers événements et organiser le covoiturage'
                      : 'Profitez de toutes les nouvelles fonctionnalités de votre plan'
                    }
                  </p>
                </div>
              </div>

              {sessionData?.mode === 'subscription' && (
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">Gestion de l'abonnement</p>
                    <p className="text-sm text-muted-foreground">
                      Vous pouvez gérer votre abonnement depuis votre tableau de bord
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleContinue}
            size="lg" 
            className="flex-1"
          >
            {isRegistration ? (
              <>
                Accéder au tableau de bord
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Voir mon plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          
          {sessionData?.mode === 'subscription' && (
            <Button 
              variant="outline"
              size="lg"
              onClick={() => navigate('/subscription')}
            >
              Gérer l'abonnement
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}