import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { Event } from "@shared/schema";

interface DashboardStats {
  activeEvents: number;
  totalParticipants: number;
  totalDrivers: number;
  totalSeats: number;
}

export default function Overview() {
  const { organization } = useAuth();
  
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-check text-primary"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Événements actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.activeEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-secondary"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Participants</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalParticipants || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-car-side text-accent"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Conducteurs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalDrivers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-leaf text-green-600"></i>
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Places disponibles</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalSeats || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Événements récents</h2>
            <Button variant="ghost" className="text-primary hover:text-blue-700">
              Voir tout <i className="fas fa-arrow-right ml-1"></i>
            </Button>
          </div>

          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-calendar-plus text-gray-400 text-4xl mb-4"></i>
              <p className="text-gray-600">Aucun événement créé pour le moment.</p>
              <p className="text-gray-500">Créez votre premier événement pour commencer !</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event: any) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-running text-primary"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-600">
                        <i className="fas fa-calendar mr-1"></i>
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                        <i className="fas fa-map-marker-alt ml-4 mr-1"></i>
                        {event.destination}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {event.status === "confirmed" ? "Confirmé" : event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
