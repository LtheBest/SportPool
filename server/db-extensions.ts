// server/db-extensions.ts
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

export interface DeletionArchive {
  deletionId: string;
  organizationId: string;
  organizationEmail: string;
  organizationName: string;
  planType: string;
  createdAt: string;
  deletedAt: string;
  deletionReason?: string;
  deletedBy?: string;
  totalEvents?: number;
  totalInvitations?: number;
}

// Extension des méthodes de base de données pour les nouvelles fonctionnalités
export class DatabaseExtensions {
  
  // === FEATURE FLAGS ===
  
  static async createFeatureFlag(feature: FeatureFlag): Promise<boolean> {
    try {
      // Pour cette démo, nous utilisons le localStorage côté serveur ou une variable globale
      const features = this.getStoredFeatures();
      features[feature.id] = feature;
      this.setStoredFeatures(features);
      return true;
    } catch (error) {
      console.error('Error creating feature flag:', error);
      return false;
    }
  }

  static async getFeatureFlag(id: string): Promise<FeatureFlag | null> {
    try {
      const features = this.getStoredFeatures();
      return features[id] || null;
    } catch (error) {
      console.error('Error getting feature flag:', error);
      return null;
    }
  }

  static async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const features = this.getStoredFeatures();
      return Object.values(features);
    } catch (error) {
      console.error('Error getting all feature flags:', error);
      return [];
    }
  }

  static async updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): Promise<boolean> {
    try {
      const features = this.getStoredFeatures();
      if (features[id]) {
        features[id] = { ...features[id], ...updates };
        this.setStoredFeatures(features);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating feature flag:', error);
      return false;
    }
  }

  static async deleteFeatureFlag(id: string): Promise<boolean> {
    try {
      const features = this.getStoredFeatures();
      if (features[id]) {
        delete features[id];
        this.setStoredFeatures(features);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting feature flag:', error);
      return false;
    }
  }

  // === ACCOUNT MANAGEMENT ===
  
  static async getOrganization(id: string): Promise<any> {
    try {
      // Utiliser la méthode existante ou adapter selon votre structure DB
      return await db.getOrganization(id);
    } catch (error) {
      console.error('Error getting organization:', error);
      return null;
    }
  }

  static async updateOrganization(id: string, updates: any): Promise<boolean> {
    try {
      // Adapter selon votre structure de base de données
      const success = await db.updateOrganization(id, updates);
      return success;
    } catch (error) {
      console.error('Error updating organization:', error);
      return false;
    }
  }

  static async deleteOrganization(id: string): Promise<boolean> {
    try {
      return await db.deleteOrganization(id);
    } catch (error) {
      console.error('Error deleting organization:', error);
      return false;
    }
  }

  static async deleteEventsByOrganization(organizationId: string): Promise<boolean> {
    try {
      const events = await db.getEventsByOrganization(organizationId);
      for (const event of events) {
        await db.deleteEvent(event.id);
      }
      return true;
    } catch (error) {
      console.error('Error deleting events by organization:', error);
      return false;
    }
  }

  static async deleteInvitationsByOrganization(organizationId: string): Promise<boolean> {
    try {
      // Implémenter selon votre structure
      // await db.deleteInvitationsByOrganization(organizationId);
      return true;
    } catch (error) {
      console.error('Error deleting invitations by organization:', error);
      return false;
    }
  }

  static async deleteMessagesByOrganization(organizationId: string): Promise<boolean> {
    try {
      // Implémenter selon votre structure
      // await db.deleteMessagesByOrganization(organizationId);
      return true;
    } catch (error) {
      console.error('Error deleting messages by organization:', error);
      return false;
    }
  }

  static async getEventCountByOrganization(organizationId: string): Promise<number> {
    try {
      const events = await db.getEventsByOrganization(organizationId);
      return events.length;
    } catch (error) {
      console.error('Error getting event count:', error);
      return 0;
    }
  }

  static async getInvitationCountByOrganization(organizationId: string): Promise<number> {
    try {
      // Implémenter selon votre structure
      return 0;
    } catch (error) {
      console.error('Error getting invitation count:', error);
      return 0;
    }
  }

  static async createDeletionArchive(archiveData: DeletionArchive): Promise<boolean> {
    try {
      // Stocker l'archive (fichier, base de données, etc.)
      const archives = this.getStoredArchives();
      archives[archiveData.deletionId] = archiveData;
      this.setStoredArchives(archives);
      return true;
    } catch (error) {
      console.error('Error creating deletion archive:', error);
      return false;
    }
  }

  static async getOrganizationsWithFilters(
    filters: any, 
    options: { limit: number; offset: number; sortBy: string; sortOrder: string }
  ): Promise<any[]> {
    try {
      // Implémenter la recherche avec filtres
      const allOrgs = await db.getAllOrganizations();
      
      let filteredOrgs = allOrgs;
      
      // Appliquer les filtres
      if (filters.search) {
        filteredOrgs = filteredOrgs.filter(org => 
          org.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          org.email.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      if (filters.planType) {
        filteredOrgs = filteredOrgs.filter(org => org.planType === filters.planType);
      }

      // Tri
      filteredOrgs.sort((a, b) => {
        const aVal = a[options.sortBy];
        const bVal = b[options.sortBy];
        return options.sortOrder === 'asc' ? 
          (aVal > bVal ? 1 : -1) : 
          (aVal < bVal ? 1 : -1);
      });

      // Pagination
      return filteredOrgs.slice(options.offset, options.offset + options.limit);
    } catch (error) {
      console.error('Error getting organizations with filters:', error);
      return [];
    }
  }

  static async getOrganizationsCount(filters: any): Promise<number> {
    try {
      const allOrgs = await db.getAllOrganizations();
      
      let filteredOrgs = allOrgs;
      
      if (filters.search) {
        filteredOrgs = filteredOrgs.filter(org => 
          org.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          org.email.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      if (filters.planType) {
        filteredOrgs = filteredOrgs.filter(org => org.planType === filters.planType);
      }

      return filteredOrgs.length;
    } catch (error) {
      console.error('Error getting organizations count:', error);
      return 0;
    }
  }

  static async getLastActivityByOrganization(organizationId: string): Promise<string | null> {
    try {
      // Implémenter selon votre structure
      // Retourner la date de dernière activité
      return new Date().toISOString();
    } catch (error) {
      console.error('Error getting last activity:', error);
      return null;
    }
  }

  static async getAccountStatistics(): Promise<any> {
    try {
      const allOrgs = await db.getAllOrganizations();
      const allEvents = await db.getEvents();
      
      return {
        totalAccounts: allOrgs.length,
        activeAccounts: allOrgs.filter(org => org.subscriptionStatus === 'active').length,
        suspendedAccounts: allOrgs.filter(org => org.status === 'suspended').length,
        expiredAccounts: allOrgs.filter(org => org.subscriptionStatus === 'expired').length,
        newAccountsThisMonth: allOrgs.filter(org => {
          const created = new Date(org.createdAt);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length,
        totalEvents: allEvents.length,
        totalInvitations: 0 // À implémenter selon votre structure
      };
    } catch (error) {
      console.error('Error getting account statistics:', error);
      return {
        totalAccounts: 0,
        activeAccounts: 0,
        suspendedAccounts: 0,
        expiredAccounts: 0,
        newAccountsThisMonth: 0,
        totalEvents: 0,
        totalInvitations: 0
      };
    }
  }

  // === UTILITAIRES POUR LE STOCKAGE (à adapter selon votre base de données) ===
  
  private static getStoredFeatures(): Record<string, FeatureFlag> {
    // Pour cette démo, utilisation d'une variable globale
    if (!global.featureFlags) {
      global.featureFlags = {};
    }
    return global.featureFlags;
  }

  private static setStoredFeatures(features: Record<string, FeatureFlag>): void {
    global.featureFlags = features;
  }

  private static getStoredArchives(): Record<string, DeletionArchive> {
    if (!global.deletionArchives) {
      global.deletionArchives = {};
    }
    return global.deletionArchives;
  }

  private static setStoredArchives(archives: Record<string, DeletionArchive>): void {
    global.deletionArchives = archives;
  }
}

// Étendre l'objet db existant avec nos nouvelles méthodes
Object.assign(db, {
  // Feature flags
  createFeatureFlag: DatabaseExtensions.createFeatureFlag,
  getFeatureFlag: DatabaseExtensions.getFeatureFlag,
  getAllFeatureFlags: DatabaseExtensions.getAllFeatureFlags,
  updateFeatureFlag: DatabaseExtensions.updateFeatureFlag,
  deleteFeatureFlag: DatabaseExtensions.deleteFeatureFlag,
  
  // Account management
  deleteEventsByOrganization: DatabaseExtensions.deleteEventsByOrganization,
  deleteInvitationsByOrganization: DatabaseExtensions.deleteInvitationsByOrganization,
  deleteMessagesByOrganization: DatabaseExtensions.deleteMessagesByOrganization,
  getEventCountByOrganization: DatabaseExtensions.getEventCountByOrganization,
  getInvitationCountByOrganization: DatabaseExtensions.getInvitationCountByOrganization,
  createDeletionArchive: DatabaseExtensions.createDeletionArchive,
  getOrganizationsWithFilters: DatabaseExtensions.getOrganizationsWithFilters,
  getOrganizationsCount: DatabaseExtensions.getOrganizationsCount,
  getLastActivityByOrganization: DatabaseExtensions.getLastActivityByOrganization,
  getAccountStatistics: DatabaseExtensions.getAccountStatistics,
});