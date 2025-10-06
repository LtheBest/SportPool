import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Loader2, 
  Trash2, 
  Search,
  XCircle,
  CheckCircle,
  Mail,
  Calendar,
  Building,
  Crown,
  AlertTriangle
} from 'lucide-react';
import { useAdminOrganizations, useDeleteOrganization } from '@/hooks/useFeatures';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Organization {
  id: string;
  name: string;
  email: string;
  contactFirstName?: string;
  contactLastName?: string;
  subscriptionType: string;
  subscriptionStatus: string;
  createdAt: string;
  role: string;
  isActive: boolean;
}

interface UserManagementAdminProps {
  className?: string;
}

export default function UserManagementAdmin({ className }: UserManagementAdminProps) {
  const { data: orgData, isLoading, error } = useAdminOrganizations();
  const deleteOrganization = useDeleteOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des organisations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des organisations. Vérifiez vos droits d'administration.
        </AlertDescription>
      </Alert>
    );
  }

  const organizations: Organization[] = orgData?.organizations || [];

  // Filtrer les organisations par terme de recherche
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (org.contactFirstName && org.contactFirstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (org.contactLastName && org.contactLastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteOrganization = async (organizationId: string) => {
    try {
      await deleteOrganization.mutateAsync(organizationId);
      setSelectedOrg(null);
    } catch (error) {
      console.error('Error deleting organization:', error);
    }
  };

  const getSubscriptionBadge = (type: string, status: string) => {
    const isActive = status === 'active';
    
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    let color = 'text-gray-600';
    
    if (type === 'decouverte') {
      variant = 'outline';
      color = 'text-blue-600';
    } else if (type.startsWith('pro_')) {
      variant = isActive ? 'default' : 'destructive';
      color = isActive ? 'text-purple-600' : 'text-red-600';
    } else if (type === 'evenementielle') {
      variant = isActive ? 'default' : 'destructive';
      color = isActive ? 'text-green-600' : 'text-red-600';
    }

    return (
      <Badge variant={variant} className={color}>
        {getSubscriptionLabel(type)} {!isActive && '(Inactif)'}
      </Badge>
    );
  };

  const getSubscriptionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'decouverte': 'Découverte',
      'evenementielle': 'Événementielle',
      'pro_club': 'Pro Club',
      'pro_pme': 'Pro PME',
      'pro_entreprise': 'Pro Entreprise'
    };
    return labels[type] || type;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-red-100 text-red-800">
          <Crown className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <Building className="h-3 w-3 mr-1" />
        Organisation
      </Badge>
    );
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <CardTitle>Gestion des Utilisateurs</CardTitle>
            </div>
            <Badge variant="secondary">
              {organizations.length} organisation{organizations.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barre de recherche */}
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom, email, ou contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
              >
                Effacer
              </Button>
            )}
          </div>

          {/* Liste des organisations */}
          <div className="space-y-4">
            {filteredOrganizations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'Aucune organisation trouvée' : 'Aucune organisation'}
              </div>
            ) : (
              filteredOrganizations.map(org => (
                <Card key={org.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(org.isActive)}
                        <h4 className="font-medium">{org.name}</h4>
                        {getRoleBadge(org.role)}
                        {getSubscriptionBadge(org.subscriptionType, org.subscriptionStatus)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{org.email}</span>
                        </div>
                        
                        {(org.contactFirstName || org.contactLastName) && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>
                              {org.contactFirstName} {org.contactLastName}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Créé {formatDistanceToNow(new Date(org.createdAt), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {org.role !== 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setSelectedOrg(org)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Supprimer l'organisation
                              </AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>
                                  Êtes-vous sûr de vouloir supprimer l'organisation <strong>{org.name}</strong> ?
                                </p>
                                <p className="text-red-600 font-medium">
                                  ⚠️ Cette action est irréversible et supprimera :
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  <li>Toutes les informations de l'organisation</li>
                                  <li>Tous les événements créés</li>
                                  <li>L'historique des participants</li>
                                  <li>Tous les messages et communications</li>
                                  <li>Les données de facturation</li>
                                </ul>
                                <p className="text-sm text-gray-600">
                                  Un email de confirmation sera envoyé à l'organisation.
                                </p>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrganization(org.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteOrganization.isPending}
                              >
                                {deleteOrganization.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Suppression...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer définitivement
                                  </>
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}