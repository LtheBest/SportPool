import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface DashboardStats {
  activeEvents: number;
  totalParticipants: number;
  totalDrivers: number;
  totalSeats: number;
  occupiedSeats?: number;
  availableSeatsRemaining?: number;
}

interface StatsContextType {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  error: any;
  refreshStats: () => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    queryClient = useQueryClient();
  } catch (error) {
    console.warn("QueryClient not available in StatsProvider:", error);
  }

  // Main stats query with aggressive real-time updates
  const { 
    data: stats, 
    isLoading, 
    error, 
    refetch: refreshStats 
  } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    enabled: isAuthenticated,
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0, // Always consider stale for real-time updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Set up event listeners for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen for custom events that might trigger stats updates
    const handleStatsUpdate = () => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
    };

    const handleEventCreated = () => {
      // Immediately update stats when events are created
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      }
    };

    const handleParticipantUpdate = () => {
      // Immediately update stats when participants change
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
    };

    // Custom event listeners
    window.addEventListener('stats-update', handleStatsUpdate);
    window.addEventListener('event-created', handleEventCreated);
    window.addEventListener('participant-updated', handleParticipantUpdate);

    // Periodic invalidation for real-time updates
    const intervalId = setInterval(() => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
    }, 10000); // Every 10 seconds

    return () => {
      window.removeEventListener('stats-update', handleStatsUpdate);
      window.removeEventListener('event-created', handleEventCreated);
      window.removeEventListener('participant-updated', handleParticipantUpdate);
      clearInterval(intervalId);
    };
  }, [isAuthenticated, queryClient]);

  const value: StatsContextType = {
    stats,
    isLoading,
    error,
    refreshStats,
  };

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}

// Helper functions to trigger real-time updates
export const triggerStatsUpdate = () => {
  window.dispatchEvent(new CustomEvent('stats-update'));
};

export const triggerEventCreated = () => {
  window.dispatchEvent(new CustomEvent('event-created'));
};

export const triggerParticipantUpdate = () => {
  window.dispatchEvent(new CustomEvent('participant-updated'));
};