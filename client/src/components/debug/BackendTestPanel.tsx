import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  data?: any;
  error?: string;
  timestamp?: string;
}

export default function BackendTestPanel() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTest = async (testName: string, testFn: () => Promise<Response>) => {
    setTests(prev => [...prev.filter(t => t.name !== testName), {
      name: testName,
      status: 'loading'
    }]);

    try {
      const response = await testFn();
      const data = await response.json();
      
      setTests(prev => [...prev.filter(t => t.name !== testName), {
        name: testName,
        status: response.ok ? 'success' : 'error',
        data: response.ok ? data : undefined,
        error: !response.ok ? data.message || 'Erreur inconnue' : undefined,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      if (response.ok) {
        toast({
          title: `✅ Test ${testName} réussi`,
          description: "La communication avec le backend fonctionne"
        });
      } else {
        toast({
          title: `❌ Test ${testName} échoué`,
          description: data.message || 'Erreur de communication',
          variant: "destructive"
        });
      }
    } catch (error) {
      setTests(prev => [...prev.filter(t => t.name !== testName), {
        name: testName,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur réseau',
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      toast({
        title: `❌ Test ${testName} échoué`,
        description: "Erreur de connexion au backend",
        variant: "destructive"
      });
    }
  };

  const testEndpoints = [
    {
      name: 'Health Check',
      description: 'Vérifier l\'état du serveur',
      fn: () => api.health(),
      icon: '🏥'
    },
    {
      name: 'Backend Test',
      description: 'Test de communication backend',
      fn: () => api.test(),
      icon: '🧪'
    },
    {
      name: 'Liste des utilisateurs',
      description: 'Afficher les utilisateurs de la base',
      fn: () => api.debugUsers(),
      icon: '👥'
    }
  ];

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">✅ Succès</Badge>;
      case 'error':
        return <Badge variant="destructive">❌ Erreur</Badge>;
      case 'loading':
        return <Badge variant="secondary">⏳ En cours...</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔧</span>
            <span>Tests de Communication Backend</span>
          </CardTitle>
          <CardDescription>
            Testez la communication entre le frontend et le backend pour diagnostiquer les problèmes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {testEndpoints.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{test.icon}</span>
                  <div>
                    <h4 className="font-medium">{test.name}</h4>
                    <p className="text-sm text-gray-500">{test.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => runTest(test.name, test.fn)}
                  variant="outline"
                  size="sm"
                  disabled={tests.find(t => t.name === test.name)?.status === 'loading'}
                >
                  Tester
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats des Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test) => (
                <div key={`${test.name}-${test.timestamp}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{test.name}</span>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(test.status)}
                      {test.timestamp && (
                        <span className="text-xs text-gray-500">{test.timestamp}</span>
                      )}
                    </div>
                  </div>
                  
                  {test.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                      <p className="text-red-700 text-sm font-medium">Erreur:</p>
                      <p className="text-red-600 text-sm">{test.error}</p>
                    </div>
                  )}
                  
                  {test.data && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-green-700 text-sm font-medium mb-2">Réponse:</p>
                      <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                        {JSON.stringify(test.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}