// server/feature-flags.ts
import { db } from './db';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  updatedAt: string;
  updatedBy?: string;
}

// Fonctionnalités par défaut
export const DEFAULT_FEATURES: Omit<FeatureFlag, 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'theme_dark_mode',
    name: 'Mode Sombre',
    description: 'Permet aux utilisateurs de basculer entre le thème clair et sombre',
    enabled: true,
    category: 'interface'
  },
  {
    id: 'event_deletion',
    name: 'Suppression d\'Événements',
    description: 'Permet aux utilisateurs de supprimer les événements qu\'ils ont créés',
    enabled: true,
    category: 'events'
  },
  {
    id: 'profile_photo_upload',
    name: 'Upload Photo de Profil',
    description: 'Permet aux utilisateurs de télécharger une photo de profil',
    enabled: true,
    category: 'profile'
  },
  {
    id: 'email_notifications',
    name: 'Notifications Email',
    description: 'Système de notifications par email automatiques',
    enabled: true,
    category: 'notifications'
  },
  {
    id: 'welcome_email',
    name: 'Email de Bienvenue',
    description: 'Envoi automatique d\'un email de bienvenue aux nouveaux utilisateurs',
    enabled: true,
    category: 'notifications'
  },
  {
    id: 'event_confirmation_email',
    name: 'Email de Confirmation d\'Événement',
    description: 'Email de confirmation lors de la création d\'un événement',
    enabled: true,
    category: 'notifications'
  },
  {
    id: 'auto_member_notifications',
    name: 'Notifications Automatiques aux Membres',
    description: 'Envoi automatique d\'emails aux membres lors de la création d\'événements',
    enabled: true,
    category: 'notifications'
  },
  {
    id: 'manual_invitations',
    name: 'Invitations Manuelles',
    description: 'Possibilité d\'envoyer des invitations manuelles après création d\'événement',
    enabled: true,
    category: 'events'
  },
  {
    id: 'bidirectional_messaging',
    name: 'Messagerie Bidirectionnelle',
    description: 'Communication entre organisateurs et membres via email',
    enabled: true,
    category: 'messaging'
  },
  {
    id: 'broadcast_messaging',
    name: 'Messages de Diffusion',
    description: 'Possibilité d\'envoyer des messages groupés aux membres',
    enabled: true,
    category: 'messaging'
  },
  {
    id: 'support_contact',
    name: 'Contact Support',
    description: 'Système de contact et support client',
    enabled: true,
    category: 'support'
  },
  {
    id: 'user_registration',
    name: 'Inscription Utilisateurs',
    description: 'Possibilité pour de nouveaux utilisateurs de s\'inscrire',
    enabled: true,
    category: 'auth'
  },
  {
    id: 'organizer_registration',
    name: 'Inscription Organisateurs',
    description: 'Possibilité pour de nouveaux organisateurs de s\'inscrire',
    enabled: true,
    category: 'auth'
  },
  {
    id: 'subscription_upgrade',
    name: 'Mise à Niveau d\'Abonnement',
    description: 'Possibilité de passer d\'une offre Découverte à une offre payante',
    enabled: true,
    category: 'subscription'
  }
];

export class FeatureFlagService {
  /**
   * Initialiser les fonctionnalités par défaut si elles n'existent pas
   */
  static async initializeDefaultFeatures() {
    try {
      for (const feature of DEFAULT_FEATURES) {
        const existing = await db.getFeatureFlag(feature.id);
        if (!existing) {
          await db.createFeatureFlag({
            ...feature,
            updatedAt: new Date().toISOString()
          });
        }
      }
      console.log('✅ Default features initialized');
    } catch (error) {
      console.error('Error initializing default features:', error);
    }
  }

  /**
   * Obtenir toutes les fonctionnalités
   */
  static async getAllFeatures(): Promise<FeatureFlag[]> {
    try {
      return await db.getAllFeatureFlags();
    } catch (error) {
      console.error('Error getting all features:', error);
      return [];
    }
  }

  /**
   * Obtenir les fonctionnalités par catégorie
   */
  static async getFeaturesByCategory(category: string): Promise<FeatureFlag[]> {
    try {
      const allFeatures = await this.getAllFeatures();
      return allFeatures.filter(feature => feature.category === category);
    } catch (error) {
      console.error('Error getting features by category:', error);
      return [];
    }
  }

