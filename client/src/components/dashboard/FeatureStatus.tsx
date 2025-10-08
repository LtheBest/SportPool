// client/src/components/dashboard/FeatureStatus.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Settings,
  Info,
  Eye,
  EyeOff
} from 'lucide-react';
import { useFeatures } from '../../hooks/useFeatures';

export function FeatureStatus() {
  const { features, loading, error, isFeatureEnabled } = useFeatures();

  // Fonctionnalités importantes pour l'utilisateur
  const importantFeatures = [
    {
      id: 'theme_dark_mode',
      name: 'Mode Sombre',
      description: 'Basculer entre thème clair et sombre',
      category: 'Interface'
    },
    {
      id: 'event_deletion',
      name: 'Suppression d\'Événements',
      description: 'Supprimer les événements créés',
      category: 'Événements'
    },
    {
      id: 'profile_photo_upload',
      name: 'Photo de Profil',
      description: 'Télécharger une photo de profil',
      category: 'Profil'
    },
    {
      id: 'email_notifications',
      name: 'Notifications Email',
      description: 'Recevoir des notifications par email',
      category: 'Notifications'
    },
    {
      id: 'bidirectional_messaging',
      name: 'Messagerie',
      description: 'Communication avec les membres',
      category: 'Messaging'
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Statut des Fonctionnalités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-gray-600">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Statut des Fonctionnalités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-700">
              Impossible de charger les fonctionnalités. Toutes les fonctionnalités sont disponibles par défaut.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const enabledCount = importantFeatures.filter(f => isFeatureEnabled(f.id)).length;
  const totalCount = importantFeatures.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Fonctionnalités Disponibles
          </div>
          <Badge variant="outline">
            {enabledCount}/{totalCount} actives
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {importantFeatures.map((feature) => {
          const enabled = isFeatureEnabled(feature.id);
          
          return (
            <div
              key={feature.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                enabled 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {enabled ? (
                  <Eye className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-medium ${
                    enabled ? 'text-green-900' : 'text-gray-700'
                  }`}>
                    {feature.name}
                  </h4>
                  <p className={`text-sm ${
                    enabled ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    {feature.description}
                  </p>
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs"
                  >
                    {feature.category}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center">
                {enabled ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Activée
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700">
                    <XCircle className="w-3 h-3 mr-1" />
                    Désactivée
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
        
        {enabledCount < totalCount && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              Certaines fonctionnalités sont actuellement désactivées par l'administrateur. 
              Contactez le support si vous avez besoin d'accéder à une fonctionnalité spécifique.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}