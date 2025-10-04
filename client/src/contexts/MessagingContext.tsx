import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  eventId: string;
  content: string;
  senderName: string;
  senderEmail: string;
  isFromOrganizer: boolean;
  createdAt: string;
  replyToId?: string;
}

interface MessagingContextType {
  sendBroadcastMessage: (eventId: string, message: string) => Promise<void>;
  sendReplyMessage: (eventId: string, message: string, replyToId?: string) => Promise<void>;
  getEventMessages: (eventId: string) => Message[];
  isLoading: boolean;
  error: any;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mutation for sending broadcast messages to all event participants
  const broadcastMutation = useMutation({
    mutationFn: async ({ eventId, message }: { eventId: string; message: string }) => {
      return await apiRequest('POST', `/api/events/${eventId}/broadcast`, {
        message,
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/messages`] });
      toast({
        title: 'Message envoyé',
        description: 'Votre message a été envoyé à tous les participants.',
      });
    },
    onError: (error: any) => {
      console.error('Broadcast message error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for sending reply messages
  const replyMutation = useMutation({
    mutationFn: async ({ 
      eventId, 
      message, 
      replyToId 
    }: { 
      eventId: string; 
      message: string; 
      replyToId?: string 
    }) => {
      return await apiRequest('POST', `/api/events/${eventId}/messages`, {
        content: message,
        replyToId,
      });
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/messages`] });
      toast({
        title: 'Réponse envoyée',
        description: 'Votre réponse a été envoyée.',
      });
    },
    onError: (error: any) => {
      console.error('Reply message error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la réponse. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  const sendBroadcastMessage = async (eventId: string, message: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await broadcastMutation.mutateAsync({ eventId, message });
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendReplyMessage = async (eventId: string, message: string, replyToId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await replyMutation.mutateAsync({ eventId, message, replyToId });
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getEventMessages = (eventId: string): Message[] => {
    const queryKey = [`/api/events/${eventId}/messages`];
    const data = queryClient.getQueryData<Message[]>(queryKey);
    return data || [];
  };

  const value: MessagingContextType = {
    sendBroadcastMessage,
    sendReplyMessage,
    getEventMessages,
    isLoading: isLoading || broadcastMutation.isPending || replyMutation.isPending,
    error: error || broadcastMutation.error || replyMutation.error,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}