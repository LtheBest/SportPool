import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

interface AdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  inactiveOrganizations: number;
  totalEvents: number;
  totalParticipants: number;
  averageEventsPerOrg: number;
}

export default function AdminOverview() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vue d'ensemble - Administration
          </h1>
          <p className="text-gray-600">Statistiques générales de la plateforme.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vue d'ensemble - Administration
          </h1>
          <p className="text-gray-600">Statistiques générales de la plateforme.</p>
        </div>
        
        <Card>
          <CardContent className="p-6 text-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
            <p className="text-gray-600">Erreur lors du chargement des statistiques</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Vue d'ensemble - Administration
        </h1>
        <p className="text-gray-600">Statistiques générales de la plateforme TeamMove.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-building text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Organisations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-check-circle text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Organisations Actives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-pause-circle text-red-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Organisations Inactives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inactiveOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-alt text-purple-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Événements</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-yellow-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-line text-indigo-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Événements / Org</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageEventsPerOrg}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Santé du Système</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Statut des organisations</span>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {stats.totalOrganizations > 0 
                      ? Math.round((stats.activeOrganizations / stats.totalOrganizations) * 100)
                      : 0}% actives
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Engagement utilisateur</span>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {stats.totalOrganizations > 0 && stats.totalEvents > 0
                      ? Math.round((stats.totalParticipants / stats.totalEvents) * 100) / 100
                      : 0} participants/événement
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-eye text-blue-600"></i>
                  <span className="text-gray-700">Voir toutes les organisations</span>
                </div>
              </button>
              
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-download text-green-600"></i>
                  <span className="text-gray-700">Exporter les données</span>
                </div>
              </button>
              
              <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <i className="fas fa-chart-bar text-purple-600"></i>
                  <span className="text-gray-700">Rapport détaillé</span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}