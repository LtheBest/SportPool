// client/src/components/modals/EventModal.tsx
import React, { useEffect, useState } from "react";
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
import { apiRequest } from "@/lib/queryClient";

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
      name: "",
      sport: "football",
      description: "",
      date: "",
      time: "",
      duration: "",
      meetingPoint: "",
      destination: "",
      eventType: "one-time",
      recurrencePattern: "",
      inviteEmails: [],
    },
  });

  // Quand `event` change, on reset le formulaire pour préremplir les valeurs
  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name || "",
        sport: event.sport || "football",
        description: event.description || "",
        date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
        time: event.date ? new Date(event.date).toTimeString().slice(0, 5) : "",
        duration: event.duration || "",
        meetingPoint: event.meetingPoint || "",
        destination: event.destination || "",
        eventType: event.isRecurring ? "recurring" : "one-time",
        recurrencePattern: event.recurrencePattern || "",
        inviteEmails: [],
      });
      setInviteEmails(Array.isArray(event.inviteEmails) ? [...event.inviteEmails] : []);
    } else {
      // si création : valeurs vides
      form.reset({
        name: "",
        sport: "football",
        description: "",
        date: "",
        time: "",
        duration: "",
        meetingPoint: "",
        destination: "",
        eventType: "one-time",
        recurrencePattern: "",
        inviteEmails: [],
      });
      setInviteEmails([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // --- CREATE MUTATION ---
  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const { date, time, eventType, ...eventData } = data;
      const dateTime = new Date(`${date}T${time}`);
      return apiRequest("POST", "/api/events", {
        ...eventData,
        date: dateTime.toISOString(),
        isRecurring: eventType === "recurring",
        recurrencePattern: data.recurrencePattern || null,
        inviteEmails: inviteEmails.length > 0 ? inviteEmails : undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      // ⚡ Rafraîchit les statistiques du dashboard
      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] }); // 🔹 important
      onClose();
      form.reset();
      setInviteEmails([]);
      setCurrentEmail("");
      toast({
        title: "Événement créé",
        description: inviteEmails.length > 0
          ? `Événement créé avec succès ! Invitations envoyées à ${inviteEmails.length} adresses + tous les membres existants.`
          : "Événement créé avec succès ! Invitations automatiquement envoyées à tous les membres existants.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de créer l'événement.",
        variant: "destructive",
      });
    },
  });

  // --- UPDATE MUTATION ---
  const updateEventMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!event?.id) throw new Error("Événement introuvable");
      const { date, time, eventType, ...eventData } = data;
      const dateTime = new Date(`${date}T${time}`);
      return apiRequest("PUT", `/api/events/${event.id}`, {
        ...eventData,
        date: dateTime.toISOString(),
        isRecurring: eventType === "recurring",
        recurrencePattern: data.recurrencePattern || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Événement mis à jour" });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err?.message || "Mise à jour impossible",
        variant: "destructive",
      });
    },
  });

  // --- SUBMIT HANDLER ---
  const onSubmit = (data: any) => {
    if (event?.id) {
      updateEventMutation.mutate(data);
    } else {
      createEventMutation.mutate(data);
    }
  };

  // invite emails helpers
  const addEmail = () => {
    const email = currentEmail.trim();
    if (!email) return;
    if (!email.includes("@")) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }
    if (!inviteEmails.includes(email)) {
      setInviteEmails((s) => [...s, email]);
      setCurrentEmail("");
    } else {
      toast({
        title: "Email déjà ajouté",
        description: "Cette adresse email est déjà dans la liste.",
        variant: "destructive",
      });
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setInviteEmails((s) => s.filter((e) => e !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const eventTypes = [
    { value: "one-time", icon: "fas fa-calendar-day", title: "Événement ponctuel", description: "Match, compétition, sortie unique", color: "text-primary" },
    { value: "recurring", icon: "fas fa-calendar-alt", title: "Événement récurrent", description: "Entraînement, cours régulier", color: "text-secondary" },
  ];

  const sports = [
    { value: "football", label: "Football" },
    { value: "basketball", label: "Basketball" },
    { value: "tennis", label: "Tennis" },
    { value: "running", label: "Course à pied" },
    { value: "cycling", label: "Cyclisme" },
    { value: "swimming", label: "Natation" },
    {value: "hiking", label: "Randonnée" },
    { value: "skiing", label: "Ski" },
    { value: "snowboarding", label: "Snowboard" },
    { value: "volleyball", label: "Volleyball" },
    { value: "badminton", label: "Badminton" },
    { value: "golf", label: "Golf" },
    { value: "rugby", label: "Rugby" },
    { value: "cricket", label: "Cricket" },
    { value: "table-tennis", label: "Tennis de table" },
    { value: "boxing", label: "Boxe" },
    { value: "martial-arts", label: "Arts martiaux" },
    { value: "yoga", label: "Yoga" },
    { value: "crossfit", label: "CrossFit" },
    { value: "handball", label: "HandBall" },
    { value: "other", label: "Autre" },
  ];

  const isSubmitting = createEventMutation.isPending || updateEventMutation.isPending;

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
              <FormField control={form.control} name="eventType" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="grid md:grid-cols-2 gap-4">
                      {eventTypes.map((type) => (
                        <FormItem key={type.value}>
                          <FormControl>
                            <RadioGroupItem value={type.value} id={type.value} className="sr-only peer" />
                          </FormControl>
                          <Label htmlFor={type.value}
                            className={`relative cursor-pointer flex flex-col items-center p-4
                              border-2 rounded-lg transition-all
                              hover:border-primary hover:bg-primary/5
                              peer-checked:border-primary peer-checked:bg-primary/10
                              peer-checked:shadow-lg peer-checked:scale-[1.02]
                            `}
                          >
                            <i className={`${type.icon} text-2xl ${type.color} mb-2`}></i>
                            <div className="font-semibold text-gray-900">{type.title}</div>
                            <div className="text-sm text-gray-600 text-center">{type.description}</div>
                            {field.value === type.value && (
                              <span className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                Sélectionné
                              </span>
                            )}
                          </Label>

                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'événement</FormLabel>
                  <FormControl><Input {...field} placeholder="Match contre Real Madrid" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sport" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sports.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Date & Time */}
            <div className="grid md:grid-cols-3 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input {...field} type="date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure de départ</FormLabel>
                  <FormControl><Input {...field} type="time" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée estimée (optionnel)</FormLabel>
                  <FormControl><Input {...field} placeholder="3h" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Locations */}
            <div className="space-y-4">
              <FormField control={form.control} name="meetingPoint" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de rendez-vous</FormLabel>
                  <FormControl><Input {...field} placeholder="Parking Camp Nou, Barcelona" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="destination" render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl><Input {...field} placeholder="Stade Santiago Bernabéu, Madrid" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optionnel)</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Détails sur l'événement..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Recurrence */}
            {form.watch("eventType") === "recurring" && (
              <FormField control={form.control} name="recurrencePattern" render={({ field }) => (
                <FormItem>
                  <FormLabel>Récurrence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choisissez la fréquence" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="weekly">Chaque semaine</SelectItem>
                      <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                      <SelectItem value="monthly">Chaque mois</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Invite emails */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Inviter de nouveaux membres (optionnel)</Label>
              <p className="text-xs text-gray-500 mb-3">
                💡 Tous les membres existants de vos événements précédents recevront automatiquement une invitation. 
                Ajoutez ici uniquement de nouvelles adresses email.
              </p>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input type="email" value={currentEmail} onChange={(e) => setCurrentEmail(e.target.value)} placeholder="Entrez une adresse email" onKeyPress={handleKeyPress} className="flex-1" />
                  <Button type="button" onClick={addEmail} variant="outline"><i className="fas fa-plus"></i></Button>
                </div>

                {inviteEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {inviteEmails.map((email, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-2">
                        {email}
                        <button type="button" onClick={() => removeEmail(email)} className="ml-1 text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xs"></i></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => { onClose(); }}>
                Annuler
              </Button>
              <Button type="submit" className="bg-primary hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {event ? "Modification..." : "Création..."}
                  </>
                ) : (
                  event ? "Modifier l'événement" : (inviteEmails.length > 0 ? "Créer l'événement et envoyer les invitations" : "Créer l'événement")
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
