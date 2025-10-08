// client/src/hooks/useFeatures.ts
import { useState, useEffect } from 'react';

export interface FeatureFlags {
  [key: string]: boolean;
}

// Hook pour obtenir les fonctionnalités activées
export function useFeatures() {
  const [features, setFeatures] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/features', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setFeatures(data.features || {});
        } else {
          throw new Error('Erreur lors du chargement des fonctionnalités');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching features:', err);
        // Fonctionnalités par défaut en cas d'erreur
        setFeatures({
          theme_dark_mode: true,
          event_deletion: true,
          profile_photo_upload: true,
          email_notifications: true,
          welcome_email: true,
          event_confirmation_email: true,
          auto_member_notifications: true,
          manual_invitations: true,
          bidirectional_messaging: true,
          broadcast_messaging: true,
          support_contact: true,
          user_registration: true,
          organizer_registration: true,
          subscription_upgrade: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  // Fonction pour vérifier si une fonctionnalité est activée
  const isFeatureEnabled = (featureId: string): boolean => {
    return features[featureId] === true;
  };

  // Fonction pour vérifier plusieurs fonctionnalités à la fois
  const areFeaturesEnabled = (featureIds: string[]): boolean => {
    return featureIds.every(id => isFeatureEnabled(id));
  };

  return {
    features,
    loading,
    error,
    isFeatureEnabled,
    areFeaturesEnabled,
  };
}

// Hook pour vérifier une fonctionnalité spécifique
export function useFeature(featureId: string) {
  const { features, loading, isFeatureEnabled } = useFeatures();

  return {
    enabled: isFeatureEnabled(featureId),
    loading,
    feature: features[featureId],
  };
}