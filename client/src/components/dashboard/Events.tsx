// client/src/components/dashboard/Events.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EventModal from "@/components/modals/EventModal";
import InviteModal from "@/components/modals/InviteModal";
import ParticipantManagementModal from "@/components/modals/ParticipantManagementModal";
import type { Event, EventParticipant } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import EventDetailsModal from "../modals/EventDetails";

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showParticipantManagement, setShowParticipantManagement] = useState(false);

  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allEvents = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fonction de filtrage des événements
  const filteredEvents = allEvents.filter((event) => {
    // Filtrage par statut
    const now = new Date();
    const eventDate = new Date(event.date);
    let statusMatch = true;

    if (statusFilter === "upcoming") {
      statusMatch = eventDate > now;
    } else if (statusFilter === "past") {
      statusMatch = eventDate < now;
    } else if (statusFilter === "recurring") {
      statusMatch = event.recurring || false;
    }

    // Filtrage par sport
    const sportMatch = sportFilter === "all" || event.sport === sportFilter;

    // Filtrage par terme de recherche
    const searchMatch = searchTerm === "" || 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.meetingPoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.destination.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && sportMatch && searchMatch;
  });

  const events = filteredEvents;

  const handleInvite = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowInviteModal(true);
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDetails = (event: Event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
      await apiRequest("DELETE", `/api/events/${eventId}`);
      toast({ title: "Événement supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] }); // 🔹 important
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Suppression impossible",
        variant: "destructive",
      });
    }
  };

  const handleParticipantManagement = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowParticipantManagement(true);
  };

  const handleGenerateLink = async (eventId: string) => {
    try {
      const res = await apiRequest("POST", `/api/events/${eventId}/invitations`);
      // si apiRequest renvoie directement Response, lire json :
      const data = await res.json();
      const { token } = data;
      const link = `${window.location.origin}/events/${eventId}`;
      await navigator.clipboard.writeText(link);
      toast({
        title: "Lien copié",
        description: "Le lien d'invitation a été copié dans le presse-papier."
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de générer le lien",
        variant: "destructive"
      });
    }
  };

  // --- EXPORT CSV ---
  const exportCSV = () => {
    const rows = [["Nom", "Date", "Lieu", "Destination", "Participants"]];
    events.forEach((e: any) => {
      rows.push([
        e.name,
        new Date(e.date).toLocaleString("fr-FR"),
        e.meetingPoint,
        e.destination,
        e.participantsCount?.toString() || "0"
      ]);
    });
    const csvContent = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "events.csv");
  };

  // --- EXPORT PDF ---
  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(14);
    doc.text("Liste des événements", 10, y);
    y += 10;
    doc.setFontSize(11);

    events.forEach((e: any, i: number) => {
      doc.text(`${i + 1}. ${e.name} — ${new Date(e.date).toLocaleString("fr-FR")}`, 10, y);
      y += 6;
      doc.text(`Lieu: ${e.meetingPoint} → ${e.destination}`, 10, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 10;
      }
    });

    doc.save("events.pdf");
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
        <Button onClick={() => { setSelectedEvent(null); setShowEventModal(true); }} className="bg-primary hover:bg-blue-700">
          <i className="fas fa-plus mr-2"></i>
          Nouvel événement
        </Button>
      </div>

      {/* Events Filter */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Barre de recherche */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Recherche :</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nom, lieu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <i className="fas fa-search absolute left-2 top-2.5 text-gray-400"></i>
              </div>
            </div>

            {/* Filtrer par statut */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Statut :</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
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

            {/* Filtrer par sport */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sport :</label>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sports</SelectItem>
                  <SelectItem value="football">Football</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="running">Course à pied</SelectItem>
                  <SelectItem value="volleyball">Volleyball</SelectItem>
                  <SelectItem value="cycling">Cyclisme</SelectItem>
                  <SelectItem value="swimming">Natation</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions d'export */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={exportCSV} size="sm">
                <i className="fas fa-file-csv mr-2"></i> CSV
              </Button>
              <Button variant="outline" onClick={exportPDF} size="sm">
                <i className="fas fa-file-pdf mr-2 text-red-500"></i> PDF
              </Button>
            </div>
          </div>
          
          {/* Statistiques des résultats filtrés */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {events.length} événement{events.length !== 1 ? 's' : ''} trouvé{events.length !== 1 ? 's' : ''}
                {allEvents.length !== events.length && ` sur ${allEvents.length} au total`}
              </span>
              {(statusFilter !== "all" || sportFilter !== "all" || searchTerm !== "") && (
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setSportFilter("all");
                    setSearchTerm("");
                  }}
                  className="text-primary hover:text-blue-700 underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
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
              <Button onClick={() => { setSelectedEvent(null); setShowEventModal(true); }} className="bg-primary hover:bg-blue-700">
                <i className="fas fa-plus mr-2"></i>
                Créer mon premier événement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onInvite={() => handleInvite(event.id)}
              onEdit={() => handleEdit(event)}
              onDelete={() => handleDelete(event.id)}
              onGenerateLink={() => handleGenerateLink(event.id)}
              onDetails={() => handleDetails(event)}
              onManageParticipants={() => handleParticipantManagement(event.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        event={selectedEvent || undefined}
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        eventId={selectedEventId}
      />
      <EventDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        event={selectedEvent || undefined}
      />

      <ParticipantManagementModal
        isOpen={showParticipantManagement}
        onClose={() => setShowParticipantManagement(false)}
        eventId={selectedEventId}
      />

      {/* Vous pouvez afficher un modal détails si nécessaire en utilisant selectedEvent et showDetailsModal */}
    </div>
  );
}

/* EventCard now receives callbacks as props instead of accessing parent's state directly */
function EventCard({
  event,
  onInvite,
  onEdit,
  onDelete,
  onGenerateLink,
  onDetails,
  onManageParticipants,
}: {
  event: Event;
  onInvite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateLink: () => void;
  onDetails: () => void;
  onManageParticipants: () => void;
}) {
  const { data: participants = [] } = useQuery<EventParticipant[]>({
    queryKey: [`/api/events/${event.id}/participants`],
  });

  const participantsArray = Array.isArray(participants) ? participants : [];
  const drivers = participantsArray.filter(p => p.role === "driver");
  const passengers = participantsArray.filter(p => p.role === "passenger");
  const totalSeats = drivers.reduce((sum, d) => sum + (d.availableSeats || 0), 0);
  const availableSeats = totalSeats - passengers.length;

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
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <i className="fas fa-edit"></i>
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={onDelete}>
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

              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateLink}
              >
                <i className="fas fa-link mr-1"></i>
                Générer le lien
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDetails}
              >
                <i className="fas fa-eye mr-1"></i>
                Détails
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onManageParticipants}
                className="bg-blue-50 hover:bg-blue-100"
              >
                <i className="fas fa-users-cog mr-1"></i>
                Gérer
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
                  <span className={`px-2 py-1 rounded-full text-xs ${participant.role === "driver"
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
