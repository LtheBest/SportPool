import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, Send, Settings, Bell, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ReminderSchedulerProps {
  eventId: string;
  eventDate: string;
  participantCount: number;
}

interface ScheduledReminder {
  id: string;
  eventId: string;
  daysBeforeEvent: number;
  scheduledDateTime: string;
  status: 'pending' | 'sent' | 'failed';
  message?: string;
  recipientCount: number;
  createdAt: string;
}

export function ReminderScheduler({ eventId, eventDate, participantCount }: ReminderSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string>("1");
  const [customMessage, setCustomMessage] = useState("");
  const [includeEventDetails, setIncludeEventDetails] = useState(true);
  const [includeWeatherInfo, setIncludeWeatherInfo] = useState(false);
  const [autoReminders, setAutoReminders] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculer les dates de rappel possibles
  const calculateReminderDate = (days: number) => {
    const eventDateTime = new Date(eventDate);
    const reminderDate = new Date(eventDateTime.getTime() - (days * 24 * 60 * 60 * 1000));
    return reminderDate;
  };

  const reminderOptions = [
    { value: "1", label: "1 jour avant", hours: 24 },
    { value: "2", label: "2 jours avant", hours: 48 },
    { value: "3", label: "3 jours avant", hours: 72 },
    { value: "5", label: "5 jours avant", hours: 120 },
    { value: "7", label: "1 semaine avant", hours: 168 }
  ];

  // Récupérer les rappels programmés
  const { data: scheduledReminders = [] } = useQuery<ScheduledReminder[]>({
    queryKey: [`/api/events/${eventId}/scheduled-reminders`],
    queryFn: () => apiRequest("GET", `/api/events/${eventId}/scheduled-reminders`),
    enabled: !!eventId,
  });

  // Envoyer un rappel immédiat
  const sendImmediateReminderMutation = useMutation({
    mutationFn: async (data: { customMessage?: string; includeDetails: boolean }) => {
      return apiRequest("POST", `/api/events/${eventId}/send-reminders`, {
        immediate: true,
        customMessage: data.customMessage,
        includeEventDetails: data.includeDetails,
        includeWeatherInfo
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Rappels envoyés",
        description: data?.message || "Les rappels ont été envoyés immédiatement aux participants.",
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'envoyer les rappels.",
        variant: "destructive",
      });
    },
  });

  // Programmer un rappel
  const scheduleReminderMutation = useMutation({
    mutationFn: async (data: {
      daysBeforeEvent: number;
      customMessage?: string;
      includeDetails: boolean;
      includeWeatherInfo: boolean;
    }) => {
      return apiRequest("POST", `/api/events/${eventId}/schedule-reminder`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/scheduled-reminders`] });
      toast({
        title: "Rappel programmé",
        description: "Le rappel a été programmé avec succès.",
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de programmer le rappel.",
        variant: "destructive",
      });
    },
  });

  // Annuler un rappel programmé
  const cancelReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      return apiRequest("DELETE", `/api/scheduled-reminders/${reminderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/scheduled-reminders`] });
      toast({
        title: "Rappel annulé",
        description: "Le rappel programmé a été annulé.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'annuler le rappel.",
        variant: "destructive",
      });
    },
  });

  const handleScheduleReminder = () => {
    const days = parseInt(selectedDays);
    const reminderDate = calculateReminderDate(days);
    
    if (reminderDate < new Date()) {
      toast({
        title: "Date invalide",
        description: "La date de rappel ne peut pas être dans le passé.",
        variant: "destructive",
      });
      return;
    }

    scheduleReminderMutation.mutate({
      daysBeforeEvent: days,
      customMessage: customMessage.trim() || undefined,
      includeDetails: includeEventDetails,
      includeWeatherInfo
    });
  };

  const handleSendImmediate = () => {
    sendImmediateReminderMutation.mutate({
      customMessage: customMessage.trim() || undefined,
      includeDetails: includeEventDetails
    });
  };

  const isPastEvent = new Date(eventDate) < new Date();
  const pendingReminders = scheduledReminders.filter(r => r.status === 'pending');
  const sentReminders = scheduledReminders.filter(r => r.status === 'sent');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={isPastEvent || participantCount === 0}
          className="relative"
        >
          <Bell className="w-4 h-4 mr-2" />
          Rappels
          {pendingReminders.length > 0 && (
            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs">
              {pendingReminders.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Gestion des Rappels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info sur l'événement */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-600">Événement</div>
                  <div className="font-medium">
                    {new Date(eventDate).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Participants</div>
                  <div className="text-2xl font-bold text-blue-600">{participantCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rappels programmés existants */}
          {scheduledReminders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rappels programmés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledReminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {reminder.status === 'pending' && <Clock className="w-4 h-4 text-orange-500" />}
                        {reminder.status === 'sent' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {reminder.status === 'failed' && <Bell className="w-4 h-4 text-red-500" />}
                        
                        <div>
                          <div className="font-medium">
                            {reminder.daysBeforeEvent} jour{reminder.daysBeforeEvent > 1 ? 's' : ''} avant
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(reminder.scheduledDateTime).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          reminder.status === 'pending' ? 'outline' :
                          reminder.status === 'sent' ? 'secondary' : 'destructive'
                        }>
                          {reminder.status === 'pending' ? 'Programmé' :
                           reminder.status === 'sent' ? 'Envoyé' : 'Échoué'}
                        </Badge>
                        
                        {reminder.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelReminderMutation.mutate(reminder.id)}
                            disabled={cancelReminderMutation.isPending}
                          >
                            Annuler
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuration du rappel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nouveau rappel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sélection du délai */}
              <div>
                <Label>Quand envoyer le rappel ?</Label>
                <Select value={selectedDays} onValueChange={setSelectedDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le délai" />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderOptions.map((option) => {
                      const reminderDate = calculateReminderDate(parseInt(option.value));
                      const isPast = reminderDate < new Date();
                      
                      return (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          disabled={isPast}
                        >
                          <div className="flex justify-between w-full">
                            <span>{option.label}</span>
                            <span className="text-sm text-gray-500 ml-4">
                              {reminderDate.toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Message personnalisé */}
              <div>
                <Label htmlFor="customMessage">Message personnalisé (optionnel)</Label>
                <textarea
                  id="customMessage"
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Ajouter un message personnalisé aux participants..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right">
                  {customMessage.length}/500
                </div>
              </div>

              {/* Options avancées */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeDetails">Inclure les détails de l'événement</Label>
                  <Switch
                    id="includeDetails"
                    checked={includeEventDetails}
                    onCheckedChange={setIncludeEventDetails}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeWeather">Inclure les infos météo (si disponible)</Label>
                  <Switch
                    id="includeWeather"
                    checked={includeWeatherInfo}
                    onCheckedChange={setIncludeWeatherInfo}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleScheduleReminder}
              disabled={scheduleReminderMutation.isPending || isPastEvent}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {scheduleReminderMutation.isPending ? "Programmation..." : "Programmer le rappel"}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSendImmediate}
              disabled={sendImmediateReminderMutation.isPending || isPastEvent}
            >
              <Send className="w-4 h-4 mr-2" />
              {sendImmediateReminderMutation.isPending ? "Envoi..." : "Envoyer maintenant"}
            </Button>
          </div>

          {isPastEvent && (
            <p className="text-sm text-gray-500 text-center">
              Les rappels ne peuvent pas être envoyés pour les événements passés.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReminderScheduler;