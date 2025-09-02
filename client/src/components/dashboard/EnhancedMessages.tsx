import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Event, Message } from "@shared/schema";
import { Search, Send, Trash2, MessageCircle, Users, Calendar, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EnhancedMessage extends Message {
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'reminder' | 'update' | 'welcome' | 'cancellation';
}

export default function EnhancedMessages() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messageFilter, setMessageFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Templates prédéfinis
  const messageTemplates: MessageTemplate[] = [
    {
      id: 'welcome',
      name: 'Message de bienvenue',
      content: 'Bienvenue dans cet événement ! N\'hésitez pas si vous avez des questions concernant le covoiturage ou l\'organisation.',
      category: 'welcome'
    },
    {
      id: 'reminder-1day',
      name: 'Rappel - 1 jour avant',
      content: 'Rappel : L\'événement a lieu demain ! Vérifiez l\'heure de rendez-vous et n\'oubliez pas de prévenir votre conducteur en cas d\'imprévu.',
      category: 'reminder'
    },
    {
      id: 'update-location',
      name: 'Changement de lieu',
      content: 'Information importante : Le point de rendez-vous a été modifié. Consultez les détails de l\'événement pour la nouvelle adresse.',
      category: 'update'
    },
    {
      id: 'weather-alert',
      name: 'Alerte météo',
      content: 'Attention à la météo prévue pour l\'événement. Pensez à adapter votre équipement et votre conduite si nécessaire.',
      category: 'update'
    },
    {
      id: 'thank-you',
      name: 'Remerciements',
      content: 'Merci à tous pour votre participation ! J\'espère que vous avez passé un bon moment. À bientôt pour de nouveaux événements !',
      category: 'update'
    }
  ];

  // Récupérer les événements
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Filtrer les événements selon la recherche
  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.sport.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Récupérer les messages pour l'événement sélectionné
  const { data: messages = [], isLoading: messagesLoading } = useQuery<EnhancedMessage[]>({
    queryKey: [`/api/events/${selectedEventId}/messages`],
    enabled: !!selectedEventId,
    refetchInterval: 30000, // Actualiser toutes les 30 secondes
  });

  // Récupérer les participants pour l'événement sélectionné
  const { data: participants = [] } = useQuery({
    queryKey: [`/api/events/${selectedEventId}/participants`],
    enabled: !!selectedEventId,
  });

  // Filtrer les messages selon le filtre sélectionné
  const filteredMessages = messages.filter(message => {
    if (messageFilter === 'sent') return message.isFromOrganizer;
    if (messageFilter === 'received') return !message.isFromOrganizer;
    return true;
  });

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedEventId) throw new Error("Aucun événement sélectionné");
      return apiRequest("POST", `/api/events/${selectedEventId}/messages`, { content });
    },
    onSuccess: () => {
      setMessageContent("");
      setSelectedTemplate("");
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/messages`] });
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé à tous les participants.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'envoyer le message.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!selectedEventId) throw new Error("Aucun événement sélectionné");
      return apiRequest("DELETE", `/api/events/${selectedEventId}/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedEventId}/messages`] });
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de supprimer le message.",
        variant: "destructive",
      });
    },
  });

  // Envoyer un message
  const handleSendMessage = () => {
    const content = messageContent.trim();
    if (!content || !selectedEventId) return;
    
    sendMessageMutation.mutate(content);
  };

  // Supprimer un message
  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  // Utiliser un template
  const handleTemplateSelect = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  // Scroll automatique vers le bas des messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const messageStats = {
    total: messages.length,
    sent: messages.filter(m => m.isFromOrganizer).length,
    received: messages.filter(m => !m.isFromOrganizer).length,
    participants: participants.length
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messagerie</h1>
          <p className="text-gray-600">Communiquez efficacement avec les participants de vos événements.</p>
        </div>
        
        {selectedEventId && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>{messageStats.participants} participants</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span>{messageStats.total} messages</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 h-[600px]">
        {/* Liste des événements */}
        <Card className="col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Événements</CardTitle>
              <Badge variant="outline">{filteredEvents.length}</Badge>
            </div>
            
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher un événement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-[480px] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-2">Aucun événement trouvé</p>
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? "Modifiez votre recherche" : "Créez votre premier événement pour commencer"}
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedEventId === event.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                    }`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{event.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{event.sport}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{format(new Date(event.date), "dd MMM yyyy", { locale: fr })}</span>
                          <span>{participants.length} participants</span>
                        </div>
                      </div>
                      
                      {new Date(event.date) > new Date() ? (
                        <Badge variant="outline" className="text-xs">À venir</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Passé</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Zone de messagerie */}
        <Card className="col-span-8">
          {selectedEventId ? (
            <div className="flex flex-col h-full">
              {/* En-tête de conversation */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedEvent?.name}</h3>
                      <p className="text-sm text-gray-600">{selectedEvent?.sport}</p>
                    </div>
                  </div>
                  
                  <Select value={messageFilter} onValueChange={(value: any) => setMessageFilter(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="sent">Envoyés</SelectItem>
                      <SelectItem value="received">Reçus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">
                      {messageFilter === 'all' ? 'Aucun message' : 
                       messageFilter === 'sent' ? 'Aucun message envoyé' : 'Aucun message reçu'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      La conversation avec les participants apparaîtra ici.
                    </p>
                  </div>
                ) : (
                  <>
                    {filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromOrganizer ? "justify-end" : "justify-start"}`}
                      >
                        {!message.isFromOrganizer && (
                          <Avatar className="w-8 h-8 mr-3 mt-1">
                            <AvatarFallback className="text-xs">
                              {message.senderName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className={`group relative max-w-[70%] ${message.isFromOrganizer ? "ml-auto" : ""}`}>
                          <div
                            className={`rounded-2xl p-4 shadow-sm ${
                              message.isFromOrganizer
                                ? "bg-blue-600 text-white rounded-br-md"
                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            
                            <div className={`flex items-center justify-between mt-2 text-xs ${
                              message.isFromOrganizer ? "text-blue-100" : "text-gray-500"
                            }`}>
                              <span>{message.senderName}</span>
                              <div className="flex items-center gap-2">
                                <span>
                                  {format(new Date(message.createdAt), "HH:mm", { locale: fr })}
                                </span>
                                {message.isFromOrganizer && (
                                  <div className="flex items-center gap-1">
                                    {message.status === 'sent' && <Clock className="w-3 h-3" />}
                                    {message.status === 'delivered' && <CheckCircle className="w-3 h-3" />}
                                    {message.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-400" />}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {message.isFromOrganizer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 bg-white shadow-md border"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </CardContent>

              {/* Zone de saisie */}
              <div className="border-t p-4 space-y-3">
                {/* Templates */}
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Utiliser un modèle de message..." />
                  </SelectTrigger>
                  <SelectContent>
                    {messageTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Saisie de message */}
                <div className="flex gap-2">
                  <Textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Tapez votre message aux participants..."
                    className="flex-1 min-h-[40px] max-h-32 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || sendMessageMutation.isPending}
                    className="px-4"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500">
                  Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne.
                  Ce message sera envoyé à tous les {participants.length} participants.
                </p>
              </div>
            </div>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez un événement</h3>
                <p className="text-gray-600 mb-4">
                  Choisissez un événement dans la liste pour voir et gérer les messages.
                </p>
                <p className="text-sm text-gray-500">
                  Vous pourrez communiquer avec tous les participants inscrits à l'événement.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}