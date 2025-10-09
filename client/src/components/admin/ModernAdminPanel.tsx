import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  BarChart3, 
  Settings,
  Trash2,
  UserX,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

// Types
interface AdminFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'ui' | 'functionality' | 'communication' | 'system';
  requiresRestart: boolean;
}

interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  events: {
    total: number;
    thisMonth: number;
  };
  subscriptions: {
    decouverte: number;
    evenementielle: number;
    pro: number;
  };
  features: AdminFeature[];
}

interface UserManagement {
  id: string;
  name: string;
  email: string;
  type: string;
  subscriptionType: string;
  isActive: boolean;
  createdAt: string;
}

export default function ModernAdminPanel() {
  const { organization } = useAuth();
  
  // État local
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [features, setFeatures] = useState<AdminFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Vérification des droits d'admin
  const isAdmin = organization?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  // Charger toutes les données d'administration
  const loadAdminData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadFeatures()
      ]);
    } catch (error) {
      console.error('Erreur chargement données admin:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  // Charger les utilisateurs (simulé - à adapter selon votre API)
  const loadUsers = async () => {
    try {
      // Cette route devrait être créée dans votre API
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Erreur utilisateurs:', error);
      // Mock data en attendant l'API
      setUsers([]);
    }
  };

  // Charger les fonctionnalités
  const loadFeatures = async () => {
    try {
      const response = await fetch('/api/admin/features', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.data);
      }
    } catch (error) {
      console.error('Erreur fonctionnalités:', error);
    }
  };

  // Activer/désactiver une fonctionnalité
  const handleToggleFeature = async (featureId: string, enabled: boolean) => {
    try {
      setProcessingAction(featureId);

      const response = await fetch(`/api/admin/features/${featureId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        toast.success(`Fonctionnalité ${enabled ? 'activée' : 'désactivée'}`);
        await loadFeatures(); // Recharger
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      console.error('Erreur toggle feature:', error);
      toast.error(error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  // Désactiver/réactiver un utilisateur
  const handleToggleUserActivation = async (userId: string, active: boolean, userType: string) => {
    const action = active ? 'réactiver' : 'désactiver';
    
    if (!confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)) {
      return;
    }

    const reason = active ? undefined : prompt('Motif de la désactivation :');
    if (!active && !reason) {
      return;
    }

    try {
      setProcessingAction(userId);

      const response = await fetch(`/api/admin/users/${userId}/toggle-activation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userType, 
          active, 
          reason 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.data.message);
        await loadUsers(); // Recharger
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la modification');
      }
    } catch (error: any) {
      console.error('Erreur toggle user:', error);
      toast.error(error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async (userId: string, userName: string, userType: string) => {
    if (!confirm(`⚠️ ATTENTION : Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT l'utilisateur "${userName}". Cette action est IRRÉVERSIBLE.\n\nTapez "SUPPRIMER" pour confirmer :`)) {
      return;
    }

    const confirmation = prompt('Tapez "SUPPRIMER" pour confirmer la suppression définitive :');
    if (confirmation !== 'SUPPRIMER') {
      toast.error('Suppression annulée - confirmation incorrecte');
      return;
    }

    const reason = prompt('Motif de la suppression (obligatoire) :');
    if (!reason || reason.trim().length < 5) {
      toast.error('Un motif de suppression est obligatoire (minimum 5 caractères)');
      return;
    }

    try {
      setProcessingAction(userId);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          userType, 
          reason: reason.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Utilisateur supprimé. ${data.data.emailSent ? 'Email de confirmation envoyé.' : 'Erreur envoi email.'}`);
        await loadUsers(); // Recharger
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression user:', error);
      toast.error(error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  // Obtenir l'icône selon la catégorie de fonctionnalité
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ui':
        return <Eye className="w-4 h-4" />;
      case 'functionality':
        return <Settings className="w-4 h-4" />;
      case 'communication':
        return <Mail className="w-4 h-4" />;
      case 'system':
        return <Shield className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  // Obtenir le badge selon le statut utilisateur
  const getUserStatusBadge = (user: UserManagement) => {
    if (user.isActive) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Actif</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactif</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Accès refusé. Cette section est réservée aux administrateurs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Administration TeamMove
        </h1>
        <p className="text-gray-600">
          Gestion des utilisateurs, fonctionnalités et statistiques de la plateforme
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Fonctionnalités
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Système
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.users.active} actifs, {stats.users.inactive} inactifs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Événements</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.events.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.events.thisMonth} ce mois
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements Pro</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.subscriptions.pro}</div>
                  <p className="text-xs text-muted-foreground">
                    Plans payants actifs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Plans Découverte</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.subscriptions.decouverte}</div>
                  <p className="text-xs text-muted-foreground">
                    Comptes gratuits
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Répartition des abonnements</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Découverte (Gratuit)</span>
                    <span className="font-bold">{stats.subscriptions.decouverte}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Événementielle</span>
                    <span className="font-bold">{stats.subscriptions.evenementielle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pro (Abonnements)</span>
                    <span className="font-bold">{stats.subscriptions.pro}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des utilisateurs */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-gray-500">Aucun utilisateur trouvé ou fonctionnalité en développement</p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{user.name}</h4>
                          {getUserStatusBadge(user)}
                          <Badge variant="outline">{user.subscriptionType}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Créé le {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={user.isActive ? "outline" : "default"}
                          onClick={() => handleToggleUserActivation(user.id, !user.isActive, user.type)}
                          disabled={processingAction === user.id}
                        >
                          {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id, user.name, user.type)}
                          disabled={processingAction === user.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gestion des fonctionnalités */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fonctionnalités de la Plateforme</CardTitle>
              <p className="text-sm text-gray-600">
                Activez ou désactivez les fonctionnalités disponibles pour vos utilisateurs
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3 flex-1">
                      {getCategoryIcon(feature.category)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{feature.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {feature.category}
                          </Badge>
                          {feature.requiresRestart && (
                            <Badge variant="secondary" className="text-xs">
                              Redémarrage requis
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleFeature(feature.id, !feature.enabled)}
                      disabled={processingAction === feature.id}
                      className={feature.enabled ? 'text-green-700 border-green-300' : 'text-gray-700'}
                    >
                      {feature.enabled ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      {feature.enabled ? 'Activée' : 'Désactivée'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Informations système */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Système</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Version de l'application</span>
                  <Badge>2.0.0</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Environnement</span>
                  <Badge variant={process.env.NODE_ENV === 'production' ? 'default' : 'secondary'}>
                    {process.env.NODE_ENV || 'development'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Base de données</span>
                  <Badge variant="default">PostgreSQL</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Service Email</span>
                  <Badge variant="default">SendGrid</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention :</strong> Les actions d'administration peuvent affecter l'expérience de tous les utilisateurs. 
              Assurez-vous de comprendre l'impact de vos modifications avant de les appliquer.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}