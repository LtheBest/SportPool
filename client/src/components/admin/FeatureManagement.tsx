import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Shield, 
  Users, 
  Palette, 
  MessageSquare, 
  BarChart, 
  Eye, 
  EyeOff,
  Save,
  RotateCcw
} from "lucide-react";

interface GlobalFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  icon?: string;
  isPremiumOnly: boolean;
}

interface FeatureSettings {
  darkMode: boolean;
  userDeleteEvents: boolean;
  organizerDeleteEvents: boolean;
  guestMode: boolean;
  publicRegistration: boolean;
  emailNotifications: boolean;
  csvImport: boolean;
  bulkInvite: boolean;
  analytics: boolean;
  customBranding: boolean;
}

const FEATURE_ICONS: Record<string, any> = {
  messaging: MessageSquare,
  analytics: BarChart,
  custom_branding: Palette,
  bulk_invite: Users,
  event_templates: Settings,
  priority_support: Shield,
  csv_import: Settings,
  advanced_stats: BarChart,
};

export default function FeatureManagement() {
  const [settings, setSettings] = useState<FeatureSettings>({
    darkMode: true,
    userDeleteEvents: true,
    organizerDeleteEvents: true,
    guestMode: true,
    publicRegistration: true,
    emailNotifications: true,
    csvImport: true,
    bulkInvite: true,
    analytics: true,
    customBranding: true,
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les paramètres actuels
  const { data: currentSettings, isLoading, error } = useQuery<FeatureSettings>({
    queryKey: ["/api/admin/features/settings"],
  });

  // Récupérer la liste des fonctionnalités globales
  const { data: globalFeatures = [], isLoading: loadingFeatures } = useQuery<GlobalFeature[]>({
    queryKey: ["/api/admin/features"],
  });

  // Mutation pour sauvegarder les paramètres
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: FeatureSettings) => {
      return await apiRequest("PUT", "/api/admin/features/settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/features/settings"] });
      setIsDirty(false);
      toast({
        title: "Paramètres sauvegardés",
        description: "Les paramètres des fonctionnalités ont été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de sauvegarde",
        description: error?.message || "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour activer/désactiver une fonctionnalité globale
  const toggleFeatureMutation = useMutation({
    mutationFn: async ({ featureId, isActive }: { featureId: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/features/${featureId}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/features"] });
      toast({
        title: "Fonctionnalité mise à jour",
        description: "Le statut de la fonctionnalité a été modifié avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de modifier la fonctionnalité.",
        variant: "destructive",
      });
    },
  });

  // Initialiser les paramètres quand ils sont chargés
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
      setIsDirty(false);
    }
  }, [currentSettings]);

  const handleSettingChange = (key: keyof FeatureSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleReset = () => {
    if (currentSettings) {
      setSettings(currentSettings);
      setIsDirty(false);
    }
  };

  const handleToggleGlobalFeature = (featureId: string, currentStatus: boolean) => {
    toggleFeatureMutation.mutate({ featureId, isActive: !currentStatus });
  };

  if (isLoading || loadingFeatures) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Fonctionnalités
          </h1>
          <p className="text-gray-600">Contrôlez les fonctionnalités disponibles sur la plateforme.</p>
        </div>
        
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <Alert variant="destructive">
          <AlertDescription>
            Erreur lors du chargement des paramètres des fonctionnalités.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestion des Fonctionnalités
        </h1>
        <p className="text-gray-600">
          Contrôlez quelles fonctionnalités sont disponibles pour les utilisateurs.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Fonctionnalités Utilisateur */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Fonctionnalités Utilisateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Mode Sombre / Clair</h4>
                <p className="text-sm text-gray-600">
                  Permettre aux utilisateurs de basculer entre thème sombre et clair
                </p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Suppression d'événements (Utilisateurs)</h4>
                <p className="text-sm text-gray-600">
                  Permettre aux utilisateurs de supprimer leurs événements créés
                </p>
              </div>
              <Switch
                checked={settings.userDeleteEvents}
                onCheckedChange={(checked) => handleSettingChange('userDeleteEvents', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Suppression d'événements (Organisateurs)</h4>
                <p className="text-sm text-gray-600">
                  Permettre aux organisateurs de supprimer leurs événements créés
                </p>
              </div>
              <Switch
                checked={settings.organizerDeleteEvents}
                onCheckedChange={(checked) => handleSettingChange('organizerDeleteEvents', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Mode Invité</h4>
                <p className="text-sm text-gray-600">
                  Permettre l'accès en mode invité sans inscription
                </p>
              </div>
              <Switch
                checked={settings.guestMode}
                onCheckedChange={(checked) => handleSettingChange('guestMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Inscription Publique</h4>
                <p className="text-sm text-gray-600">
                  Permettre les inscriptions publiques sans invitation admin
                </p>
              </div>
              <Switch
                checked={settings.publicRegistration}
                onCheckedChange={(checked) => handleSettingChange('publicRegistration', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités Premium */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Fonctionnalités Premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Notifications Email</h4>
                <p className="text-sm text-gray-600">
                  Système de notifications par email automatiques
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Import CSV</h4>
                <p className="text-sm text-gray-600">
                  Import de listes d'invités via fichiers CSV
                </p>
              </div>
              <Switch
                checked={settings.csvImport}
                onCheckedChange={(checked) => handleSettingChange('csvImport', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Invitations en Masse</h4>
                <p className="text-sm text-gray-600">
                  Envoyer des invitations à plusieurs personnes simultanément
                </p>
              </div>
              <Switch
                checked={settings.bulkInvite}
                onCheckedChange={(checked) => handleSettingChange('bulkInvite', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Analytics Avancées</h4>
                <p className="text-sm text-gray-600">
                  Statistiques détaillées et rapports d'utilisation
                </p>
              </div>
              <Switch
                checked={settings.analytics}
                onCheckedChange={(checked) => handleSettingChange('analytics', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Personnalisation Avancée</h4>
                <p className="text-sm text-gray-600">
                  Logos, couleurs et branding personnalisés
                </p>
              </div>
              <Switch
                checked={settings.customBranding}
                onCheckedChange={(checked) => handleSettingChange('customBranding', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités Globales par Organisation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Fonctionnalités par Organisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {globalFeatures.map((feature) => {
                const IconComponent = FEATURE_ICONS[feature.id] || Settings;
                return (
                  <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{feature.name}</h4>
                          {feature.isPremiumOnly && (
                            <Badge variant="secondary" className="text-xs">Premium</Badge>
                          )}
                          <Badge variant={feature.isActive ? "default" : "secondary"} className="text-xs">
                            {feature.isActive ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                            {feature.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                        <span className="text-xs text-gray-500">Catégorie: {feature.category}</span>
                      </div>
                    </div>
                    <Switch
                      checked={feature.isActive}
                      onCheckedChange={() => handleToggleGlobalFeature(feature.id, feature.isActive)}
                      disabled={toggleFeatureMutation.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isDirty && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Alert>
                  <AlertDescription>
                    Vous avez des modifications non sauvegardées.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saveSettingsMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveSettingsMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}