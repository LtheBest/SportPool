import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStats } from "@/contexts/StatsContext";
import { useFeatures, AVAILABLE_FEATURES, FeatureGuard } from "@/hooks/useFeatures";
import { CsvImportModal } from "@/components/import/CsvImportModal";
import { FeatureStatus } from "@/components/dashboard/FeatureStatus";
import type { Event } from "@shared/schema";
import { useEffect, useState } from "react";

interface DashboardStats {
  // Selon besoins utilisateur
  activeEvents: number; // Total événements créés par l'organisateur  
  totalParticipants: number; // Total participants (passagers + conducteurs)
  totalDrivers: number; // Total conducteurs
  availableSeats: number; // Places disponibles (sièges totaux - occupés)
  
  // Statistiques détaillées
  totalEventsCreated?: number;
  activeEventsCount?: number; 
  completedEventsCount?: number;
  totalSeats?: number;
  occupiedSeats?: number;
  activeEventStats?: {
    participants: number;
    drivers: number;
    seats: number;
    occupiedSeats: number;
  };
}

export default function Overview() {
  const { organization } = useAuth();
  const { hasFeature } = useFeatures();
  const [showCsvImport, setShowCsvImport] = useState(false);
  
  // Use the real-time stats context
  const { stats, isLoading: statsLoading, error: statsError, refreshStats } = useStats();

  const { data: events = [], refetch: refetchEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Auto-refresh stats when component mounts - now handled by StatsContext
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats();
      refetchEvents();
    }, 15000); // Refetch every 15 seconds

    return () => clearInterval(interval);
  }, [refreshStats, refetchEvents]);
  
  // Debug des erreurs
  useEffect(() => {
    if (statsError) {
      console.error('❌ Erreur lors du chargement des statistiques:', statsError);
    }
  }, [statsError]);

  const recentEvents = events.slice(0, 2);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bienvenue, {organization?.name}
        </h1>
        <p className="text-gray-600">Gérez vos événements et covoiturages en un coup d'œil.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-plus text-primary"></i>
              </div>
              <div className="ml-4">
                <p className="text-muted-foreground text-sm">Événements créés</p>
                <p className="text-2xl font-bold" data-testid="active-events-count">{stats?.activeEvents || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeEventsCount || 0} actifs • {stats?.completedEventsCount || 0} terminés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-secondary"></i>
              </div>
              <div className="ml-4">
                <p className="text-muted-foreground text-sm">Participants</p>
                <p className="text-2xl font-bold" data-testid="participants-count">{stats?.totalParticipants || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Passagers + Conducteurs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-car text-blue-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-muted-foreground text-sm">Conducteurs</p>
                <p className="text-2xl font-bold" data-testid="drivers-count">{stats?.totalDrivers || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.activeEventStats?.drivers || 0} dans événements actifs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-chair text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-muted-foreground text-sm">Places disponibles</p>
                <p className="text-2xl font-bold" data-testid="available-seats-count">{stats?.availableSeats || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dans les événements actifs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statut des fonctionnalités */}
      <div className="mb-8">
        <FeatureStatus />
      </div>

      {/* Analyse détaillée et statistiques avancées */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <i className="fas fa-chart-pie text-primary mr-2"></i>
              Analyse des événements
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taux de participation</span>
                <span className="text-sm font-medium">
                  {stats?.totalParticipants && stats?.activeEvents 
                    ? Math.round((stats.totalParticipants / Math.max(1, stats.activeEvents)) * 100) / 100
                    : 0} participants/événement
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taux d'occupation</span>
                <span className="text-sm font-medium">
                  {stats?.activeEventStats?.seats && stats?.activeEventStats?.occupiedSeats
                    ? Math.round((stats.activeEventStats.occupiedSeats / Math.max(1, stats.activeEventStats.seats)) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conducteurs actifs</span>
                <span className="text-sm font-medium">
                  {stats?.activeEventStats?.drivers || 0} conducteurs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <i className="fas fa-bolt text-yellow-500 mr-2"></i>
              Actions rapides
            </h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <i className="fas fa-plus mr-2"></i>
                Créer un nouvel événement
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <i className="fas fa-envelope mr-2"></i>
                Envoyer des rappels
              </Button>
              <FeatureGuard feature={AVAILABLE_FEATURES.CSV_IMPORT}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setShowCsvImport(true)}
                >
                  <i className="fas fa-file-csv mr-2"></i>
                  Importer emails CSV/Excel
                </Button>
              </FeatureGuard>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <i className="fas fa-download mr-2"></i>
                Exporter les données
              </Button>
              <FeatureGuard feature={AVAILABLE_FEATURES.ANALYTICS}>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <i className="fas fa-chart-bar mr-2"></i>
                  Voir les rapports détaillés
                </Button>
              </FeatureGuard>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Événements récents</h2>
            <Button variant="ghost" className="text-primary hover:text-primary/80">
              Voir tout <i className="fas fa-arrow-right ml-1"></i>
            </Button>
          </div>

          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-calendar-plus text-muted-foreground text-4xl mb-4"></i>
              <p className="text-muted-foreground">Aucun événement créé pour le moment.</p>
              <p className="text-muted-foreground text-sm">Créez votre premier événement pour commencer !</p>
              <Button className="mt-4" size="sm">
                <i className="fas fa-plus mr-2"></i>
                Créer un événement
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event: any) => {
                const eventDate = new Date(event.eventDate || event.date);
                const isUpcoming = eventDate >= new Date();
                const participantCount = event.participants?.length || 0;
                
                return (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isUpcoming ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <i className={`fas fa-running ${isUpcoming ? 'text-primary' : 'text-muted-foreground'}`}></i>
                      </div>
                      <div>
                        <h3 className="font-semibold">{event.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          <i className="fas fa-calendar mr-1"></i>
                          {eventDate.toLocaleDateString('fr-FR')}
                          <i className="fas fa-map-marker-alt ml-4 mr-1"></i>
                          {event.destination}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participantCount} participant{participantCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isUpcoming 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {isUpcoming ? "À venir" : "Terminé"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'import CSV */}
      <CsvImportModal
        isOpen={showCsvImport}
        onClose={() => setShowCsvImport(false)}
        onImportComplete={(emails) => {
          console.log('Emails importés:', emails);
          // Ici vous pourriez ajouter la logique pour traiter les emails importés
          setShowCsvImport(false);
        }}
      />
    </div>
  );
}
