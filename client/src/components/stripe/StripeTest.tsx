import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription-config';

interface StripeTestProps {
  className?: string;
}

export default function StripeTest({ className }: StripeTestProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState<'real' | 'success' | 'pending' | 'failed'>('real');
  const [lastResult, setLastResult] = useState<any>(null);

  // Plans disponibles pour les tests
  const availablePlans = {
    'evenementielle-single': 'Pack Événement (15€)',
    'evenementielle-pack10': 'Pack 10 Événements (150€)',
    'pro-club': 'Clubs & Associations (19,99€/mois)',
    'pro-pme': 'PME (49€/mois)',
    'pro-entreprise': 'Grandes Entreprises (99€/mois)'
  };

  const handlePurchase = async () => {
    if (!selectedPlan) {
      toast.error('Veuillez sélectionner un plan');
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      let response;

      if (testMode === 'real') {
        // Paiement réel avec Stripe
        response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
          planId: selectedPlan
        });

        const data = await response.json();

        if (data.success && data.url) {
          // Rediriger vers Stripe Checkout
          window.location.href = data.url;
          return;
        } else {
          throw new Error(data.error || 'Erreur lors de la création de la session');
        }
      } else {
        // Test simulé
        response = await apiRequest('POST', '/api/stripe/test-payment', {
          planId: selectedPlan,
          status: testMode === 'success' ? 'succeeded' : testMode === 'pending' ? 'pending' : 'failed'
        });

        const data = await response.json();
        setLastResult(data);

        if (data.success) {
          toast.success(`Test ${testMode} réussi !`);
        } else {
          toast.error(`Test ${testMode} échoué : ${data.error}`);
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du test Stripe:', error);
      toast.error(error.message || 'Erreur lors du test');
      setLastResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    if (planId.includes('pro')) return <CreditCard className="h-5 w-5" />;
    if (planId.includes('evenementielle')) return <CheckCircle className="h-5 w-5" />;
    return <CreditCard className="h-5 w-5" />;
  };

  const getResultIcon = (result: any) => {
    if (!result) return null;
    if (result.error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (result.status === 'open') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className={className}>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Test d'Intégration Stripe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode de test */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode de test</label>
            <Select value={testMode} onValueChange={(value: any) => setTestMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="real">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Paiement Réel (Stripe Checkout)
                  </div>
                </SelectItem>
                <SelectItem value="success">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Test Succès
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Test En Attente
                  </div>
                </SelectItem>
                <SelectItem value="failed">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Test Échec
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sélection du plan */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Plan d'abonnement</label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez un plan..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(availablePlans).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      {getPlanIcon(id)}
                      {name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Informations du plan sélectionné */}
          {selectedPlan && (
            <Alert>
              <AlertDescription>
                <strong>Plan sélectionné :</strong> {availablePlans[selectedPlan as keyof typeof availablePlans]}
                <br />
                <strong>Mode :</strong>{' '}
                <Badge variant={testMode === 'real' ? 'default' : 'secondary'}>
                  {testMode === 'real' ? 'Paiement Réel' : `Test ${testMode}`}
                </Badge>
              </AlertDescription>
            </Alert>
          )}

          {/* Bouton de test */}
          <Button 
            onClick={handlePurchase}
            disabled={!selectedPlan || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {testMode === 'real' ? 'Redirection vers Stripe...' : 'Test en cours...'}
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {testMode === 'real' ? 'Procéder au Paiement' : `Tester ${testMode}`}
              </>
            )}
          </Button>

          {/* Résultat du test */}
          {lastResult && (
            <Alert className={lastResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <div className="flex items-center gap-2 mb-2">
                {getResultIcon(lastResult)}
                <span className="font-medium">
                  Résultat du test
                </span>
              </div>
              <AlertDescription>
                <pre className="text-xs bg-white p-2 rounded border">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {/* Informations de développement */}
          {process.env.NODE_ENV === 'development' && (
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Informations de développement :</strong>
                <br />
                • Les paiements réels utilisent les clés de test Stripe
                <br />
                • Utilisez les cartes de test Stripe pour les vrais paiements
                <br />
                • Carte test succès : 4242 4242 4242 4242
                <br />
                • Carte test échec : 4000 0000 0000 0002
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}