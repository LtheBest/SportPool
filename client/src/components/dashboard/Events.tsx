import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EventModal from "@/components/modals/EventModal";
import InviteModal from "@/components/modals/InviteModal";
import type { Event, EventParticipant } from "@shared/schema";

export default function Events() {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const handleInvite = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowInviteModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes événements</h1>
          <p className="text-gray-600">Créez et gérez tous vos événements sportifs.</p>
        </div>
        <Button onClick={() => setShowEventModal(true)} className="bg-primary hover:bg-blue-700">
          <i className="fas fa-plus mr-2"></i>
          Nouvel événement
        </Button>
      </div>

      {/* Events Filter */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filtrer :</label>
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
                  <SelectItem value="upcoming">À venir</SelectItem>
                  <SelectItem value="past">Passés</SelectItem>
                  <SelectItem value="recurring">Récurrents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sport :</label>
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sports</SelectItem>
                  <SelectItem value="football">Football</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="running">Course à pied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="ml-auto">
              <i className="fas fa-download mr-2"></i>
              Exporter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <i className="fas fa-calendar-plus text-gray-400 text-6xl mb-6"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun événement</h3>
              <p className="text-gray-600 mb-6">
                Vous n'avez pas encore créé d'événement. Commencez par créer votre premier événement !
              </p>
              <Button onClick={() => setShowEventModal(true)} className="bg-primary hover:bg-blue-700">
                <i className="fas fa-plus mr-2"></i>
                Créer mon premier événement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onInvite={() => handleInvite(event.id)} />
          ))}
        </div>
      )}

      {/* Modals */}
      <EventModal 
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
      />
      
      <InviteModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        eventId={selectedEventId}
      />
    </div>
  );
}

function EventCard({ event, onInvite }: { event: Event; onInvite: () => void }) {
  const { data: participants = [] } = useQuery<EventParticipant[]>({
    queryKey: [`/api/events/${event.id}/participants`],
  });

  const drivers = participants.filter((p) => p.role === "driver");
  const passengers = participants.filter((p) => p.role === "passenger");
  const availableSeats = drivers.reduce((sum, d) => sum + (d.availableSeats || 0), 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
              <i className="fas fa-running text-primary text-2xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{event.name}</h3>
              <p className="text-gray-600 mt-1">
                <i className="fas fa-calendar mr-2"></i>
                {new Date(event.date).toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                <span className="mx-2">•</span>
                <i className="fas fa-clock mr-2"></i>
                {new Date(event.date).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-600">
                <i className="fas fa-map-marker-alt mr-2"></i>
                <span>{event.meetingPoint}</span>
                <i className="fas fa-arrow-right mx-3"></i>
                <span>{event.destination}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {event.status === "confirmed" ? "Confirmé" : event.status}
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <i className="fas fa-edit"></i>
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Participants</h4>
            <div className="text-2xl font-bold text-primary">{participants.length}</div>
            <div className="text-sm text-gray-600">
              {drivers.length} conducteurs • {passengers.length} passagers
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Places disponibles</h4>
            <div className="text-2xl font-bold text-secondary">{availableSeats}</div>
            <div className="text-sm text-gray-600">dans {drivers.length} véhicules</div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onInvite} size="sm" className="bg-primary hover:bg-blue-700">
                <i className="fas fa-user-plus mr-1"></i>
                Inviter
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-eye mr-1"></i>
                Détails
              </Button>
            </div>
          </div>
        </div>

        {/* Participants Preview */}
        {participants.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Participants récents</h4>
            <div className="flex items-center space-x-4 text-sm">
              {participants.slice(0, 3).map((participant: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-gray-500"></i>
                  </div>
                  <span className="text-gray-700">{participant.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    participant.role === "driver" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700"
                  }`}>
                    {participant.role === "driver" ? "Conducteur" : "Passager"}
                  </span>
                </div>
              ))}
              {participants.length > 3 && (
                <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                  +{participants.length - 3} autres
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
