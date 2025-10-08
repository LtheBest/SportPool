// client/src/components/admin/AccountManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users,
  Search,
  Trash2,
  Pause,
  Play,
  Eye,
  Calendar,
  Mail,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  email: string;
  planType: string;
  subscriptionStatus: string;
  createdAt: string;
  lastActivity?: string;
  eventCount: number;
  status: 'active' | 'inactive' | 'suspended' | 'expired' | 'expiring_soon';
  suspendedAt?: string;
  suspensionReason?: string;
}

interface AccountStats {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  expiredAccounts: number;
  newAccountsThisMonth: number;
  totalEvents: number;
  totalInvitations: number;
}

// Configuration des statuts
const STATUS_CONFIG = {
  active: { 
    label: 'Actif', 
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle 
  },
  inactive: { 
    label: 'Inactif', 
    color: 'bg-gray-100 text-gray-800',
    icon: Pause 
  },
  suspended: { 
    label: 'Suspendu', 
    color: 'bg-red-100 text-red-800',
    icon: AlertTriangle 
  },
  expired: { 
    label: 'Expiré', 
    color: 'bg-orange-100 text-orange-800',
    icon: Clock 
  },
  expiring_soon: { 
    label: 'Expire bientôt', 
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle 
  }
};

// Configuration des plans
const PLAN_CONFIG = {
  decouverte: { label: 'Découverte', color: 'bg-blue-100 text-blue-800' },
  evenementielle: { label: 'Événementielle', color: 'bg-green-100 text-green-800' },
  pro_club: { label: 'Pro Club', color: 'bg-purple-100 text-purple-800' },
  pro_pme: { label: 'Pro PME', color: 'bg-orange-100 text-orange-800' },
  pro_entreprise: { label: 'Pro Entreprise', color: 'bg-red-100 text-red-800' }
};

export function AccountManagement() {
  const [accounts, setAccounts] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Organization | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Charger les données
  useEffect(() => {
    loadAccounts();
    loadStats();
  }, [currentPage, searchTerm, selectedPlan, selectedStatus]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        planType: selectedPlan,
        status: selectedStatus
      });

      const response = await fetch(`/api/admin/accounts?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.organizations || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        throw new Error('Erreur lors du chargement des comptes');
      }
    } catch (error: any) {
      console.error('Load accounts error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/accounts/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error: any) {
      console.error('Load stats error:', error);
    }
  };

  // Supprimer un compte
  const deleteAccount = async () => {
    if (!selectedAccount) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/accounts/${selectedAccount.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason: actionReason })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowDeleteDialog(false);
        setSelectedAccount(null);
        setActionReason('');
        loadAccounts();
        loadStats();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Suspendre un compte
  const suspendAccount = async () => {
    if (!selectedAccount) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/accounts/${selectedAccount.id}/suspend`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason: actionReason })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowSuspendDialog(false);
        setSelectedAccount(null);
        setActionReason('');
        loadAccounts();
        loadStats();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Suspend account error:', error);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Réactiver un compte
  const reactivateAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/admin/accounts/${accountId}/reactivate`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        loadAccounts();
        loadStats();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error: any) {
      console.error('Reactivate account error:', error);
      toast.error(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return null;

    const IconComponent = config.icon;
    return (
      <Badge className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const config = PLAN_CONFIG[planType as keyof typeof PLAN_CONFIG];
    if (!config) return <Badge>{planType}</Badge>;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Gestion des Comptes Utilisateurs
        </h2>
        <p className="text-gray-600">
          Gérez les comptes utilisateurs et organisateurs de la plateforme
        </p>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Actifs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Suspendus</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.suspendedAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expirés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.expiredAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Nouveaux</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.newAccountsThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Événements</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-pink-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Invitations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalInvitations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un compte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              className="p-2 border rounded-md"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
            >
              <option value="">Tous les plans</option>
              {Object.entries(PLAN_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              className="p-2 border rounded-md"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setSelectedPlan('');
                setSelectedStatus('');
                setCurrentPage(1);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des comptes */}
      <Card>
        <CardHeader>
          <CardTitle>Comptes Utilisateurs ({accounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Chargement...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center p-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun compte trouvé
              </h3>
              <p className="text-gray-600">
                Aucun compte ne correspond à vos critères de recherche.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{account.name}</h4>
                      {getStatusBadge(account.status)}
                      {getPlanBadge(account.planType)}
                      {account.planType !== 'decouverte' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {account.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {account.eventCount} événements
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>Créé: {formatDate(account.createdAt)}</span>
                        {account.lastActivity && (
                          <span>Dernière activité: {formatDate(account.lastActivity)}</span>
                        )}
                      </div>
                      {account.suspensionReason && (
                        <div className="text-red-600">
                          <strong>Suspendu:</strong> {account.suspensionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {account.status === 'suspended' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reactivateAccount(account.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Réactiver
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowSuspendDialog(true);
                        }}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Suspendre
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAccount(account);
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Précédent
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages}
              </span>
              
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Supprimer le compte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <strong>Attention !</strong> Cette action est irréversible. 
                Toutes les données du compte seront définitivement supprimées.
              </AlertDescription>
            </Alert>

            {selectedAccount && (
              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-medium">{selectedAccount.name}</h4>
                <p className="text-sm text-gray-600">{selectedAccount.email}</p>
                <p className="text-sm text-gray-600">{selectedAccount.eventCount} événements créés</p>
              </div>
            )}

            <div>
              <Label htmlFor="delete-reason">Motif de suppression</Label>
              <Textarea
                id="delete-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Indiquez le motif de suppression..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={processing}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={deleteAccount}
                disabled={processing}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de suspension */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-yellow-600">
              Suspendre le compte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAccount && (
              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-medium">{selectedAccount.name}</h4>
                <p className="text-sm text-gray-600">{selectedAccount.email}</p>
              </div>
            )}

            <div>
              <Label htmlFor="suspend-reason">Motif de suspension</Label>
              <Textarea
                id="suspend-reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Indiquez le motif de suspension..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSuspendDialog(false)}
                disabled={processing}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={suspendAccount}
                disabled={processing}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suspension...
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Suspendre
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}