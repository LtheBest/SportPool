import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import PaymentSetup from "./PaymentSetup";

interface SubscriptionLimits {
  events: {
    current: number;
    limit?: number;
  };
  invitations: {
    current: number;
    limit?: number;
  };
}

export default function SubscriptionInfo() {
  const { organization } = useAuth();
  const [showPaymentSetup, setShowPaymentSetup] = useState(false);

  const { data: subscriptionInfo, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/stripe/subscription-info"],
    enabled: !!organization,
  });

  const { data: limits, isLoading: limitsLoading } = useQuery<SubscriptionLimits>({
    queryKey: ["/api/subscription/limits"],
    enabled: !!organization,
  });

  if (!organization) return null;

  const isDiscoveryPlan = organization.subscriptionType === 'decouverte';
  const isPremiumPlan = organization.subscriptionType === 'premium';

  const getProgressPercentage = (current: number, limit?: number) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const isNearLimit = (current: number, limit?: number) => {
    if (!limit) return false;
    return current / limit >= 0.8; // 80% ou plus
  };

  const handleUpgrade = () => {
    setShowPaymentSetup(true);
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (error) {
      console.error('Erreur ouverture portail:', error);
    }
  };

  if (subscriptionLoading || limitsLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {isDiscoveryPlan ? (
                  <i className="fas fa-rocket text-primary"></i>
                ) : (
                  <i className="fas fa-star text-primary"></i>
                )}
              </div>
              <div>
                <CardTitle className="text-lg">
                  Abonnement {isDiscoveryPlan ? 'Découverte' : 'Premium'}
                </CardTitle>
                <CardDescription>
                  {isDiscoveryPlan 
                    ? 'Parfait pour découvrir la plateforme'
                    : 'Accès complet à toutes les fonctionnalités'
                  }
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={isDiscoveryPlan ? "secondary" : "default"}
              className={isDiscoveryPlan ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"}
            >
              {isDiscoveryPlan ? 'GRATUIT' : 'PREMIUM'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Limites d'utilisation pour l'offre découverte */}
          {isDiscoveryPlan && limits && (
            <div className="space-y-4">
              {/* Événements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Événements créés</span>
                  <span className="text-sm text-muted-foreground">
                    {limits.events.current} / {limits.events.limit}
                  </span>
                </div>
                <Progress 
                  value={getProgressPercentage(limits.events.current, limits.events.limit)} 
                  className={`h-2 ${isNearLimit(limits.events.current, limits.events.limit) ? 'bg-orange-100' : ''}`}
                />
                {isNearLimit(limits.events.current, limits.events.limit) && (
                  <Alert className="mt-2">
                    <i className="fas fa-exclamation-triangle w-4 h-4"></i>
                    <AlertDescription className="text-sm">
                      Vous approchez de la limite d'événements. Passez au Premium pour créer des événements illimités.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Invitations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Invitations envoyées</span>
                  <span className="text-sm text-muted-foreground">
                    {limits.invitations.current} / {limits.invitations.limit}
                  </span>
                </div>
                <Progress 
                  value={getProgressPercentage(limits.invitations.current, limits.invitations.limit)} 
                  className={`h-2 ${isNearLimit(limits.invitations.current, limits.invitations.limit) ? 'bg-orange-100' : ''}`}
                />
                {isNearLimit(limits.invitations.current, limits.invitations.limit) && (
                  <Alert className="mt-2">
                    <i className="fas fa-exclamation-triangle w-4 h-4"></i>
                    <AlertDescription className="text-sm">
                      Vous approchez de la limite d'invitations. Passez au Premium pour inviter sans limite.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Statistiques pour Premium */}
          {isPremiumPlan && limits && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {limits.events.current}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Événements créés</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {limits.invitations.current}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Invitations envoyées</div>
              </div>
            </div>
          )}

          {/* Fonctionnalités incluses */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Fonctionnalités incluses :</h4>
            <div className="grid gap-1 text-sm">
              {isDiscoveryPlan ? (
                <>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2 w-4"></i>
                    <span>1 événement maximum</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2 w-4"></i>
                    <span>Jusqu'à 20 invitations par événement</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2 w-4"></i>
                    <span>Gestion du covoiturage</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-2 w-4"></i>
                    <span>Support par email</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <i className="fas fa-check text-blue-500 mr-2 w-4"></i>
                    <span><strong>Événements illimités</strong></span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-blue-500 mr-2 w-4"></i>
                    <span><strong>Invitations illimitées</strong></span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-blue-500 mr-2 w-4"></i>
                    <span>Statistiques avancées</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-blue-500 mr-2 w-4"></i>
                    <span>Support prioritaire</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-blue-500 mr-2 w-4"></i>
                    <span>Messagerie avancée</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t">
            {isDiscoveryPlan ? (
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <i className="fas fa-arrow-up mr-2"></i>
                Passer au Premium
              </Button>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={handleManageBilling}
                  variant="outline"
                  className="w-full"
                >
                  <i className="fas fa-cog mr-2"></i>
                  Gérer mon abonnement
                </Button>
                {subscriptionInfo?.subscriptionStatus && (
                  <div className="text-center text-sm text-muted-foreground">
                    Statut : {subscriptionInfo.subscriptionStatus}
                    {subscriptionInfo.currentPeriodEnd && (
                      <span className="block">
                        Prochaine facturation : {new Date(subscriptionInfo.currentPeriodEnd * 1000).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PaymentSetup
        isOpen={showPaymentSetup}
        onClose={() => setShowPaymentSetup(false)}
        onSuccess={() => {
          setShowPaymentSetup(false);
          // Recharger les données
          window.location.reload();
        }}
      />
    </>
  );
}