import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  eventId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications from API
  const { data: apiNotifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000,
  });

  // Update local notifications when API data changes
  useEffect(() => {
    if (apiNotifications.length > 0) {
      setNotifications(prev => {
        // Merge API notifications with local ones, avoid duplicates
        const existingIds = prev.map(n => n.id);
        const newNotifications = apiNotifications.filter(n => !existingIds.includes(n.id));
        return [...prev, ...newNotifications];
      });
    }
  }, [apiNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const removeNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };

  // Listen for real-time events (WebSocket or Server-Sent Events would be better in production)
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollForUpdates = setInterval(async () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      } catch (error) {
        console.error('Failed to poll for notification updates:', error);
      }
    }, 60000); // Poll every minute

    return () => clearInterval(pollForUpdates);
  }, [isAuthenticated, queryClient]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}