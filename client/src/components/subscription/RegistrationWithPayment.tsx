/**
 * Composant pour l'inscription avec intégration du paiement
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  CreditCard, 
  Shield,
  ArrowRight,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

// Types
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

interface RegistrationWithPaymentProps {
  selectedPlan: Plan;
  organizationData: any;
  onBack: () => void;
  onSuccess: () => void;
}

function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
  if (priceInCents === 0) return 'Gratuit';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
}

export function RegistrationWithPayment({
  selectedPlan,
  organizationData,
  onBack,
  onSuccess,
}: RegistrationWithPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const [, setLocation] = useLocation();

  const handleRegistration = async () => {
    try {
      setLoading(true);
      setError(null);

      console.info('🔐 Starting registration process', {
        planId: selectedPlan.id,
        organizationName: organizationData.name,
      });

      // Inclure le plan sélectionné dans les données d'inscription
      const registrationData = {
        ...organizationData,
        selectedPlan: selectedPlan.id,
      };

      const result = await register(registrationData);

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'inscription');
      }

      console.info('✅ Registration successful', {
        requiresPayment: result.requiresPayment,
        planType: result.planType,
      });

      // Si le plan est gratuit, redirection directe
      if (!result.requiresPayment) {
        toast.success('Inscription réussie !');
        onSuccess();
        return;
      }

      // Si un paiement est requis, rediriger vers Stripe
      if (result.checkoutUrl) {
        toast.success('Inscription créée ! Redirection vers le paiement...');
        
        // Petite pause pour que l'utilisateur voie le message
        setTimeout(() => {
          window.location.href = result.checkoutUrl;
        }, 1500);
      } else {
        throw new Error('URL de paiement non reçue');
      }

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'inscription inconnue';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Finalisation de votre inscription</h2>
        <p className="text-muted-foreground">
          Confirmez votre choix et procédez à l'inscription
        </p>
      </div>

      {/* Plan sélectionné */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Plan sélectionné</span>
            {selectedPlan.popular && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                Populaire
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Récapitulatif de votre choix d'abonnement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Informations du plan */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {formatPrice(selectedPlan.price, selectedPlan.currency)}
                </div>
                {selectedPlan.price > 0 && (
                  <div className="text-sm text-muted-foreground">
                    par mois
                  </div>
                )}
              </div>
            </div>

            {/* Fonctionnalités */}
            <div>
              <h4 className="font-medium mb-3">Fonctionnalités incluses :</h4>
              <div className="grid grid-cols-1 gap-2">
                {selectedPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations de l'organisation */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de votre organisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Nom :</span>
              <p className="mt-1">{organizationData.name}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Email :</span>
              <p className="mt-1">{organizationData.email}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Contact :</span>
              <p className="mt-1">
                {organizationData.contactFirstName} {organizationData.contactLastName}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Type :</span>
              <p className="mt-1 capitalize">{organizationData.type}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sécurité */}
      {selectedPlan.price > 0 && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <span>Paiement sécurisé par Stripe. Vous serez redirigé vers une page de paiement sécurisée.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Message d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          Modifier mes informations
        </Button>
        
        <Button
          onClick={handleRegistration}
          disabled={loading}
          className="flex-1 modern-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {selectedPlan.price === 0 ? 'Inscription...' : 'Création du compte...'}
            </div>
          ) : selectedPlan.price === 0 ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Créer mon compte gratuit
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Créer mon compte et payer
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </Button>
      </div>

      {/* Informations complémentaires */}
      <div className="text-center space-y-2">
        <div className="text-xs text-muted-foreground">
          {selectedPlan.price === 0 ? (
            <p>Aucun paiement requis pour le plan Découverte</p>
          ) : (
            <p>
              Vous serez redirigé vers Stripe pour finaliser votre paiement en toute sécurité.
              <br />
              Votre compte sera activé immédiatement après le paiement.
            </p>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          En continuant, vous acceptez nos{' '}
          <a href="/terms" className="text-primary hover:underline">
            conditions d'utilisation
          </a>{' '}
          et notre{' '}
          <a href="/privacy" className="text-primary hover:underline">
            politique de confidentialité
          </a>
          .
        </div>
      </div>
    </div>
  );
}