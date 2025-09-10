import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Organization {
  id: string;
  name: string;
  email: string;
  type: string;
  contactFirstName: string;
  contactLastName: string;
  logoUrl?: string;
  isActive: boolean;
  features: string[];
  createdAt: string;
}

const AVAILABLE_FEATURES = [
  { id: "messaging", name: "Messagerie avancée", description: "Communication avec participants et notifications" },
  { id: "analytics", name: "Analytics", description: "Statistiques détaillées et rapports avancés" },
  { id: "custom_branding", name: "Personnalisation", description: "Logo et couleurs personnalisés" },
  { id: "bulk_invite", name: "Invitations en masse", description: "Inviter plusieurs participants simultanément" },
  { id: "event_templates", name: "Modèles d'événements", description: "Réutiliser des configurations d'événements" },
  { id: "priority_support", name: "Support prioritaire", description: "Assistance dédiée et réponse rapide" },
  { id: "csv_import", name: "Import CSV/Excel", description: "Importer des listes d'emails depuis des fichiers" },
  { id: "advanced_stats", name: "Statistiques avancées", description: "Analyses poussées et tableaux de bord détaillés" },
];

export default function OrganizationsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading, error } = useQuery<Organization[]>({
    queryKey: ["/api/admin/organizations"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/organizations/${id}/status`, { isActive });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({
        title: "Statut mis à jour",
        description: `L'organisation a été ${isActive ? 'activée' : 'désactivée'} avec succès.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    },
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: async ({ id, features }: { id: string; features: string[] }) => {
      return await apiRequest("PATCH", `/api/admin/organizations/${id}/features`, { features });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      setIsFeatureModalOpen(false);
      setSelectedOrg(null);
      toast({
        title: "Fonctionnalités mises à jour",
        description: "Les fonctionnalités ont été modifiées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour les fonctionnalités.",
        variant: "destructive",
      });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({
        title: "Organisation supprimée",
        description: "L'organisation a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer l'organisation.",
        variant: "destructive",
      });
    },
  });

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${org.contactFirstName} ${org.contactLastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusToggle = (org: Organization) => {
    if (confirm(`Êtes-vous sûr de vouloir ${org.isActive ? 'désactiver' : 'activer'} l'organisation "${org.name}" ?`)) {
      updateStatusMutation.mutate({ id: org.id, isActive: !org.isActive });
    }
  };

  const handleDeleteOrg = (org: Organization) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'organisation "${org.name}" ? Cette action est irréversible.`)) {
      deleteOrgMutation.mutate(org.id);
    }
  };

  const handleUpdateFeatures = (features: string[]) => {
    if (selectedOrg) {
      updateFeaturesMutation.mutate({ id: selectedOrg.id, features });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Organisations
          </h1>
          <p className="text-gray-600">Gérez les organisations inscrites sur la plateforme.</p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-24 h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Organisations
          </h1>
          <p className="text-gray-600">Gérez les organisations inscrites sur la plateforme.</p>
        </div>
        
        <Card>
          <CardContent className="p-6 text-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <p className="text-gray-600">Erreur lors du chargement des organisations</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestion des Organisations
        </h1>
        <p className="text-gray-600">
          Gérez les organisations inscrites sur la plateforme ({organizations.length} organisation{organizations.length !== 1 ? 's' : ''}).
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
              <Input
                placeholder="Rechercher par nom, email ou contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <i className="fas fa-filter mr-2"></i>
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Organisations ({filteredOrganizations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrganizations.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fas fa-search text-gray-400 text-4xl mb-4"></i>
              <p className="text-gray-600">Aucune organisation trouvée</p>
              {searchTerm && (
                <p className="text-gray-500 text-sm">
                  Essayez de modifier votre recherche
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrganizations.map((org) => (
                <div key={org.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={org.logoUrl} alt={org.name} />
                        <AvatarFallback>
                          {org.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">{org.name}</h3>
                          <Badge variant={org.isActive ? "default" : "secondary"}>
                            {org.isActive ? "Actif" : "Inactif"}
                          </Badge>
                          <Badge variant="outline">
                            {org.type}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm">
                          {org.contactFirstName} {org.contactLastName} • {org.email}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Inscrit le {new Date(org.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                        {org.features.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {org.features.slice(0, 3).map((feature) => {
                              const featureInfo = AVAILABLE_FEATURES.find(f => f.id === feature);
                              return (
                                <Badge key={feature} variant="outline" className="text-xs">
                                  {featureInfo?.name || feature}
                                </Badge>
                              );
                            })}
                            {org.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{org.features.length - 3} autres
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Status Toggle */}
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {org.isActive ? "Actif" : "Inactif"}
                        </span>
                        <Switch
                          checked={org.isActive}
                          onCheckedChange={() => handleStatusToggle(org)}
                          disabled={updateStatusMutation.isPending}
                        />
                      </div>
                      
                      {/* Actions */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(org);
                          setIsFeatureModalOpen(true);
                        }}
                      >
                        <i className="fas fa-cog mr-2"></i>
                        Fonctionnalités
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteOrg(org)}
                        disabled={deleteOrgMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <i className="fas fa-trash mr-2"></i>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Modal */}
      {isFeatureModalOpen && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Fonctionnalités - {selectedOrg.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFeatureModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            
            <div className="space-y-4">
              {AVAILABLE_FEATURES.map((feature) => {
                const isEnabled = selectedOrg.features.includes(feature.id);
                
                return (
                  <div key={feature.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{feature.name}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                    
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        const newFeatures = checked
                          ? [...selectedOrg.features, feature.id]
                          : selectedOrg.features.filter(f => f !== feature.id);
                        handleUpdateFeatures(newFeatures);
                      }}
                      disabled={updateFeaturesMutation.isPending}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsFeatureModalOpen(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}