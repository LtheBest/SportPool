import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatures, FEATURE_DESCRIPTIONS } from "@/hooks/useFeatures";
import { useAuth } from "@/hooks/useAuth";

export function FeatureStatus() {
  const { getActiveFeatures, getFeatureInfo, isOrganizationDisabled, organization } = useFeatures();
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !organization) return null;

  const activeFeatures = getActiveFeatures();
  const isDisabled = isOrganizationDisabled();
  
  // Grouper les fonctionnalités par catégorie
  const featuresByCategory = activeFeatures.reduce((acc, feature) => {
    const info = getFeatureInfo(feature);
    if (!info) return acc;
    
    const category = info.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ id: feature, ...info });
    return acc;
  }, {} as Record<string, Array<{ id: string; name: string; description: string; icon: string; category: string }>>);

  if (isDisabled) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                Organisation désactivée
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Votre organisation a été temporairement désactivée. Contactez l'administrateur pour plus d'informations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeFeatures.length === 0 && organization.role !== 'admin') {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center">
              <i className="fas fa-info-circle text-yellow-600 dark:text-yellow-400"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                Aucune fonctionnalité activée
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Contactez votre administrateur pour activer des fonctionnalités supplémentaires.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <i className="fas fa-cog mr-2 text-primary"></i>
            Fonctionnalités activées
          </span>
          <Badge variant="outline">
            {organization.role === 'admin' ? 'Administrateur' : `${activeFeatures.length} fonctionnalités`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {organization.role === 'admin' ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-crown text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Accès administrateur</h3>
            <p className="text-sm text-muted-foreground">
              Vous avez accès à toutes les fonctionnalités de la plateforme.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(featuresByCategory).map(([category, features]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                  {category}
                </h4>
                <div className="grid gap-3">
                  {features.map((feature) => (
                    <div key={feature.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className={`${feature.icon} text-primary text-sm`}></i>
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{feature.name}</h5>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      <Badge variant="default" className="text-xs">
                        <i className="fas fa-check mr-1"></i>
                        Actif
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {activeFeatures.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Ces fonctionnalités sont activées pour votre organisation.
                  <br />
                  Contactez l'administrateur pour modifier vos permissions.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Composant simple pour afficher l'indicateur de statut dans la barre de navigation
export function OrganizationStatusIndicator() {
  const { organization, isOrganizationDisabled } = useFeatures();
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !organization) return null;

  if (isOrganizationDisabled()) {
    return (
      <Badge variant="destructive" className="text-xs">
        <i className="fas fa-exclamation-triangle mr-1"></i>
        Désactivée
      </Badge>
    );
  }

  if (organization.role === 'admin') {
    return (
      <Badge variant="default" className="text-xs bg-blue-600">
        <i className="fas fa-crown mr-1"></i>
        Admin
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs">
      <i className="fas fa-check-circle mr-1"></i>
      Actif
    </Badge>
  );
}