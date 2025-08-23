import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const joinEventSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  role: z.enum(["passenger", "driver"]),
  availableSeats: z.number().min(1).max(7).optional(),
  comment: z.string().optional(),
});

type JoinEventData = z.infer<typeof joinEventSchema>;

interface EventPublicViewProps {
  eventId: string;
}

export default function EventPublicView({ eventId }: EventPublicViewProps) {
  const [showJoinForm, setShowJoinForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading, error } = useQuery({
    queryKey: [`/api/events/${eventId}/public`],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/public`),
  });

  const form = useForm<JoinEventData>({
    resolver: zodResolver(joinEventSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "passenger",
      availableSeats: undefined,
      comment: "",
    },
  });

  const joinEventMutation = useMutation({
    mutationFn: (data: JoinEventData) => {
      const submitData = { ...data };
      if (data.role === "passenger") {
        delete submitData.availableSeats;
      }
      return apiRequest("POST", `/api/events/${eventId}/join`, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/public`] });
      setShowJoinForm(false);
      form.reset();
      toast({
        title: "Inscription réussie !",
        description: "Vous êtes maintenant inscrit(e) à cet événement.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de s'inscrire à l'événement.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JoinEventData) => {
    joinEventMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Événement introuvable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              L'événement que vous recherchez n'existe pas ou n'est plus disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const drivers = event.participants?.filter((p: any) => p.role === 'driver') || [];
  const passengers = event.participants?.filter((p: any) => p.role === 'passenger') || [];
  const totalSeats = drivers.reduce((sum: number, driver: any) => sum + (driver.availableSeats || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Event Header */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                {event.organization?.logoUrl && (
                  <img
                    src={event.organization.logoUrl}
                    alt={event.organization.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                    {event.name}
                  </CardTitle>
                  <p className="text-gray-600">
                    Organisé par <span className="font-semibold">{event.organization?.name}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {event.sport}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">📅 Date et heure</h3>
                <p className="text-gray-700">{formattedDate}</p>
                <p className="text-gray-700">à {formattedTime}</p>
                {event.duration && (
                  <p className="text-sm text-gray-600 mt-1">Durée estimée : {event.duration}</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">📍 Lieux</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Rendez-vous :</span>
                    <p className="text-gray-700">{event.meetingPoint}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Destination :</span>
                    <p className="text-gray-700">{event.destination}</p>
                  </div>
                </div>
              </div>
            </div>

            {event.description && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">📝 Description</h3>
                <p className="text-gray-700">{event.description}</p>
              </div>
            )}

            {/* Participation Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">👥 Participation actuelle</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{drivers.length}</div>
                  <div className="text-sm text-gray-600">Conducteur{drivers.length !== 1 ? 's' : ''}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{totalSeats}</div>
                  <div className="text-sm text-gray-600">Places dispo</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{passengers.length}</div>
                  <div className="text-sm text-gray-600">Passager{passengers.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Participants inscrits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {drivers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">🚗 Conducteurs</h4>
                    <div className="space-y-2">
                      {drivers.map((driver: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium">{driver.name}</span>
                          <span className="text-sm text-blue-600">
                            {driver.availableSeats} place{driver.availableSeats !== 1 ? 's' : ''} disponible{driver.availableSeats !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {passengers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">🎒 Passagers</h4>
                    <div className="grid md:grid-cols-3 gap-2">
                      {passengers.map((passenger: any, idx: number) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg">
                          <span className="font-medium">{passenger.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Join Event Section */}
        <Card>
          <CardHeader>
            <CardTitle>Participer à cet événement</CardTitle>
          </CardHeader>
          <CardContent>
            {!showJoinForm ? (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">
                  Vous souhaitez participer à cet événement ? Cliquez sur le bouton ci-dessous pour vous inscrire.
                </p>
                <Button 
                  onClick={() => setShowJoinForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  S'inscrire à l'événement
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom complet</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Jean Dupont" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="jean.dupont@email.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Je participe en tant que</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid md:grid-cols-2 gap-4"
                          >
                            <div className="flex items-center space-x-2 p-4 border rounded-lg">
                              <RadioGroupItem value="passenger" id="passenger" />
                              <Label htmlFor="passenger" className="flex-1">
                                <div className="font-medium">🎒 Passager</div>
                                <div className="text-sm text-gray-600">Je cherche un moyen de transport</div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-4 border rounded-lg">
                              <RadioGroupItem value="driver" id="driver" />
                              <Label htmlFor="driver" className="flex-1">
                                <div className="font-medium">🚗 Conducteur</div>
                                <div className="text-sm text-gray-600">Je peux emmener d'autres personnes</div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("role") === "driver" && (
                    <FormField
                      control={form.control}
                      name="availableSeats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de places disponibles</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="1"
                              max="7"
                              placeholder="4"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commentaire (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Informations supplémentaires, restrictions, etc."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowJoinForm(false)}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={joinEventMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {joinEventMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Inscription...
                        </>
                      ) : (
                        "Confirmer l'inscription"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}