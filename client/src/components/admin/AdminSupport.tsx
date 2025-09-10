import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  MessageCircle,
  User,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Conversation {
  id: string;
  subject: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderType: 'admin' | 'organization';
  senderName: string;
  senderEmail: string;
  message: string;
  messageType: 'text' | 'system' | 'attachment';
  read: boolean;
  createdAt: string;
}

export function AdminSupport() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/admin/conversations', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        throw new Error('Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}/messages`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        throw new Error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const createNewConversation = async () => {
    if (!newConversationData.subject.trim() || !newConversationData.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newConversationData),
      });

      if (response.ok) {
        const conversation = await response.json();
        setConversations(prev => [conversation, ...prev]);
        setSelectedConversation(conversation.id);
        setShowNewConversation(false);
        setNewConversationData({ subject: '', message: '', priority: 'medium' });
        toast.success('Conversation créée avec succès');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erreur lors de la création de la conversation');
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await fetch(`/api/admin/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        // Mettre à jour la conversation dans la liste
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation 
              ? { ...conv, lastMessageAt: new Date().toISOString() }
              : conv
          )
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const closeConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}/close`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (response.ok) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { ...conv, status: 'closed' as const }
              : conv
          )
        );
        toast.success('Conversation fermée');
      }
    } catch (error) {
      console.error('Error closing conversation:', error);
      toast.error('Erreur lors de la fermeture de la conversation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Ouverte</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Fermée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Haute</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Moyenne</Badge>;
      case 'low':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Basse</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Support
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setShowNewConversation(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation.id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {conversation.subject}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(conversation.status)}
                        {getPriorityBadge(conversation.priority)}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDistanceToNow(new Date(conversation.lastMessageAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {conversations.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Aucune conversation</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="lg:col-span-2">
        {showNewConversation ? (
          <div>
            <CardHeader>
              <CardTitle>Nouvelle conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Sujet de la conversation"
                value={newConversationData.subject}
                onChange={(e) => setNewConversationData(prev => ({ ...prev, subject: e.target.value }))}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Priorité</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={newConversationData.priority}
                  onChange={(e) => setNewConversationData(prev => ({ 
                    ...prev, 
                    priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                  }))}
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <Textarea
                placeholder="Décrivez votre demande..."
                rows={6}
                value={newConversationData.message}
                onChange={(e) => setNewConversationData(prev => ({ ...prev, message: e.target.value }))}
              />

              <div className="flex gap-3">
                <Button 
                  onClick={createNewConversation}
                  disabled={sending}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowNewConversation(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </div>
        ) : selectedConv ? (
          <div className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedConv.subject}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedConv.status)}
                    {getPriorityBadge(selectedConv.priority)}
                  </div>
                </div>
                {selectedConv.status !== 'closed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => closeConversation(selectedConv.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Fermer
                  </Button>
                )}
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.senderType === 'organization' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderType === 'organization'
                          ? 'bg-blue-500 text-white'
                          : message.messageType === 'system'
                          ? 'bg-gray-100 text-gray-600 text-center italic'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.messageType !== 'system' && (
                        <div className="flex items-center gap-2 mb-1">
                          {message.senderType === 'admin' ? (
                            <Shield className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          <span className="text-xs font-medium">
                            {message.senderType === 'admin' ? 'Administration' : 'Vous'}
                          </span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <p className={`text-xs mt-2 ${
                        message.senderType === 'organization' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatDistanceToNow(new Date(message.createdAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              {selectedConv.status !== 'closed' && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={2}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </div>
        ) : (
          <CardContent className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4" />
              <p>Sélectionnez une conversation ou créez-en une nouvelle</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}