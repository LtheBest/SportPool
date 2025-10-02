import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Check, Crown, Star, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionInfo {
  subscriptionType: 'decouverte' | 'evenementielle' | 'pro_club' | 'pro_pme' | 'pro_entreprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due';
  paymentMethod?: 'monthly' | 'annual' | 'pack_single' | 'pack_10';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  packageRemainingEvents?: number;
  packageExpiryDate?: string;
  eventCreatedCount: number;
  invitationsSentCount: number;
  limits: {
    maxEvents: number | null;
    maxInvitations: number | null;
  };
  remainingEvents: number | null;
  remainingInvitations: number | null;
}

export function SubscriptionPlan() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch('/api/subscription/info', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo(data);
      } else {
        throw new Error('Failed to fetch subscription info');
      }
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      toast.error('Erreur lors du chargement des informations d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (billingInterval: 'monthly' | 'annual') => {
    setUpgrading(true);
    try {
      // Ici vous intégreriez Stripe Elements pour le paiement
      // Pour maintenant, on simule juste l'appel
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          billingInterval,
          paymentMethodId: 'pm_card_visa', // À remplacer par la vraie méthode de paiement Stripe
        }),
      });

      if (response.ok) {
        toast.success('Abonnement mis à niveau avec succès !');
        await fetchSubscriptionInfo();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Erreur lors de la mise à niveau de l\'abonnement');
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
      return;
    }

    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Abonnement annulé. Il restera actif jusqu\'à la fin de la période de facturation.');
        await fetchSubscriptionInfo();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Erreur lors de l\'annulation de l\'abonnement');
    }
  };

  const getProgressPercentage = (used: number, max: number | null) => {
    if (max === null) return 0; // Unlimited
    return Math.min((used / max) * 100, 100);
  };

  const getProgressColor = (used: number, max: number | null) => {
    if (max === null) return 'bg-green-500'; // Unlimited
    const percentage = (used / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscriptionInfo) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Erreur de chargement</h3>
        <p className="mt-1 text-sm text-gray-500">
          Impossible de charger les informations d'abonnement.
        </p>
      </div>
    );
  }

  const isDiscovery = subscriptionInfo.subscriptionType === 'decouverte';
  const isEventPlan = subscriptionInfo.subscriptionType === 'evenementielle';
  const isProPlan = ['pro_club', 'pro_pme', 'pro_entreprise'].includes(subscriptionInfo.subscriptionType);
  
  const getSubscriptionName = () => {
    switch (subscriptionInfo.subscriptionType) {
      case 'decouverte': return 'Découverte';
      case 'evenementielle': return 'Événementielle';
      case 'pro_club': return 'Clubs & Associations';
      case 'pro_pme': return 'PME';
      case 'pro_entreprise': return 'Grandes Entreprises';
      default: return 'Découverte';
    }
  };
  
  const getSubscriptionPrice = () => {
    switch (subscriptionInfo.subscriptionType) {
      case 'decouverte': return 'Gratuit';
      case 'evenementielle': 
        return subscriptionInfo.paymentMethod === 'pack_10' ? '150€' : '15€';
      case 'pro_club': return '19,99€';
      case 'pro_pme': return '49€';
      case 'pro_entreprise': return '99€';
      default: return 'Gratuit';
    }
  };
  
  const getSubscriptionInterval = () => {
    switch (subscriptionInfo.paymentMethod) {
      case 'monthly': return '/mois';
      case 'annual': return '/an';
      case 'pack_single': return '';
      case 'pack_10': return ' (pack 10)';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Abonnement</h2>
          <p className="text-sm text-gray-500">
            Gérez votre abonnement et vos fonctionnalités
          </p>
        </div>
        {!isDiscovery && (
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-400 to-purple-600 text-white">
            <Crown className="w-4 h-4 mr-1" />
            {getSubscriptionName()}
          </Badge>
        )}
      </div>

      {/* Current Plan */}
      <Card className={!isDiscovery ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isDiscovery ? (
                  <>
                    <Star className="w-5 h-5 text-blue-500" />
                    Plan Découverte
                  </>
                ) : isEventPlan ? (
                  <>
                    <Crown className="w-5 h-5 text-orange-500" />
                    Plan Événementielle
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 text-blue-500" />
                    Plan {getSubscriptionName()}
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isDiscovery ? (
                  'Plan gratuit avec limitations'
                ) : isEventPlan ? (
                  subscriptionInfo.paymentMethod === 'pack_10' 
                    ? 'Pack 10 événements (valable 12 mois)'
                    : 'Pack événement unique'
                ) : (
                  'Abonnement mensuel - Fonctionnalités avancées'
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {getSubscriptionPrice()}
              </div>
              {!isDiscovery && (
                <div className="text-sm text-gray-500">
                  {getSubscriptionInterval()}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Usage Stats */}
          <div className="space-y-4">
            {/* Events Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Événements créés</span>
                <span className="text-sm text-gray-500">
                  {subscriptionInfo.eventCreatedCount} / {subscriptionInfo.limits.maxEvents || '∞'}
                </span>
              </div>
              <Progress
                value={getProgressPercentage(subscriptionInfo.eventCreatedCount, subscriptionInfo.limits.maxEvents)}
                className="h-2"
              />
              {subscriptionInfo.remainingEvents !== null && subscriptionInfo.remainingEvents <= 0 && (
                <p className="text-xs text-red-500 mt-1">Limite atteinte</p>
              )}
            </div>

            {/* Invitations Usage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Invitations envoyées</span>
                <span className="text-sm text-gray-500">
                  {subscriptionInfo.invitationsSentCount} / {subscriptionInfo.limits.maxInvitations || '∞'}
                </span>
              </div>
              <Progress
                value={getProgressPercentage(subscriptionInfo.invitationsSentCount, subscriptionInfo.limits.maxInvitations)}
                className="h-2"
              />
              {subscriptionInfo.remainingInvitations !== null && subscriptionInfo.remainingInvitations <= 0 && (
                <p className="text-xs text-red-500 mt-1">Limite atteinte</p>
              )}
            </div>
          </div>

          {/* Features List */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Fonctionnalités incluses :</h4>
            <div className="space-y-2">
              {isDiscovery ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    1 événement maximum
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    20 invitations maximum
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Support par email
                  </div>
                </>
              ) : isEventPlan ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    {subscriptionInfo.paymentMethod === 'pack_10' ? '10 événements' : '1 événement complet'}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Invitations illimitées
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Support prioritaire
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Messagerie intégrée
                  </div>
                  {subscriptionInfo.paymentMethod === 'pack_10' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      Valable 12 mois
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Événements illimités
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Invitations illimitées
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Support prioritaire
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Statistiques avancées
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Branding personnalisé
                  </div>
                  {subscriptionInfo.subscriptionType === 'pro_pme' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      Multi-utilisateurs (5 admins)
                    </div>
                  )}
                  {subscriptionInfo.subscriptionType === 'pro_entreprise' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      Multi-utilisateurs illimités
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t space-y-3">
            {isDiscovery ? (
              <Button
                onClick={() => window.location.href = '/subscription/plans'}
                disabled={upgrading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Choisir une offre
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Informations sur l'abonnement en cours */}
                {isEventPlan && subscriptionInfo.packageRemainingEvents !== undefined && (
                  <div className="text-sm bg-orange-50 p-3 rounded-lg">
                    <div className="font-medium">Événements restants : {subscriptionInfo.packageRemainingEvents}</div>
                    {subscriptionInfo.packageExpiryDate && (
                      <div className="text-gray-600">
                        Expire le : {new Date(subscriptionInfo.packageExpiryDate).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    className="flex-1"
                  >
                    Rétrograder vers Découverte
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.location.href = '/subscription/plans'}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Changer d'offre
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      {!isDiscovery && subscriptionInfo.subscriptionStatus !== 'active' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              {subscriptionInfo.subscriptionStatus === 'cancelled' &&
                'Votre abonnement a été annulé et se terminera à la fin de la période de facturation.'}
              {subscriptionInfo.subscriptionStatus === 'past_due' &&
                'Votre paiement est en retard. Veuillez mettre à jour votre méthode de paiement.'}
              {subscriptionInfo.subscriptionStatus === 'inactive' &&
                'Votre abonnement est inactif. Contactez le support si le problème persiste.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}