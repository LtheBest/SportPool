import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const eventSchema = z.object({
  name: z.string().min(1, "Le nom de l'événement est requis"),
  sport: z.string().min(1, "Le sport est requis"),
  description: z.string().optional(),
  date: z.string().min(1, "La date est requise"),
  time: z.string().min(1, "L'heure est requise"),
  duration: z.string().optional(),
  meetingPoint: z.string().min(1, "Le lieu de rendez-vous est requis"),
  destination: z.string().min(1, "La destination est requise"),
  eventType: z.enum(["one-time", "recurring"]),
  recurrencePattern: z.string().optional(),
  inviteEmails: z.array(z.string()).optional(),
});

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function EventModal({ isOpen, onClose, event }: EventModalProps) {
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name || "",
      sport: event?.sport || "football",
      description: event?.description || "",
      date: event ? new Date(event.date).toISOString().split('T')[0] : "",
      time: event ? new Date(event.date).toTimeString().slice(0, 5) : "",
      duration: event?.duration || "",
      meetingPoint: event?.meetingPoint || "",
      destination: event?.destination || "",
      eventType: event?.isRecurring ? "recurring" : "one-time",
      recurrencePattern: event?.recurrencePattern || "",
      inviteEmails: [],
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (data: any) => {
      const { date, time, eventType, ...eventData } = data;
      const dateTime = new Date(`${date}T${time}`);
      
      return api.events.create({
        ...eventData,
        date: dateTime.toISOString(),
        isRecurring: eventType === "recurring",
        inviteEmails: inviteEmails.length > 0 ? inviteEmails : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onClose();
      form.reset();
      setInviteEmails([]);
      setCurrentEmail("");
      toast({
        title: "Événement créé",
        description: inviteEmails.length > 0 
          ? `Événement créé et ${inviteEmails.length} invitations envoyées.`
          : "Événement créé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'événement.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createEventMutation.mutate(data);
  };

  const addEmail = () => {
    const email = currentEmail.trim();
    if (email && email.includes("@") && !inviteEmails.includes(email)) {
      setInviteEmails([...inviteEmails, email]);
      setCurrentEmail("");
    } else if (inviteEmails.includes(email)) {
      toast({
        title: "Email déjà ajouté",
        description: "Cette adresse email est déjà dans la liste.",
        variant: "destructive",
      });
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setInviteEmails(inviteEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const eventTypes = [
    {
      value: "one-time",
      icon: "fas fa-calendar-day",
      title: "Événement ponctuel",
      description: "Match, compétition, sortie unique",
      color: "text-primary",
    },
    {
      value: "recurring",
      icon: "fas fa-calendar-alt",
      title: "Événement récurrent",
      description: "Entraînement, cours régulier",
      color: "text-secondary",
    },
  ];

  const sports = [
    { value: "football", label: "Football" },
    { value: "basketball", label: "Basketball" },
    { value: "tennis", label: "Tennis" },
    { value: "running", label: "Course à pied" },
    { value: "cycling", label: "Cyclisme" },
    { value: "swimming", label: "Natation" },
    { value: "other", label: "Autre" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {event ? "Modifier l'événement" : "Créer un nouvel événement"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Type */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Type d'événement</h3>
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid md:grid-cols-2 gap-4"
                      >
                        {eventTypes.map((type) => (
                          <FormItem key={type.value}>
                            <FormControl>
                              <RadioGroupItem
                                value={type.value}
                                id={type.value}
                                className="sr-only peer"
                              />
                            </FormControl>
                            <Label
                              htmlFor={type.value}
                              className="relative cursor-pointer flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5 transition-colors"
                            >
                              <i className={`${type.icon} text-2xl ${type.color} mb-2`}></i>
                              <div className="font-semibold text-gray-900">{type.title}</div>
                              <div className="text-sm text-gray-600 text-center">{type.description}</div>
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'événement</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Match contre Real Madrid" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sport</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sports.map((sport) => (
                          <SelectItem key={sport.value} value={sport.value}>
                            {sport.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date & Time */}
            <div className="grid md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de départ</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée estimée (optionnel)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="3h" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Locations */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="meetingPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de rendez-vous</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Parking Camp Nou, Barcelona" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Stade Santiago Bernabéu, Madrid" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      placeholder="Détails sur l'événement, équipement nécessaire, consignes particulières..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring options */}
            {form.watch("eventType") === "recurring" && (
              <FormField
                control={form.control}
                name="recurrencePattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Récurrence</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisissez la fréquence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Chaque semaine</SelectItem>
                        <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                        <SelectItem value="monthly">Chaque mois</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Members to Invite */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Inviter des membres (optionnel)
              </Label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    type="email"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    placeholder="Entrez une adresse email"
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addEmail} variant="outline">
                    <i className="fas fa-plus"></i>
                  </Button>
                </div>
                
                {inviteEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {inviteEmails.map((email, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-2">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeEmail(email)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-blue-700"
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {inviteEmails.length > 0 ? "Création et envoi..." : "Création..."}
                  </>
                ) : (
                  inviteEmails.length > 0 
                    ? "Créer l'événement et envoyer les invitations"
                    : "Créer l'événement"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
