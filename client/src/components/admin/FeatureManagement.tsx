// client/src/components/admin/FeatureManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { 
  Settings,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  updatedAt: string;
  updatedBy?: string;
}

// Mappage des catégories avec leurs icônes et couleurs
const CATEGORY_CONFIG = {
  interface: { 
    label: 'Interface', 
    color: 'bg-blue-100 text-blue-800', 
    icon: '🎨' 
  },
  events: { 
    label: 'Événements', 
    color: 'bg-green-100 text-green-800', 
    icon: '📅' 
  },
  profile: { 
    label: 'Profil', 
    color: 'bg-purple-100 text-purple-800', 
    icon: '👤' 
  },
  notifications: { 
    label: 'Notifications', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: '🔔' 
  },
  messaging: { 
    label: 'Messagerie', 
    color: 'bg-pink-100 text-pink-800', 
    icon: '💬' 
  },
  support: { 
    label: 'Support', 
    color: 'bg-orange-100 text-orange-800', 
    icon: '🆘' 
  },
  auth: { 
    label: 'Authentification', 
    color: 'bg-red-100 text-red-800', 
    icon: '🔐' 
  },
  subscription: { 
    label: 'Abonnements', 
    color: 'bg-indigo-100 text-indigo-800', 
    icon: '💳' 
  }
};

export function FeatureManagement() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFeature, setNewFeature] = useState({
    id: '',
    name: '',
    description: '',
    category: 'interface',
    enabled: true
  });

  // Charger les fonctionnalités
  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/features', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setFeatures(data.features || []);
        setCategories(data.categories || []);
      } else {
        throw new Error('Erreur lors du chargement des fonctionnalités');
      }
    } catch (error: any) {
      console.error('Load features error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Activer/désactiver une fonctionnalité
  const toggleFeature = async (featureId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/features/${featureId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        
        // Mettre à jour localement
        setFeatures(prev => 
          prev.map(f => 
            f.id === featureId ? { ...f, enabled, updatedAt: new Date().toISOString() } : f
          )
        );
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Toggle feature error:', error);
      toast.error(error.message);
    }
  };

  // Créer une nouvelle fonctionnalité
  const createFeature = async () => {
    try {
      if (!newFeature.id || !newFeature.name || !newFeature.category) {
        toast.error('Veuillez remplir tous les champs requis');
        return;
      }

      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newFeature)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowCreateDialog(false);
        setNewFeature({
          id: '',
          name: '',
          description: '',
          category: 'interface',
          enabled: true
        });
        loadFeatures(); // Recharger la liste
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Create feature error:', error);
      toast.error(error.message);
    }
  };

  // Supprimer une fonctionnalité
  const deleteFeature = async (featureId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette fonctionnalité ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/features/${featureId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setFeatures(prev => prev.filter(f => f.id !== featureId));
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Delete feature error:', error);
      toast.error(error.message);
    }
  };

  // Exporter la configuration
  const exportConfiguration = async () => {
    try {
      const response = await fetch('/api/admin/features/export', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.configuration, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `features-config-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast.success('Configuration exportée avec succès');
      } else {
        throw new Error('Erreur lors de l\'export');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message);
    }
  };

  // Réinitialiser aux valeurs par défaut
  const resetToDefaults = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser toutes les fonctionnalités aux valeurs par défaut ?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/features/reset-defaults', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadFeatures();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(error.message);
    }
  };

  // Filtrer les fonctionnalités
  const filteredFeatures = features.filter(feature => {
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Grouper par catégorie
  const featuresByCategory = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Chargement des fonctionnalités...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Gestion des Fonctionnalités
          </h2>
          <p className="text-gray-600">
            Activez ou désactivez les fonctionnalités de l'application
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Fonctionnalité
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle fonctionnalité</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="feature-id">ID de la fonctionnalité *</Label>
                  <Input
                    id="feature-id"
                    value={newFeature.id}
                    onChange={(e) => setNewFeature(prev => ({
                      ...prev,
                      id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                    }))}
                    placeholder="ex: nouvelle_fonctionnalite"
                  />
                </div>
                <div>
                  <Label htmlFor="feature-name">Nom *</Label>
                  <Input
                    id="feature-name"
                    value={newFeature.name}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom de la fonctionnalité"
                  />
                </div>
                <div>
                  <Label htmlFor="feature-description">Description</Label>
                  <Textarea
                    id="feature-description"
                    value={newFeature.description}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description de la fonctionnalité"
                  />
                </div>
                <div>
                  <Label htmlFor="feature-category">Catégorie *</Label>
                  <select
                    id="feature-category"
                    className="w-full p-2 border rounded-md"
                    value={newFeature.category}
                    onChange={(e) => setNewFeature(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.icon} {config.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newFeature.enabled}
                    onCheckedChange={(checked) => setNewFeature(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label>Activée par défaut</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createFeature} className="flex-1">
                    Créer
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>

          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher une fonctionnalité..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="p-2 border rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(category => {
                const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                return (
                  <option key={category} value={category}>
                    {config?.icon} {config?.label || category}
                  </option>
                );
              })}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des fonctionnalités */}
      <div className="space-y-6">
        {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          
          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{config?.icon}</span>
                  <span>{config?.label || category}</span>
                  <Badge variant="outline" className="ml-2">
                    {categoryFeatures.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{feature.name}</h4>
                        <Badge 
                          className={config?.color}
                          variant="outline"
                        >
                          {feature.id}
                        </Badge>
                        {feature.enabled ? (
                          <Badge className="bg-green-100 text-green-800">
                            <Eye className="w-3 h-3 mr-1" />
                            Activée
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Désactivée
                          </Badge>
                        )}
                      </div>
                      {feature.description && (
                        <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        Mis à jour: {new Date(feature.updatedAt).toLocaleString('fr-FR')}
                        {feature.updatedBy && ` par ${feature.updatedBy}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={(checked) => toggleFeature(feature.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFeature(feature.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <Card>
          <CardContent className="text-center p-8">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune fonctionnalité trouvée
            </h3>
            <p className="text-gray-600">
              Aucune fonctionnalité ne correspond à vos critères de recherche.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}