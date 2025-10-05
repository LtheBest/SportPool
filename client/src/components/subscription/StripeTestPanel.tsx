/**
 * Composant de test pour l'intégration Stripe
 * Permet de tester les différents scénarios de paiement
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  Loader2,
  Info,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

// Cartes de test Stripe
const TEST_CARDS = {
  success: {
    number: '4242 4242 4242 4242',
    description: 'Paiement réussi',
    cvc: '123',
    expiry: '12/34',
  },
  declined: {
    number: '4000 0000 0000 0002',
    description: 'Carte déclinée',
    cvc: '123',
    expiry: '12/34',
  },
  insufficient_funds: {
    number: '4000 0000 0000 9995',
    description: 'Fonds insuffisants',
    cvc: '123',
    expiry: '12/34',
  },
  authentication_required: {
    number: '4000 0025 0000 3155',
    description: 'Authentification 3D Secure requise',
    cvc: '123',
    expiry: '12/34',
  },
};

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export function StripeTestPanel() {
  const { plans, createCheckoutSession } = useSubscriptionPlans();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [{ ...result, timestamp: new Date() }, ...prev]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  // Test de création de session de checkout
  const testCheckoutSession = async (planId: string) => {
    try {
      setLoading(true);
      const plan = plans.find(p => p.id === planId);
      
      if (!plan) {
        throw new Error(`Plan ${planId} non trouvé`);
      }

      const result = await createCheckoutSession(planId);
      
      if (result.success) {
        addTestResult({
          success: true,
          message: `Session de checkout créée pour ${plan.name}`,
          details: { planId, planName: plan.name, price: plan.price },
        });
        
        if (result.url) {
          toast.success(`Session créée ! URL: ${result.url.substring(0, 50)}...`);
        }
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addTestResult({
        success: false,
        message: `Erreur de session pour ${planId}: ${errorMessage}`,
        details: { planId, error: errorMessage },
      });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Test de l'API des plans
  const testPlansAPI = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest('GET', '/api/subscription/plans');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      addTestResult({
        success: true,
        message: `API des plans OK - ${data.length} plans récupérés`,
        details: { plansCount: data.length, plans: data.map((p: any) => p.name) },
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addTestResult({
        success: false,
        message: `Erreur API des plans: ${errorMessage}`,
        details: { error: errorMessage },
      });
    } finally {
      setLoading(false);
    }
  };

  // Test de l'API des informations d'abonnement
  const testSubscriptionInfo = async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest('GET', '/api/subscription/info');
      
      if (response.ok) {
        const data = await response.json();
        addTestResult({
          success: true,
          message: 'Informations d\'abonnement récupérées',
          details: { planId: data.planId, status: data.status },
        });
      } else if (response.status === 404) {
        addTestResult({
          success: true,
          message: 'Aucun abonnement trouvé (comportement normal)',
          details: { status: 404 },
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addTestResult({
        success: false,
        message: `Erreur info abonnement: ${errorMessage}`,
        details: { error: errorMessage },
      });
    } finally {
      setLoading(false);
    }
  };

  // Lancer tous les tests
  const runAllTests = async () => {
    clearResults();
    
    addTestResult({
      success: true,
      message: '🧪 Début des tests de l\'intégration Stripe',
      details: { timestamp: new Date().toISOString() },
    });

    await testPlansAPI();
    await testSubscriptionInfo();
    
    // Tester une session de checkout pour chaque plan payant
    const paidPlans = plans.filter(p => p.price > 0);
    for (const plan of paidPlans.slice(0, 2)) { // Limiter à 2 plans pour éviter le spam
      await testCheckoutSession(plan.id);
    }
    
    addTestResult({
      success: true,
      message: '✅ Tests terminés',
      details: { timestamp: new Date().toISOString() },
    });
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-500" />
            Tests Stripe
          </CardTitle>
          <CardDescription>
            Panel de test pour valider l'intégration des paiements Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Mode Test :</strong> Utilisez les cartes de test Stripe ci-dessous pour simuler différents scénarios.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button 
                onClick={runAllTests}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Lancer tous les tests
              </Button>
              
              <Button variant="outline" onClick={clearResults}>
                Effacer les résultats
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">Tests automatiques</TabsTrigger>
          <TabsTrigger value="cards">Cartes de test</TabsTrigger>
          <TabsTrigger value="manual">Tests manuels</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {/* Résultats des tests */}
          <Card>
            <CardHeader>
              <CardTitle>Résultats des tests</CardTitle>
              <CardDescription>
                Historique des tests d'intégration ({testResults.length} résultats)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun test exécuté. Cliquez sur "Lancer tous les tests" pour commencer.
                  </p>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className={`
                      p-3 rounded-md border-l-4 ${
                        result.success 
                          ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
                      }
                    `}>
                      <div className="flex items-start gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{result.message}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(result.timestamp)}
                            </span>
                          </div>
                          {result.details && (
                            <details className="mt-1">
                              <summary className="text-xs text-muted-foreground cursor-pointer">
                                Détails
                              </summary>
                              <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          {/* Cartes de test */}
          <Card>
            <CardHeader>
              <CardTitle>Cartes de test Stripe</CardTitle>
              <CardDescription>
                Utilisez ces numéros de carte pour tester différents scénarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(TEST_CARDS).map(([key, card]) => (
                  <div key={key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{card.description}</h4>
                      <Badge variant={key === 'success' ? 'default' : 'secondary'}>
                        {key}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Numéro :</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded">{card.number}</code>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => copyToClipboard(card.number.replace(/\s/g, ''))}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Expiration :</span>
                        <code className="bg-muted px-2 py-1 rounded">{card.expiry}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>CVC :</span>
                        <code className="bg-muted px-2 py-1 rounded">{card.cvc}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          {/* Tests manuels */}
          <Card>
            <CardHeader>
              <CardTitle>Tests manuels</CardTitle>
              <CardDescription>
                Testez individuellement chaque fonctionnalité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button 
                    variant="outline"
                    onClick={testPlansAPI}
                    disabled={loading}
                  >
                    Tester API Plans
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={testSubscriptionInfo}
                    disabled={loading}
                  >
                    Tester Info Abonnement
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Tester les sessions de checkout :</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {plans.filter(p => p.price > 0).map(plan => (
                      <Button
                        key={plan.id}
                        variant="outline"
                        size="sm"
                        onClick={() => testCheckoutSession(plan.id)}
                        disabled={loading}
                        className="justify-start"
                      >
                        {plan.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}