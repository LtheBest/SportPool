import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Event, Message } from "@shared/schema";

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

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

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
    
    // TODO: Send message via API
    setMessageContent("");
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
        <p className="text-gray-600">Communiquez avec les participants de vos événements.</p>
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
                className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedConversation === conversation.eventId ? "bg-blue-50" : ""
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
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-comment-dots text-gray-400 text-3xl mb-2"></i>
                    <p className="text-gray-600">Aucun message pour cet événement</p>
                  </div>
                ) : (
                  messages.map((message: any) => (
                    <div 
                      key={message.id}
                      className={`flex items-start space-x-2 ${
                        message.isFromOrganizer ? "justify-end" : ""
                      }`}
                    >
                      {!message.isFromOrganizer && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {message.senderName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex-1 ${message.isFromOrganizer ? "flex justify-end" : ""}`}>
                        <div className={`rounded-lg p-3 max-w-md ${
                          message.isFromOrganizer 
                            ? "bg-primary text-white" 
                            : "bg-gray-100"
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {message.senderName} • {new Date(message.createdAt).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {message.isFromOrganizer && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>VO</AvatarFallback>
                        </Avatar>
                      )}
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
    </div>
  );
}
