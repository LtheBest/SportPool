import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

export interface FeatureToggle {
  id: string;
  featureKey: string;
  featureName: string;
  description?: string;
  isEnabled: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

// Hook pour récupérer les features publiques
export function useFeatures() {
  return useQuery({
    queryKey: ['/api/features'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook pour vérifier si une feature est activée
export function useFeature(featureKey: string) {
  const { data: featuresData } = useFeatures();
  
  const isEnabled = featuresData?.success ? featuresData.features[featureKey] ?? true : true;
  
  return {
    isEnabled,
    isLoading: !featuresData
  };
}

// Hook pour l'administration des features (admin seulement)
export function useAdminFeatures() {
  return useQuery({
    queryKey: ['/api/admin/features'],
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Hook pour mettre à jour une feature (admin seulement)
export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureKey, isEnabled }: { featureKey: string; isEnabled: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/features/${featureKey}`, {
        isEnabled
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/features'] });
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      
      toast.success(data.message || `Feature ${variables.isEnabled ? 'activée' : 'désactivée'}`);
    },
    onError: (error: any) => {
      console.error('Error updating feature:', error);
      toast.error('Erreur lors de la mise à jour de la feature');
    }
  });
}

// Hook pour rafraîchir le cache des features (admin seulement)
export function useRefreshFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/features/refresh');
      return response.json();
    },
    onSuccess: (data) => {
      // Invalider tous les caches liés aux features
      queryClient.invalidateQueries({ queryKey: ['/api/admin/features'] });
      queryClient.invalidateQueries({ queryKey: ['/api/features'] });
      
      toast.success(data.message || 'Cache rafraîchi');
    },
    onError: (error: any) => {
      console.error('Error refreshing features:', error);
      toast.error('Erreur lors du rafraîchissement');
    }
  });
}

// Hook pour récupérer les organisations (admin seulement)
export function useAdminOrganizations() {
  return useQuery({
    queryKey: ['/api/admin/organizations'],
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Hook pour supprimer une organisation (admin seulement)
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/organizations/${organizationId}`);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalider le cache des organisations
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      
      toast.success(data.message || 'Organisation supprimée');
    },
    onError: (error: any) => {
      console.error('Error deleting organization:', error);
      toast.error('Erreur lors de la suppression');
    }
  });
}

// Helpers pour des features spécifiques
export const FeatureFlags = {
  // UI Features
  useDarkMode: () => useFeature('dark_mode'),
  
  // Event Features
  useCanDeleteEvents: () => useFeature('delete_events'),
  useCanExportEvents: () => useFeature('event_export'),
  
  // Profile Features
  useCanUploadProfile: () => useFeature('user_profile_upload'),
  
  // Communication Features
  useEventMessaging: () => useFeature('event_messaging'),
  useAutoInvitations: () => useFeature('auto_invitations'),
  useEmailNotifications: () => useFeature('email_notifications'),
  
  // Subscription Features
  useCanUpgradeSubscription: () => useFeature('subscription_upgrade'),
  
  // Support Features
  useChatbot: () => useFeature('chatbot_support'),
  
  // Analytics Features
  useAnalytics: () => useFeature('analytics_tracking'),
};

export default useFeatures;