// client/src/components/modals/EventDetailsModal.tsx
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function EventDetailsModal({ isOpen, onClose, event }: Props) {
  const eventId = event?.id;

  const { data: participants = [] } = useQuery({
    queryKey: eventId ? [`/api/events/${eventId}/participants`] : ["event-participants", "idle"],
    queryFn: async () => {
      // apiRequest peut renvoyer soit un Response, soit JSON directement selon ton helper
      const res = await apiRequest("GET", `/api/events/${eventId}/participants`);
      // Si apiRequest retourne un Response (fetch-like)
      if (res && typeof (res as any).json === "function") {
        return await (res as Response).json();
      }
      // Sinon on suppose que c'est déjà le JSON
      return res;
    },
    enabled: !!eventId,
  });

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{event.name}</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <div>
            <div className="text-sm text-gray-500">Date & heure</div>
            <div className="font-medium">{new Date(event.date).toLocaleString("fr-FR")}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Lieu de rendez-vous</div>
            <div className="font-medium">{event.meetingPoint}</div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Destination</div>
            <div className="font-medium">{event.destination}</div>
          </div>

          {event.duration && (
            <div>
              <div className="text-sm text-gray-500">Durée estimée</div>
              <div className="font-medium">{event.duration}</div>
            </div>
          )}

          {event.description && (
            <div>
              <div className="text-sm text-gray-500">Description</div>
              <div className="font-medium whitespace-pre-wrap">{event.description}</div>
            </div>
          )}

          <div>
            <div className="text-sm text-gray-500">Type</div>
            <div className="font-medium">{event.isRecurring ? "Récurrent" : "Ponctuel"}</div>
            {event.isRecurring && event.recurrencePattern && (
              <div className="text-sm text-gray-600 mt-1">Récurrence : {event.recurrencePattern}</div>
            )}
          </div>

          <div>
            <div className="text-sm text-gray-500">Participants ({participants.length})</div>
            <ul className="mt-2 space-y-2">
              {participants.map((p: any) => (
                <li key={p.id || `${p.name}-${p.email}`} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.email}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${p.role === "driver" ? "bg-primary text-white" : "bg-gray-200 text-gray-700"}`}>
                    {p.role === "driver" ? `Conducteur (${p.availableSeats || 0} places)` : "Passager"}
                  </div>
                </li>
              ))}
              {participants.length === 0 && <li className="text-sm text-gray-500">Aucun participant pour l'instant</li>}
            </ul>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
