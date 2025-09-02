import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReminderScheduler from "@/components/reminders/ReminderScheduler";
import type { EventParticipant, Event } from "@shared/schema";

interface ParticipantManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
}

export default function ParticipantManagementModal({
  isOpen,
  onClose,
  eventId
}: ParticipantManagementModalProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<EventParticipant | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newSeats, setNewSeats] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: participantsData, isLoading } = useQuery<EventParticipant[]>({
    queryKey: [`/api/events/${eventId}/participants`],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/participants`),
    enabled: !!eventId,
  });

  const { data: changeRequests = [] } = useQuery({
    queryKey: [`/api/events/${eventId}/change-requests`],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/change-requests`),
    enabled: !!eventId,
  });

  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}`),
    enabled: !!eventId,
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async (data: {
      participantId: string;
      role?: string;
      availableSeats?: number;
      status?: string
    }) => {
      return apiRequest("PUT", `/api/participants/${data.participantId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      setSelectedParticipant(null);
      setNewRole("");
      setNewSeats("");
      toast({
        title: "Participant mis à jour",
        description: "Les modifications ont été appliquées avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le participant.",
        variant: "destructive",
      });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: string) => {
      return apiRequest("DELETE", `/api/participants/${participantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Participant retiré",
        description: "Le participant a été retiré de l'événement.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de retirer le participant.",
        variant: "destructive",
      });
    },
  });

  const processChangeRequestMutation = useMutation({
    mutationFn: async (data: { requestId: string; status: string; organizerComment?: string }) => {
      return apiRequest("PUT", `/api/change-requests/${data.requestId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/change-requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      toast({
        title: "Demande traitée",
        description: "La demande a été traitée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traiter la demande.",
        variant: "destructive",
      });
    },
  });



  const handleUpdateParticipant = () => {
    if (!selectedParticipant) return;

    const updateData: any = {};

    if (newRole && newRole !== selectedParticipant.role) {
      updateData.role = newRole;
      if (newRole === "driver" && newSeats) {
        updateData.availableSeats = parseInt(newSeats);
      }
    } else if (newSeats && selectedParticipant.role === "driver") {
      updateData.availableSeats = parseInt(newSeats);
    }

    if (Object.keys(updateData).length > 0) {
      updateParticipantMutation.mutate({
        participantId: selectedParticipant.id,
        ...updateData
      });
    }
  };

  const participants = Array.isArray(participantsData) ? participantsData : [];
  if (!Array.isArray(participantsData)) {
    console.error("participants N'EST PAS un tableau !", participantsData);
  }
  const drivers = participants.filter(p => p.role === "driver");
  const passengers = participants.filter(p => p.role === "passenger");
  const totalSeats = drivers.reduce((sum, d) => sum + (d.availableSeats || 0), 0);

  if (!eventId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Gestion des Participants
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{participants.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{drivers.length}</div>
                <div className="text-sm text-gray-600">Conducteurs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{passengers.length}</div>
                <div className="text-sm text-gray-600">Passagers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{totalSeats}</div>
                <div className="text-sm text-gray-600">Places dispo</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <ReminderScheduler 
              eventId={eventId}
              eventDate={event?.date || new Date().toISOString()}
              participantCount={participants.length}
            />
            <Button
              onClick={() => window.open(`/api/events/${eventId}/calendar`, '_blank')}
              variant="outline"
            >
              <i className="fas fa-calendar-alt mr-2"></i>
              Télécharger iCal
            </Button>
          </div>

          {/* Change Requests */}
          {changeRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Demandes de changement ({changeRequests.filter((r: any) => r.status === 'pending').length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {changeRequests.filter((r: any) => r.status === 'pending').map((request: any) => {
                    const participant = participants.find(p => p.id === request.participantId);
                    return (
                      <div key={request.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{participant?.name}</div>
                            <div className="text-sm text-gray-600">
                              {request.requestType === 'role_change' ? 'Changement de rôle' :
                                request.requestType === 'seat_change' ? 'Changement de places' : 'Retrait'}
                            </div>
                            <div className="text-sm">{request.reason}</div>
                            {request.requestedValue && (
                              <div className="text-sm text-blue-600">
                                Nouvelle valeur: {request.requestedValue}
                              </div>
                            )}
                          </div>
                          <div className="space-x-2">
                            <Button
                              size="sm"
                              onClick={() => processChangeRequestMutation.mutate({
                                requestId: request.id,
                                status: 'approved'
                              })}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processChangeRequestMutation.mutate({
                                requestId: request.id,
                                status: 'rejected'
                              })}
                            >
                              Rejeter
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liste des participants</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Chargement...</div>
              ) : (
                <div className="space-y-4">
                  {/* Drivers */}
                  {drivers.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">🚗 Conducteurs</h4>
                      <div className="space-y-2">
                        {drivers.map(driver => (
                          <div key={driver.id} className="border p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <div className="font-medium">{driver.name}</div>
                              <div className="text-sm text-gray-600">{driver.email}</div>
                              <div className="text-sm text-blue-600">
                                {driver.availableSeats} places disponibles
                              </div>
                            </div>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedParticipant(driver);
                                  setNewRole(driver.role);
                                  setNewSeats(driver.availableSeats?.toString() || "");
                                }}
                              >
                                <i className="fas fa-edit mr-1"></i>
                                Modifier
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => removeParticipantMutation.mutate(driver.id)}
                              >
                                <i className="fas fa-trash mr-1"></i>
                                Retirer
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Passengers */}
                  {passengers.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">🎒 Passagers</h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        {passengers.map(passenger => (
                          <div key={passenger.id} className="border p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <div className="font-medium">{passenger.name}</div>
                              <div className="text-sm text-gray-600">{passenger.email}</div>
                            </div>
                            <div className="space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedParticipant(passenger);
                                  setNewRole(passenger.role);
                                  setNewSeats("");
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => removeParticipantMutation.mutate(passenger.id)}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {participants.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Aucun participant pour le moment
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Participant Form */}
          {selectedParticipant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Modifier {selectedParticipant.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role">Rôle</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passenger">🎒 Passager</SelectItem>
                        <SelectItem value="driver">🚗 Conducteur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newRole === "driver" && (
                    <div>
                      <Label htmlFor="seats">Nombre de places disponibles</Label>
                      <Input
                        id="seats"
                        type="number"
                        min="1"
                        max="7"
                        value={newSeats}
                        onChange={(e) => setNewSeats(e.target.value)}
                        placeholder="Nombre de places"
                      />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      onClick={handleUpdateParticipant}
                      disabled={updateParticipantMutation.isPending}
                    >
                      {updateParticipantMutation.isPending ? "Mise à jour..." : "Sauvegarder"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedParticipant(null);
                        setNewRole("");
                        setNewSeats("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}