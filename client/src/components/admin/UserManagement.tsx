import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  UserX, 
  Mail, 
  Calendar,
  Filter,
  Trash2,
  AlertTriangle,
  User,
  Building
} from "lucide-react";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  type: 'user' | 'organizer' | 'admin';
  contactFirstName: string;
  contactLastName: string;
  logoUrl?: string;
  isActive: boolean;
  planType: string;
  createdAt: string;
  lastLoginAt?: string;
  eventsCount: number;
  features: string[];
}

type FilterType = 'all' | 'users' | 'organizers' | 'active' | 'inactive' | 'admin';

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery<UserAccount[]>({
    queryKey: ["/api/admin/users"],
  });

  // Mutation pour activer/désactiver un utilisateur
  const toggleUserMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/users/${id}/status`, { isActive });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Statut mis à jour",
        description: `L'utilisateur a été ${isActive ? 'activé' : 'désactivé'} avec succès.`,
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

  // Mutation pour supprimer un utilisateur
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès. Un email de confirmation lui a été envoyé.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de suppression",
        description: error?.message || "Impossible de supprimer l'utilisateur.",
        variant: "destructive",
      });
    },
  });

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.contactFirstName} ${user.contactLastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filterType) {
      case 'users':
        return user.type === 'user';
      case 'organizers':
        return user.type === 'organizer';
      case 'admin':
        return user.type === 'admin';
      case 'active':
        return user.isActive;
      case 'inactive':
        return !user.isActive;
      default:
        return true;
    }
  });

  const handleToggleUser = (user: UserAccount) => {
    if (user.type === 'admin') {
      toast({
        title: "Action interdite",
        description: "Impossible de désactiver un compte administrateur.",
        variant: "destructive",
      });
      return;
    }
    
    toggleUserMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  const handleDeleteUser = (user: UserAccount) => {
    if (user.type === 'admin') {
      toast({
        title: "Action interdite",
        description: "Impossible de supprimer un compte administrateur.",
        variant: "destructive",
      });
      return;
    }

    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  const getStatusBadge = (user: UserAccount) => {
    if (user.type === 'admin') {
      return <Badge variant="default" className="bg-purple-100 text-purple-800">Admin</Badge>;
    }
    return (
      <Badge variant={user.isActive ? "default" : "secondary"}>
        {user.isActive ? 'Actif' : 'Inactif'}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'admin':
        return <User className="w-4 h-4 text-purple-600" />;
      case 'organizer':
        return <Building className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Utilisateurs
          </h1>
          <p className="text-gray-600">Gérez tous les comptes utilisateurs et organisateurs.</p>
        </div>
        
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
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
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Erreur lors du chargement des utilisateurs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestion des Utilisateurs
        </h1>
        <p className="text-gray-600">
          Gérez tous les comptes utilisateurs et organisateurs de la plateforme.
        </p>
      </div>

      {/* Filtres et recherche */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher par nom, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les comptes</SelectItem>
                  <SelectItem value="users">Utilisateurs</SelectItem>
                  <SelectItem value="organizers">Organisateurs</SelectItem>
                  <SelectItem value="admin">Administrateurs</SelectItem>
                  <SelectItem value="active">Comptes actifs</SelectItem>
                  <SelectItem value="inactive">Comptes inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{users.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Actifs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {users.filter(u => u.type === 'organizer').length}
            </div>
            <div className="text-sm text-gray-600">Organisateurs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.type === 'admin').length}
            </div>
            <div className="text-sm text-gray-600">Admins</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des utilisateurs */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.logoUrl} />
                    <AvatarFallback>
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(user.type)}
                      <h3 className="font-semibold">{user.name}</h3>
                      {getStatusBadge(user)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {user.eventsCount} événements
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Inscrit le {new Date(user.createdAt).toLocaleDateString()}
                        {user.lastLoginAt && (
                          <span> • Dernière connexion: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {user.planType}
                  </Badge>
                  
                  {user.type !== 'admin' && (
                    <>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleUser(user)}
                        disabled={toggleUserMutation.isPending}
                      />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteUserMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
            <p className="text-gray-600">
              {searchTerm ? 
                "Aucun utilisateur ne correspond à votre recherche." :
                "Aucun utilisateur ne correspond aux filtres sélectionnés."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte de{' '}
              <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) ?
              
              <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-sm text-yellow-800">
                  <strong>⚠️ Cette action est irréversible !</strong>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Tous les événements créés par cet utilisateur seront supprimés</li>
                    <li>L'historique des participations sera perdu</li>
                    <li>Un email de confirmation sera envoyé à l'utilisateur</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}