  /**
   * Obtenir une fonctionnalité spécifique
   */
  static async getFeature(featureId: string): Promise<FeatureFlag | null> {
    try {
      return await db.getFeatureFlag(featureId);
    } catch (error) {
      console.error('Error getting feature:', error);
      return null;
    }
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  static async isFeatureEnabled(featureId: string): Promise<boolean> {
    try {
      const feature = await this.getFeature(featureId);
      return feature ? feature.enabled : false;
    } catch (error) {
      console.error('Error checking feature status:', error);
      return false;
    }
  }

  /**
   * Activer/désactiver une fonctionnalité (admin seulement)
   */
  static async toggleFeature(
    featureId: string, 
    enabled: boolean, 
    adminId?: string
  ): Promise<boolean> {
    try {
      const updated = await db.updateFeatureFlag(featureId, {
        enabled,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId
      });

      if (updated) {
        console.log(`✅ Feature ${featureId} ${enabled ? 'enabled' : 'disabled'} by admin ${adminId}`);
      }

      return updated;
    } catch (error) {
      console.error('Error toggling feature:', error);
      return false;
    }
  }

  /**
   * Créer une nouvelle fonctionnalité
   */
  static async createFeature(
    feature: Omit<FeatureFlag, 'updatedAt'>,
    adminId?: string
  ): Promise<boolean> {
    try {
      const newFeature: FeatureFlag = {
        ...feature,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId
      };

      return await db.createFeatureFlag(newFeature);
    } catch (error) {
      console.error('Error creating feature:', error);
      return false;
    }
  }

  /**
   * Supprimer une fonctionnalité
   */
  static async deleteFeature(featureId: string): Promise<boolean> {
    try {
      return await db.deleteFeatureFlag(featureId);
    } catch (error) {
      console.error('Error deleting feature:', error);
      return false;
    }
  }

  /**
   * Obtenir les fonctionnalités pour l'interface publique
   */
  static async getPublicFeatures(): Promise<Record<string, boolean>> {
    try {
      const features = await this.getAllFeatures();
      const publicFeatures: Record<string, boolean> = {};
      
      features.forEach(feature => {
        publicFeatures[feature.id] = feature.enabled;
      });

      return publicFeatures;
    } catch (error) {
      console.error('Error getting public features:', error);
      return {};
    }
  }

  /**
   * Middleware pour vérifier si une fonctionnalité est activée
   */
  static checkFeature(featureId: string) {
    return async (req: any, res: any, next: any) => {
      try {
        const isEnabled = await this.isFeatureEnabled(featureId);
        
        if (!isEnabled) {
          return res.status(403).json({
            success: false,
            message: 'Cette fonctionnalité est actuellement désactivée',
            feature: featureId
          });
        }
        
        next();
      } catch (error) {
        console.error('Feature check middleware error:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification des fonctionnalités'
        });
      }
    };
  }

  /**
   * Obtenir les catégories de fonctionnalités
   */
  static async getCategories(): Promise<string[]> {
    try {
      const features = await this.getAllFeatures();
      const categories = [...new Set(features.map(f => f.category))];
      return categories.sort();
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Exporter la configuration des fonctionnalités
   */
  static async exportConfiguration(): Promise<FeatureFlag[]> {
    return await this.getAllFeatures();
  }

  /**
   * Importer la configuration des fonctionnalités
   */
  static async importConfiguration(
    features: FeatureFlag[], 
    adminId?: string
  ): Promise<{ success: number; errors: string[] }> {
    const result = { success: 0, errors: [] as string[] };

    for (const feature of features) {
      try {
        const updated = await db.updateFeatureFlag(feature.id, {
          ...feature,
          updatedAt: new Date().toISOString(),
          updatedBy: adminId
        });

        if (updated) {
          result.success++;
        } else {
          result.errors.push(`Failed to update feature: ${feature.id}`);
        }
      } catch (error) {
        result.errors.push(`Error updating ${feature.id}: ${error}`);
      }
    }

    return result;
  }
}