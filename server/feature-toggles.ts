// server/feature-toggles.ts
import { db } from "./db";
import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";

// Schéma de la table feature_toggles
export const featureToggles = pgTable("feature_toggles", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureKey: varchar("feature_key", { length: 100 }).notNull().unique(),
  featureName: varchar("feature_name", { length: 200 }).notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  category: varchar("category", { length: 50 }).default("general"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type pour les features
export interface FeatureToggle {
  id: string;
  featureKey: string;
  featureName: string;
  description?: string;
  isEnabled: boolean;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cache en mémoire pour les performances
class FeatureToggleCache {
  private cache = new Map<string, boolean>();
  private lastRefresh: Date | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async isEnabled(featureKey: string): Promise<boolean> {
    // Vérifier si le cache doit être rafraîchi
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }

    // Retourner la valeur du cache ou true par défaut
    return this.cache.get(featureKey) ?? true;
  }

  private shouldRefreshCache(): boolean {
    return !this.lastRefresh || 
           (Date.now() - this.lastRefresh.getTime()) > this.CACHE_TTL;
  }

  private async refreshCache(): Promise<void> {
    try {
      const features = await db.select().from(featureToggles);
      
      this.cache.clear();
      for (const feature of features) {
        this.cache.set(feature.featureKey, feature.isEnabled);
      }
      
      this.lastRefresh = new Date();
      console.log(`✅ Feature toggles cache refreshed (${features.length} features)`);
    } catch (error) {
      console.error('❌ Error refreshing feature toggles cache:', error);
    }
  }

  invalidate(): void {
    this.cache.clear();
    this.lastRefresh = null;
  }

  // Méthode pour forcer le refresh
  async forceRefresh(): Promise<void> {
    this.lastRefresh = null;
    await this.refreshCache();
  }
}

// Instance globale du cache
const featureCache = new FeatureToggleCache();

// Service principal pour les feature toggles
export class FeatureToggleService {
  // Initialiser la table et les données par défaut
  static async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing feature toggles...');
      
      // Vérifier si la table existe, sinon la créer
      await this.ensureTableExists();
      
      // Créer les features par défaut si elles n'existent pas
      await this.createDefaultFeatures();
      
      // Rafraîchir le cache
      await featureCache.forceRefresh();
      
      console.log('✅ Feature toggles initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing feature toggles:', error);
      // Ne pas faire planter l'application si les features toggles ne fonctionnent pas
    }
  }

  // S'assurer que la table existe - nous allons utiliser une approche plus simple
  private static async ensureTableExists(): Promise<void> {
    try {
      // Essayer de faire une requête simple pour voir si la table existe
      await db.select().from(featureToggles).limit(1);
      console.log('✅ Feature toggles table exists');
    } catch (error) {
      console.log('⚠️ Feature toggles table might not exist, but we\'ll try to create features anyway');
      // La table n'existe peut-être pas, mais nous allons essayer de créer les features
      // Si cela échoue, l'erreur sera gérée dans createDefaultFeatures
    }
  }

  // Créer les features par défaut
  private static async createDefaultFeatures(): Promise<void> {
    const defaultFeatures = [
      {
        featureKey: 'dark_mode',
        featureName: 'Mode Sombre',
        description: 'Permet aux utilisateurs de basculer entre le mode clair et sombre',
        category: 'ui',
        isEnabled: true
      },
      {
        featureKey: 'delete_events',
        featureName: 'Suppression d\'événements',
        description: 'Permet aux utilisateurs de supprimer les événements qu\'ils ont créés',
        category: 'events',
        isEnabled: true
      },
      {
        featureKey: 'user_profile_upload',
        featureName: 'Upload de photo de profil',
        description: 'Permet aux utilisateurs de télécharger une photo de profil',
        category: 'profile',
        isEnabled: true
      },
      {
        featureKey: 'event_messaging',
        featureName: 'Messagerie événementielle',
        description: 'Permet l\'envoi de messages aux participants d\'événements',
        category: 'communication',
        isEnabled: true
      },
      {
        featureKey: 'auto_invitations',
        featureName: 'Invitations automatiques',
        description: 'Envoi automatique d\'emails aux participants lors de la création d\'événements',
        category: 'communication',
        isEnabled: true
      },
      {
        featureKey: 'subscription_upgrade',
        featureName: 'Mise à niveau d\'abonnement',
        description: 'Permet aux utilisateurs de mettre à niveau leur abonnement',
        category: 'subscription',
        isEnabled: true
      },
      {
        featureKey: 'event_export',
        featureName: 'Export d\'événements',
        description: 'Permet l\'export des données d\'événements (PDF, CSV)',
        category: 'events',
        isEnabled: true
      },
      {
        featureKey: 'chatbot_support',
        featureName: 'Assistant virtuel',
        description: 'Active l\'assistant virtuel pour le support client',
        category: 'support',
        isEnabled: true
      },
      {
        featureKey: 'analytics_tracking',
        featureName: 'Suivi analytique',
        description: 'Active le suivi des statistiques et analytics',
        category: 'analytics',
        isEnabled: true
      },
      {
        featureKey: 'email_notifications',
        featureName: 'Notifications email',
        description: 'Active l\'envoi de notifications par email',
        category: 'communication',
        isEnabled: true
      }
    ];

    for (const feature of defaultFeatures) {
      try {
        // Vérifier si la feature existe déjà
        const existing = await db.select()
          .from(featureToggles)
          .where(eq(featureToggles.featureKey, feature.featureKey))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(featureToggles).values(feature);
          console.log(`✅ Created default feature: ${feature.featureKey}`);
        }
      } catch (error) {
        console.error(`❌ Error creating feature ${feature.featureKey}:`, error);
        // Continue with other features
      }
    }
  }
  // Vérifier si une feature est activée
  static async isEnabled(featureKey: string): Promise<boolean> {
    try {
      return await featureCache.isEnabled(featureKey);
    } catch (error) {
      console.error(`❌ Error checking feature ${featureKey}:`, error);
      // En cas d'erreur, retourner true par défaut (fail-safe)
      return true;
    }
  }

  // Obtenir toutes les features
  static async getAllFeatures(): Promise<FeatureToggle[]> {
    try {
      const features = await db.select().from(featureToggles).orderBy(featureToggles.category, featureToggles.featureName);
      return features;
    } catch (error) {
      console.error('❌ Error getting all features:', error);
      throw error;
    }
  }

  // Obtenir les features par catégorie
  static async getFeaturesByCategory(category: string): Promise<FeatureToggle[]> {
    try {
      const features = await db.select()
        .from(featureToggles)
        .where(eq(featureToggles.category, category))
        .orderBy(featureToggles.featureName);
      return features;
    } catch (error) {
      console.error(`❌ Error getting features for category ${category}:`, error);
      throw error;
    }
  }

  // Mettre à jour une feature (admin uniquement)
  static async updateFeature(featureKey: string, isEnabled: boolean): Promise<boolean> {
    try {
      const result = await db.update(featureToggles)
        .set({ 
          isEnabled,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(featureToggles.featureKey, featureKey));

      // Invalider le cache pour forcer le refresh
      featureCache.invalidate();

      console.log(`✅ Feature ${featureKey} ${isEnabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating feature ${featureKey}:`, error);
      throw error;
    }
  }

  // Créer une nouvelle feature
  static async createFeature(feature: Omit<FeatureToggle, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureToggle> {
    try {
      const [newFeature] = await db.insert(featureToggles)
        .values({
          featureKey: feature.featureKey,
          featureName: feature.featureName,
          description: feature.description,
          isEnabled: feature.isEnabled,
          category: feature.category,
        })
        .returning();

      // Invalider le cache
      featureCache.invalidate();

      console.log(`✅ Feature ${feature.featureKey} created`);
      return newFeature;
    } catch (error) {
      console.error(`❌ Error creating feature ${feature.featureKey}:`, error);
      throw error;
    }
  }

  // Supprimer une feature (admin uniquement)
  static async deleteFeature(featureKey: string): Promise<boolean> {
    try {
      await db.delete(featureToggles)
        .where(eq(featureToggles.featureKey, featureKey));

      // Invalider le cache
      featureCache.invalidate();

      console.log(`✅ Feature ${featureKey} deleted`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting feature ${featureKey}:`, error);
      throw error;
    }
  }

  // Obtenir les catégories disponibles
  static async getCategories(): Promise<string[]> {
    try {
      const result = await db.selectDistinct({ category: featureToggles.category })
        .from(featureToggles)
        .orderBy(featureToggles.category);
      
      return result.map(r => r.category);
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      return [];
    }
  }

  // Réinitialiser le cache (pour les tests ou le développement)
  static async refreshCache(): Promise<void> {
    await featureCache.forceRefresh();
  }
}

// Helper functions pour les features spécifiques
export const Features = {
  // UI Features
  isDarkModeEnabled: () => FeatureToggleService.isEnabled('dark_mode'),
  
  // Event Features  
  canDeleteEvents: () => FeatureToggleService.isEnabled('delete_events'),
  canExportEvents: () => FeatureToggleService.isEnabled('event_export'),
  
  // Profile Features
  canUploadProfilePhoto: () => FeatureToggleService.isEnabled('user_profile_upload'),
  
  // Communication Features
  isEventMessagingEnabled: () => FeatureToggleService.isEnabled('event_messaging'),
  areAutoInvitationsEnabled: () => FeatureToggleService.isEnabled('auto_invitations'),
  areEmailNotificationsEnabled: () => FeatureToggleService.isEnabled('email_notifications'),
  
  // Subscription Features
  canUpgradeSubscription: () => FeatureToggleService.isEnabled('subscription_upgrade'),
  
  // Support Features
  isChatbotEnabled: () => FeatureToggleService.isEnabled('chatbot_support'),
  
  // Analytics Features
  isAnalyticsEnabled: () => FeatureToggleService.isEnabled('analytics_tracking'),
};

// Middleware pour vérifier les features dans les routes
export function requireFeature(featureKey: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const isEnabled = await FeatureToggleService.isEnabled(featureKey);
      
      if (!isEnabled) {
        return res.status(403).json({
          error: 'Feature disabled',
          message: `La fonctionnalité "${featureKey}" est actuellement désactivée.`
        });
      }
      
      next();
    } catch (error) {
      console.error(`❌ Feature check middleware error for ${featureKey}:`, error);
      // En cas d'erreur, permettre l'accès (fail-safe)
      next();
    }
  };
}

// Export par défaut
export default FeatureToggleService;