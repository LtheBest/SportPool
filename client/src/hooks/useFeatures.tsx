import { useAuth } from "@/hooks/useAuth";

// Liste des fonctionnalités disponibles
export const AVAILABLE_FEATURES = {
  MESSAGING: "messaging",
  ANALYTICS: "analytics", 
  CUSTOM_BRANDING: "custom_branding",
  BULK_INVITE: "bulk_invite",
  EVENT_TEMPLATES: "event_templates",
  PRIORITY_SUPPORT: "priority_support",
  CSV_IMPORT: "csv_import", // Nouvelle fonctionnalité
  ADVANCED_STATS: "advanced_stats", // Nouvelle fonctionnalité
} as const;

export type FeatureKey = typeof AVAILABLE_FEATURES[keyof typeof AVAILABLE_FEATURES];

// Descriptions des fonctionnalités
export const FEATURE_DESCRIPTIONS = {
  [AVAILABLE_FEATURES.MESSAGING]: {
    name: "Messagerie avancée",
    description: "Communication avec participants et notifications automatiques",
    icon: "fas fa-envelope",
    category: "Communication"
  },
  [AVAILABLE_FEATURES.ANALYTICS]: {
    name: "Analytics",
    description: "Statistiques détaillées et rapports avancés",
    icon: "fas fa-chart-line", 
    category: "Analyse"
  },
  [AVAILABLE_FEATURES.CUSTOM_BRANDING]: {
    name: "Personnalisation",
    description: "Logo et couleurs personnalisés pour votre organisation",
    icon: "fas fa-palette",
    category: "Apparence"
  },
  [AVAILABLE_FEATURES.BULK_INVITE]: {
    name: "Invitations en masse", 
    description: "Inviter plusieurs participants simultanément",
    icon: "fas fa-users-plus",
    category: "Gestion"
  },
  [AVAILABLE_FEATURES.EVENT_TEMPLATES]: {
    name: "Modèles d'événements",
    description: "Réutiliser des configurations d'événements",
    icon: "fas fa-copy",
    category: "Gestion"
  },
  [AVAILABLE_FEATURES.PRIORITY_SUPPORT]: {
    name: "Support prioritaire",
    description: "Assistance dédiée et réponse rapide",
    icon: "fas fa-headset",
    category: "Support"
  },
  [AVAILABLE_FEATURES.CSV_IMPORT]: {
    name: "Import CSV/Excel",
    description: "Importer des listes d'emails depuis des fichiers",
    icon: "fas fa-file-csv",
    category: "Import/Export"
  },
  [AVAILABLE_FEATURES.ADVANCED_STATS]: {
    name: "Statistiques avancées",
    description: "Analyses poussées et tableaux de bord détaillés",
    icon: "fas fa-chart-pie",
    category: "Analyse"
  }
} as const;

/**
 * Hook pour vérifier les permissions des fonctionnalités
 */
export function useFeatures() {
  const { organization, isAuthenticated } = useAuth();

  /**
   * Vérifie si une fonctionnalité est activée pour l'organisation
   */
  const hasFeature = (feature: FeatureKey): boolean => {
    if (!isAuthenticated || !organization) return false;
    
    // Les admins ont accès à toutes les fonctionnalités
    if (organization.role === 'admin') return true;
    
    // Vérifier si l'organisation est active
    if (!organization.isActive) return false;
    
    // Vérifier si la fonctionnalité est dans la liste des fonctionnalités autorisées
    return organization.features?.includes(feature) ?? false;
  };

  /**
   * Vérifie plusieurs fonctionnalités en même temps
   */
  const hasFeatures = (features: FeatureKey[]): boolean => {
    return features.every(feature => hasFeature(feature));
  };

  /**
   * Vérifie si au moins une des fonctionnalités est activée
   */
  const hasAnyFeature = (features: FeatureKey[]): boolean => {
    return features.some(feature => hasFeature(feature));
  };

  /**
   * Récupère toutes les fonctionnalités activées
   */
  const getActiveFeatures = (): FeatureKey[] => {
    if (!isAuthenticated || !organization) return [];
    
    if (organization.role === 'admin') {
      return Object.values(AVAILABLE_FEATURES);
    }
    
    return (organization.features || []).filter(feature => 
      Object.values(AVAILABLE_FEATURES).includes(feature as FeatureKey)
    ) as FeatureKey[];
  };

  /**
   * Récupère les informations d'une fonctionnalité
   */
  const getFeatureInfo = (feature: FeatureKey) => {
    return FEATURE_DESCRIPTIONS[feature];
  };

  /**
   * Vérifie si l'organisation est désactivée
   */
  const isOrganizationDisabled = (): boolean => {
    return !organization?.isActive && organization?.role !== 'admin';
  };

  return {
    hasFeature,
    hasFeatures, 
    hasAnyFeature,
    getActiveFeatures,
    getFeatureInfo,
    isOrganizationDisabled,
    organization,
    availableFeatures: AVAILABLE_FEATURES,
    featureDescriptions: FEATURE_DESCRIPTIONS
  };
}

/**
 * Composant wrapper pour conditionner l'affichage selon les permissions
 */
interface FeatureGuardProps {
  feature: FeatureKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGuard({ feature, fallback = null, children }: FeatureGuardProps) {
  const { hasFeature } = useFeatures();
  
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Composant wrapper pour affichage selon plusieurs fonctionnalités (ET logique)
 */
interface MultipleFeaturesGuardProps {
  features: FeatureKey[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function MultipleFeaturesGuard({ features, fallback = null, children }: MultipleFeaturesGuardProps) {
  const { hasFeatures } = useFeatures();
  
  return hasFeatures(features) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Composant wrapper pour affichage selon au moins une fonctionnalité (OU logique)
 */
interface AnyFeatureGuardProps {
  features: FeatureKey[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function AnyFeatureGuard({ features, fallback = null, children }: AnyFeatureGuardProps) {
  const { hasAnyFeature } = useFeatures();
  
  return hasAnyFeature(features) ? <>{children}</> : <>{fallback}</>;
}