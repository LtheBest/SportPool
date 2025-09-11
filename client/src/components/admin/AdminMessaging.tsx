import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { AdminConversation, AdminMessage } from "@shared/schema";

interface Organization {
  id: string;
  name: string;
  email: string;
  subscriptionType: string;
  role?: string;
}

interface ConversationWithDetails extends AdminConversation {
  organizationName: string;
  organizationEmail: string;
  unreadCount: number;
  messages: AdminMessage[];
}

export default function AdminMessaging() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    organizationId: "",
    subject: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent"
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = organization?.role === 'admin';

  // Récupérer toutes les conversations
  const { data: conversations = [], isLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/admin/conversations"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Récupérer toutes les organisations (pour les admins)
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: isAdmin,
  });

  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (params: { conversationId: string; message: string }) => {
      const { apiRequest } = await import("@/lib/queryClient");
      return await apiRequest("POST", `/api/admin/conversations/${params.conversationId}/messages`, {
        message: params.message
      });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  });

  // Mutation pour créer une nouvelle conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: typeof newConversationData) => {
      const { apiRequest } = await import("@/lib/queryClient");
      return await apiRequest("POST", "/api/admin/conversations", data);
    },
    onSuccess: (response) => {
      setShowNewConversation(false);
      setNewConversationData({
        organizationId: "",
        subject: "",
        message: "",
        priority: "medium"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/conversations"] });
      setSelectedConversationId(response.conversation.id);
      toast({
        title: "Succès",
        description: "Conversation créée avec succès"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la conversation",
        variant: "destructive"
      });
    }
  });

  // Mutation pour marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { apiRequest } = await import("@/lib/queryClient");
      return await apiRequest("POST", `/api/admin/conversations/${conversationId}/mark-read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/conversations"] });
    }
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      message: messageContent
    });
  };

  const handleCreateConversation = () => {
    if (!newConversationData.organizationId || !newConversationData.subject || !newConversationData.message) {
      toast({
        title: "Erreur",
        description: "Tous les champs sont requis",
        variant: "destructive"
      });
      return;
    }
    createConversationMutation.mutate(newConversationData);
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    markAsReadMutation.mutate(conversationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {isAdmin ? 'Support Client' : 'Support'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isAdmin 
                ? 'Gérez les demandes de support des utilisateurs' 
                : 'Contactez notre équipe de support'
              }
            </p>
          </div>
          {(isAdmin || (!isAdmin && conversations.length === 0)) && (
            <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <i className="fas fa-plus mr-2"></i>
                  {isAdmin ? 'Nouvelle conversation' : 'Contacter le support'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {isAdmin ? 'Créer une nouvelle conversation' : 'Contacter le support'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {isAdmin && (
                    <div>
                      <Label htmlFor="organization">Organisation</Label>
                      <Select
                        value={newConversationData.organizationId}
                        onValueChange={(value) => setNewConversationData(prev => ({ ...prev, organizationId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une organisation" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.filter(org => org.role !== 'admin').map((org) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name} ({org.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="subject">Sujet</Label>
                    <Input
                      id="subject"
                      value={newConversationData.subject}
                      onChange={(e) => setNewConversationData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Décrivez brièvement votre demande"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Priorité</Label>
                    <Select
                      value={newConversationData.priority}
                      onValueChange={(value: any) => setNewConversationData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={newConversationData.message}
                      onChange={(e) => setNewConversationData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Décrivez votre problème ou votre demande en détail"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleCreateConversation}
                      disabled={createConversationMutation.isPending}
                    >
                      {createConversationMutation.isPending ? 'Création...' : 'Créer'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card className="h-[32rem] flex">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-border overflow-y-auto">
          <div className="p-4 border-b border-border">
            <Input
              placeholder="Rechercher des conversations..."
              className="w-full"
            />
          </div>

          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fas fa-headset text-gray-400 text-4xl mb-4"></i>
              <p className="text-gray-600 dark:text-gray-400">
                {isAdmin ? 'Aucune conversation de support' : 'Aucune conversation'}
              </p>
              <p className="text-gray-500 text-sm">
                {isAdmin 
                  ? 'Les demandes de support apparaîtront ici'
                  : 'Contactez le support pour commencer une conversation'
                }
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id ? 'bg-muted' : ''
                }`}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm truncate pr-2">{conversation.subject}</h3>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getPriorityColor(conversation.priority)}>
                    {conversation.priority}
                  </Badge>
                  <Badge className={getStatusColor(conversation.status)}>
                    {conversation.status}
                  </Badge>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p className="truncate">{conversation.organizationName}</p>
                  <p>{new Date(conversation.lastMessageAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedConversation.subject}</h2>
                    <p className="text-sm text-muted-foreground">
                      avec {selectedConversation.organizationName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(selectedConversation.priority)}>
                      {selectedConversation.priority}
                    </Badge>
                    <Badge className={getStatusColor(selectedConversation.status)}>
                      {selectedConversation.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((message) => {
                  const isFromCurrentUser = isAdmin ? 
                    message.senderType === 'admin' : 
                    message.senderType === 'organization';
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isFromCurrentUser ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`rounded-lg p-3 ${
                            isFromCurrentUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{message.senderType === 'admin' ? 'Support' : selectedConversation.organizationName}</span>
                          <span>•</span>
                          <span>{new Date(message.createdAt).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Tapez votre message..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim() || sendMessageMutation.isPending}
                    size="sm"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-headset text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-600 dark:text-gray-400">
                  Sélectionnez une conversation
                </p>
                <p className="text-gray-500 text-sm">
                  Choisissez une conversation pour voir les messages
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}