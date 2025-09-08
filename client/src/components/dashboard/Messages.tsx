import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Event, Message } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import BroadcastMessageModal from "@/components/messaging/BroadcastMessageModal";
import { useMessaging } from "@/contexts/MessagingContext";

interface Conversation {
  eventId: string;
  eventName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });



  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { apiRequest } = await import("@/lib/queryClient");
      return await apiRequest("POST", `/api/events/${selectedConversation}/messages`, { 
        content: messageContent 
      });
    },
    onSuccess: () => {
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedConversation}/messages`] });
    },
    onError: (error: any) => {
      console.error("Send message error:", error);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { apiRequest } = await import("@/lib/queryClient");
      return await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${selectedConversation}/messages`] });
    },
    onError: (error: any) => {
      console.error("Delete message error:", error);
    }
  });

  const handleDeleteMessage = (id: string) => {
    if (confirm("Supprimer ce message ?")) {
      deleteMessageMutation.mutate(id);
    }
  };



  // Group messages by event and get conversations
  const conversations: Conversation[] = events.map((event) => ({
    eventId: event.id,
    eventName: event.name,
    lastMessage: "Dernière activité...",
    lastMessageTime: "14:32",
    unreadCount: Math.floor(Math.random() * 3),
  }));

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/events/${selectedConversation}/messages`],
    enabled: !!selectedConversation,
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedConversation) return;
    sendMessageMutation.mutate();
  };

  const handleBroadcastMessage = (event: Event) => {
    setSelectedEvent(event);
    setShowBroadcastModal(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
            <p className="text-gray-600">Communiquez avec les participants de vos événements.</p>
          </div>
          <Button
            onClick={() => {
              if (events.length > 0) {
                setSelectedEvent(events[0]);
                setShowBroadcastModal(true);
              }
            }}
            className="bg-primary hover:bg-blue-700"
            disabled={events.length === 0}
          >
            <i className="fas fa-bullhorn mr-2"></i>
            Diffuser un message
          </Button>
        </div>
      </div>

      <Card className="h-96 flex">
        {/* Messages List */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
              <Input
                placeholder="Rechercher..."
                className="pl-10"
              />
            </div>
          </div>

          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fas fa-comments text-gray-400 text-4xl mb-4"></i>
              <p className="text-gray-600">Aucune conversation</p>
              <p className="text-gray-500 text-sm">Les messages des participants apparaîtront ici</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.eventId}
                className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${selectedConversation === conversation.eventId ? "bg-blue-50" : ""
                  }`}
                onClick={() => setSelectedConversation(conversation.eventId)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      <i className="fas fa-calendar text-gray-500"></i>
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">{conversation.eventName}</p>
                      <span className="text-xs text-gray-500">{conversation.lastMessageTime}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Événement</span>
                      {conversation.unreadCount > 0 && (
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        <i className="fas fa-calendar text-gray-500"></i>
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {conversations.find(c => c.eventId === selectedConversation)?.eventName}
                      </p>
                      <p className="text-sm text-gray-600">Conversation de l'événement</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const event = events.find(e => e.id === selectedConversation);
                      if (event) handleBroadcastMessage(event);
                    }}
                  >
                    <i className="fas fa-bullhorn mr-1"></i>
                    Diffuser
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-comment-dots text-gray-400 text-3xl mb-2"></i>
                    <p className="text-gray-600">Aucun message pour cet événement</p>
                  </div>
                ) : ([...messages].reverse().map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromOrganizer ? "justify-end" : "justify-start"}`}
                      >
                        {!message.isFromOrganizer && (
                          <Avatar className="w-8 h-8 mr-2">
                            <AvatarFallback>
                              {message.senderName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`relative rounded-2xl p-3 max-w-xs sm:max-w-sm md:max-w-md ${message.isFromOrganizer
                            ? "bg-blue-500 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-900 rounded-bl-none"
                            }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-[10px] opacity-70 mt-1">
                            {message.senderName} •{" "}
                            {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>

                          {message.isFromOrganizer && (
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Supprimer ce message"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    ))

                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Tapez votre message..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim()}
                    className="bg-primary hover:bg-blue-700"
                  >
                    <i className="fas fa-paper-plane"></i>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-comments text-gray-400 text-4xl mb-4"></i>
                <p className="text-gray-600">Sélectionnez une conversation</p>
                <p className="text-gray-500 text-sm">Choisissez un événement pour voir les messages</p>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <BroadcastMessageModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        event={selectedEvent}
      />
    </div>
  );
}
