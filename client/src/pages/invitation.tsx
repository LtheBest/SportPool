import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api, type InvitationResponse } from "@/lib/api";
import type { Event, EventInvitation, Organization } from "@shared/schema";

interface InvitationData {
  invitation: EventInvitation;
  event: Event;
  organization: Organization;
}

export default function Invitation() {
  const [, params] = useRoute("/invitation/:token");
  const token = params?.token;
  const [name, setName] = useState("");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [availableSeats, setAvailableSeats] = useState<number>(1);
  const [comment, setComment] = useState("");
  const [accepted, setAccepted] = useState(false);
  const { toast } = useToast();

  const { data: invitationData, isLoading, error } = useQuery<InvitationData>({
    queryKey: [`/api/invitations/${token}`],
    enabled: !!token,
  });

  const respondMutation = useMutation({
    mutationFn: (data: InvitationResponse) =>
      api.invitations.respond(token!, data),
    onSuccess: () => {
      toast({
        title: "Participation confirmée",
        description: "Votre participation a été enregistrée avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !accepted) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis.",
        variant: "destructive",
      });
      return;
    }

    if (role === "driver" && (availableSeats < 1 || availableSeats > 7)) {
      toast({
        title: "Erreur",
        description: "Les conducteurs doivent indiquer entre 1 et 7 places disponibles.",
        variant: "destructive",
      });
      return;
    }

    respondMutation.mutate({
      name,
      role,
      availableSeats: role === "driver" ? availableSeats : undefined,
      comment: comment || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation introuvable</h1>
              <p className="text-gray-600">Cette invitation n'existe pas ou a expiré.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { invitation, event, organization } = invitationData;

  if (invitation.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation déjà traitée</h1>
              <p className="text-gray-600">Vous avez déjà répondu à cette invitation.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card className="animate-fade-in">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <i className="fas fa-car text-primary text-3xl"></i>
                <span className="text-2xl font-bold text-gray-900">TeamMove</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation à un événement</h1>
              <p className="text-gray-600">Vous êtes invité(e) à participer à un événement sportif</p>
            </div>

            {/* Event Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{event.name}</h2>
              
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <i className="fas fa-calendar mr-3 w-5"></i>
                  <span>{new Date(event.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <i className="fas fa-map-marker-alt mr-3 w-5"></i>
                  <span>RDV: {event.meetingPoint}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <i className="fas fa-flag-checkered mr-3 w-5"></i>
                  <span>Destination: {event.destination}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <i className="fas fa-user mr-3 w-5"></i>
                  <span>Organisé par: {organization.name}</span>
                </div>
              </div>
            </div>

            {/* Response Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Votre nom complet *</Label>
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email"
                  value={invitation.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              
              {/* Role Selection */}
              <div>
                <Label className="text-lg font-semibold text-gray-900 mb-4">Votre participation *</Label>
                <RadioGroup value={role} onValueChange={(value) => setRole(value as "passenger" | "driver")}>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors">
                      <RadioGroupItem value="passenger" id="passenger" className="mt-1" />
                      <Label htmlFor="passenger" className="cursor-pointer flex-1">
                        <div className="font-semibold text-gray-900">Passager</div>
                        <div className="text-sm text-gray-600">Je souhaite être transporté(e) par un conducteur</div>
                      </Label>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors">
                      <RadioGroupItem value="driver" id="driver" className="mt-1" />
                      <Label htmlFor="driver" className="cursor-pointer flex-1">
                        <div className="font-semibold text-gray-900">Conducteur</div>
                        <div className="text-sm text-gray-600 mb-3">Je peux transporter d'autres participants</div>
                        
                        {/* Seat Selection */}
                        {role === "driver" && (
                          <div className="mt-3">
                            <Label className="block text-sm font-medium text-gray-700 mb-2">
                              Nombre de places disponibles dans votre véhicule *
                            </Label>
                            <div className="grid grid-cols-7 gap-2">
                              {[1, 2, 3, 4, 5, 6, 7].map((seats) => (
                                <Button
                                  key={seats}
                                  type="button"
                                  variant={availableSeats === seats ? "default" : "outline"}
                                  className="w-10 h-10"
                                  onClick={() => setAvailableSeats(seats)}
                                >
                                  {seats}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Textarea 
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Message pour l'organisateur..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked === true)}
                  required
                />
                <Label htmlFor="terms" className="text-sm text-gray-600">
                  J'accepte de participer à cet événement et de respecter les conditions de covoiturage
                </Label>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={respondMutation.isPending}
                  className="px-8 py-3"
                >
                  {respondMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    "Confirmer ma participation"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
