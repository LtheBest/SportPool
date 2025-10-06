import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Loader2, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Palette,
  MessageSquare,
  Calendar,
  User,
  CreditCard,
  HelpCircle,
  BarChart
} from 'lucide-react';
import { useAdminFeatures, useUpdateFeature, useRefreshFeatures, FeatureToggle } from '@/hooks/useFeatures';
import { toast } from 'sonner';

interface FeatureTogglesAdminProps {
  className?: string;
}

export default function FeatureTogglesAdmin({ className }: FeatureTogglesAdminProps) {
  const { data: featuresData, isLoading, error } = useAdminFeatures();
  const updateFeature = useUpdateFeature();
  const refreshFeatures = useRefreshFeatures();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des features...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des features. Vérifiez vos droits d'administration.
        </AlertDescription>
      </Alert>
    );
  }

  const features: FeatureToggle[] = featuresData?.features || [];
  const categories: string[] = featuresData?.categories || [];

  // Filtrer les features par catégorie
  const filteredFeatures = selectedCategory === 'all' 
    ? features 
    : features.filter(f => f.category === selectedCategory);

  // Grouper les features par catégorie
  const featuresByCategory = features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureToggle[]>);

  const handleToggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    try {
      await updateFeature.mutateAsync({
        featureKey,
        isEnabled: !currentEnabled
      });
    } catch (error) {
      console.error('Error toggling feature:', error);
    }
  };

  const handleRefreshCache = async () => {
    try {
      await refreshFeatures.mutateAsync();
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      ui: <Palette className="h-4 w-4" />,
      events: <Calendar className="h-4 w-4" />,
      profile: <User className="h-4 w-4" />,
      communication: <MessageSquare className="h-4 w-4" />,
      subscription: <CreditCard className="h-4 w-4" />,
      support: <HelpCircle className="h-4 w-4" />,
      analytics: <BarChart className="h-4 w-4" />,
      general: <Settings className="h-4 w-4" />
    };
    
    return icons[category] || <Settings className="h-4 w-4" />;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      ui: 'Interface',
      events: 'Événements',
      profile: 'Profil',
      communication: 'Communication',
      subscription: 'Abonnements',
      support: 'Support',
      analytics: 'Analytics',
      general: 'Général'
    };
    
    return labels[category] || category;
  };

  const getFeatureStatusColor = (isEnabled: boolean) => {
    return isEnabled ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6" />
              <CardTitle>Gestion des Fonctionnalités</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshCache}
              disabled={refreshFeatures.isPending}
            >
              {refreshFeatures.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="all">Toutes</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                  {getCategoryIcon(category)}
                  <span className="hidden sm:inline">{getCategoryLabel(category)}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid gap-6">
                {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <h3 className="text-lg font-semibold">{getCategoryLabel(category)}</h3>
                      <Badge variant="secondary">
                        {categoryFeatures.length} feature{categoryFeatures.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {categoryFeatures.map(feature => (
                        <FeatureToggleCard
                          key={feature.id}
                          feature={feature}
                          onToggle={handleToggleFeature}
                          isUpdating={updateFeature.isPending}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <h3 className="text-lg font-semibold">{getCategoryLabel(category)}</h3>
                    <Badge variant="secondary">
                      {featuresByCategory[category]?.length || 0} feature{(featuresByCategory[category]?.length || 0) > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {featuresByCategory[category]?.map(feature => (
                      <FeatureToggleCard
                        key={feature.id}
                        feature={feature}
                        onToggle={handleToggleFeature}
                        isUpdating={updateFeature.isPending}
                      />
                    )) || (
                      <p className="text-gray-500 text-center py-8">
                        Aucune feature dans cette catégorie
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant pour une feature toggle individuelle
function FeatureToggleCard({ 
  feature, 
  onToggle, 
  isUpdating 
}: {
  feature: FeatureToggle;
  onToggle: (featureKey: string, currentEnabled: boolean) => Promise<void>;
  isUpdating: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium">{feature.featureName}</h4>
            <Badge 
              variant={feature.isEnabled ? 'default' : 'secondary'}
              className={feature.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
            >
              {feature.isEnabled ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Activée
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Désactivée
                </>
              )}
            </Badge>
          </div>
          {feature.description && (
            <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <code className="bg-gray-100 px-2 py-1 rounded">{feature.featureKey}</code>
            <span>•</span>
            <span>Catégorie: {feature.category}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Switch
            checked={feature.isEnabled}
            onCheckedChange={() => onToggle(feature.featureKey, feature.isEnabled)}
            disabled={isUpdating}
          />
          {feature.isEnabled ? (
            <ToggleRight className="h-5 w-5 text-green-600" />
          ) : (
            <ToggleLeft className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
    </Card>
  );
}