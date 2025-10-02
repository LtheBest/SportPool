import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle, 
  Crown, 
  ArrowRight, 
  X,
  Calendar,
  Mail,
  Zap
} from 'lucide-react';

interface SubscriptionLimits {
  subscriptionType: 'decouverte' | 'evenementielle' | 'pro_club' | 'pro_pme' | 'pro_entreprise';
  eventCreatedCount: number;
  invitationsSentCount: number;
  limits: {
    maxEvents: number | null;
    maxInvitations: number | null;
  };
  remainingEvents: number | null;
  remainingInvitations: number | null;
}

export function SubscriptionLimitsBanner() {
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const response = await fetch('/api/subscription/info', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setLimits(data);
      }
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !limits || limits.subscriptionType !== 'decouverte' || dismissed) {
    return null;
  }

  const isNearEventLimit = limits.remainingEvents !== null && limits.remainingEvents <= 0;
  const isNearInvitationLimit = limits.remainingInvitations !== null && limits.remainingInvitations <= 5;
  const showWarning = isNearEventLimit || isNearInvitationLimit;

  if (!showWarning) {
    return null;
  }

  return (
    <Card className={`border-l-4 ${isNearEventLimit ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0">
              {isNearEventLimit ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            
            <div className="flex-1 space-y-3">
              <div>
                <h4 className={`font-medium ${isNearEventLimit ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
                  {isNearEventLimit ? 'Limite d\'événements atteinte' : 'Attention aux limites'}
                </h4>
                <p className={`text-sm mt-1 ${isNearEventLimit ? 'text-red-700 dark:text-red-200' : 'text-yellow-700 dark:text-yellow-200'}`}>
                  {isNearEventLimit 
                    ? 'Vous ne pouvez plus créer d\'événements avec votre plan Découverte.'
                    : 'Vous approchez des limites de votre plan Découverte.'
                  }
                </p>
              </div>

              {/* Usage Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Événements</span>
                    </div>
                    <span className="text-sm">
                      {limits.eventCreatedCount} / {limits.limits.maxEvents}
                    </span>
                  </div>
                  <Progress 
                    value={limits.limits.maxEvents ? (limits.eventCreatedCount / limits.limits.maxEvents) * 100 : 0}
                    className="h-2"
                  />
                  {isNearEventLimit && (
                    <p className="text-xs text-red-600 dark:text-red-400">Limite atteinte</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-medium">Invitations</span>
                    </div>
                    <span className="text-sm">
                      {limits.invitationsSentCount} / {limits.limits.maxInvitations}
                    </span>
                  </div>
                  <Progress 
                    value={limits.limits.maxInvitations ? (limits.invitationsSentCount / limits.limits.maxInvitations) * 100 : 0}
                    className="h-2"
                  />
                  {isNearInvitationLimit && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Plus que {limits.remainingInvitations} invitations
                    </p>
                  )}
                </div>
              </div>

              {/* Upgrade CTA */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => window.location.href = '/subscription/plans'}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Choisir une offre
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">Événements et invitations illimités</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Composant simple pour afficher les statistiques d'usage
export function UsageStats() {
  const [limits, setLimits] = useState<SubscriptionLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const response = await fetch('/api/subscription/info', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setLimits(data);
      }
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !limits) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isDiscovery = limits.subscriptionType === 'decouverte';
  const getSubscriptionLabel = () => {
    switch (limits.subscriptionType) {
      case 'decouverte': return 'Découverte';
      case 'evenementielle': return 'Événementielle';
      case 'pro_club': return 'Pro Club';
      case 'pro_pme': return 'Pro PME';
      case 'pro_entreprise': return 'Pro Entreprise';
      default: return 'Découverte';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Utilisation</h4>
          <Badge 
            variant={isDiscovery ? "outline" : "secondary"}
            className={!isDiscovery ? "bg-gradient-to-r from-blue-400 to-purple-600 text-white" : ""}
          >
            {!isDiscovery && <Crown className="w-3 h-3 mr-1" />}
            {getSubscriptionLabel()}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Événements
              </span>
              <span className="text-gray-500">
                {limits.eventCreatedCount} / {limits.limits.maxEvents || '∞'}
              </span>
            </div>
            <Progress 
              value={
                limits.limits.maxEvents 
                  ? Math.min((limits.eventCreatedCount / limits.limits.maxEvents) * 100, 100)
                  : 0
              }
              className="h-1.5"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                Invitations
              </span>
              <span className="text-gray-500">
                {limits.invitationsSentCount} / {limits.limits.maxInvitations || '∞'}
              </span>
            </div>
            <Progress 
              value={
                limits.limits.maxInvitations 
                  ? Math.min((limits.invitationsSentCount / limits.limits.maxInvitations) * 100, 100)
                  : 0
              }
              className="h-1.5"
            />
          </div>

          {isDiscovery && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => window.location.href = '/subscription/plans'}
            >
              <Crown className="w-4 h-4 mr-2" />
              Choisir une offre
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}