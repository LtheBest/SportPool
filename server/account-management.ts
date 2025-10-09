// server/account-management.ts
import { db } from './db';
import { emailServiceEnhanced } from './email-enhanced';
import { FeatureFlagService } from './feature-flags';

export interface AccountDeletionParams {
  organizationId: string;
  reason?: string;
  deletedBy?: string; // ID de l'admin qui supprime le compte
  notifyUser?: boolean;
}

export interface AccountDeletionResult {
  success: boolean;
  message: string;
  organizationEmail?: string;
  deletionId?: string;
}

export class AccountManagementService {
  /**
   * Supprimer un compte utilisateur/organisateur
   */
  static async deleteAccount(params: AccountDeletionParams): Promise<AccountDeletionResult> {
    const { organizationId, reason, deletedBy, notifyUser = true } = params;

    try {
      // Récupérer les informations de l'organisation avant suppression
      const organization = await db.getOrganization(organizationId);
      if (!organization) {
        return {
          success: false,
          message: 'Organisation non trouvée'
        };
      }

      // Générer un ID unique pour cette suppression
      const deletionId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Archiver les données avant suppression (optionnel)
      await this.archiveOrganizationData(organization, deletionId, reason, deletedBy);

      // Supprimer tous les événements liés
      await db.deleteEventsByOrganization(organizationId);

      // Supprimer toutes les invitations liées
      await db.deleteInvitationsByOrganization(organizationId);

      // Supprimer les messages liés
      await db.deleteMessagesByOrganization(organizationId);

      // Supprimer l'organisation
      const deleted = await db.deleteOrganization(organizationId);

      if (!deleted) {
        throw new Error('Échec de la suppression de l\'organisation');
      }

      // Envoyer un email de confirmation si demandé et si la fonctionnalité est activée
      if (notifyUser) {
        const emailEnabled = await FeatureFlagService.isFeatureEnabled('email_notifications');
        if (emailEnabled) {
          await emailServiceEnhanced.sendAccountDeletion(organization.email, organization.name || organization.email);
        }
      }

      console.log(`✅ Account deleted: ${organizationId} (${organization.email}) by ${deletedBy || 'self'}`);

      return {
        success: true,
        message: 'Compte supprimé avec succès',
        organizationEmail: organization.email,
        deletionId
      };

    } catch (error: any) {
      console.error('Account deletion error:', error);
      return {
        success: false,
        message: `Erreur lors de la suppression: ${error.message}`
      };
    }
  }

  /**
   * Auto-suppression par l'utilisateur lui-même
   */
  static async selfDeleteAccount(organizationId: string, reason?: string): Promise<AccountDeletionResult> {
    return await this.deleteAccount({
      organizationId,
      reason: reason || 'Suppression demandée par l\'utilisateur',
      deletedBy: organizationId, // L'utilisateur se supprime lui-même
      notifyUser: true
    });
  }

  /**
   * Suppression par un admin
   */
  static async adminDeleteAccount(
    organizationId: string, 
    adminId: string, 
    reason?: string
  ): Promise<AccountDeletionResult> {
    return await this.deleteAccount({
      organizationId,
      reason: reason || 'Suppression effectuée par un administrateur',
      deletedBy: adminId,
      notifyUser: true
    });
  }

  /**
   * Archiver les données de l'organisation avant suppression
   */
  private static async archiveOrganizationData(
    organization: any,
    deletionId: string,
    reason?: string,
    deletedBy?: string
  ): Promise<void> {
    try {
      const archiveData = {
        deletionId,
        organizationId: organization.id,
        organizationEmail: organization.email,
        organizationName: organization.name,
        planType: organization.planType,
        createdAt: organization.createdAt,
        deletedAt: new Date().toISOString(),
        deletionReason: reason,
        deletedBy: deletedBy,
        // Récupérer les statistiques
        totalEvents: await db.getEventCountByOrganization(organization.id),
        totalInvitations: await db.getInvitationCountByOrganization(organization.id),
      };

      // Sauvegarder dans la table d'archive (si elle existe)
      await db.createDeletionArchive(archiveData);

      console.log(`📦 Organization data archived: ${deletionId}`);
    } catch (error) {
      console.error('Archive creation error:', error);
      // Ne pas bloquer la suppression si l'archivage échoue
    }
  }



  /**
   * Obtenir la liste des comptes pour l'admin
   */
  static async getAccountsForAdmin(params: {
    page?: number;
    limit?: number;
    search?: string;
    planType?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      planType = '', 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = params;

    try {
      const offset = (page - 1) * limit;
      
      // Construire les filtres
      const filters: any = {};
      if (search) {
        filters.search = search; // Recherche dans nom, email, etc.
      }
      if (planType) {
        filters.planType = planType;
      }

      // Récupérer les organisations avec pagination
      const organizations = await db.getOrganizationsWithFilters(filters, {
        limit,
        offset,
        sortBy,
        sortOrder
      });

      // Compter le total
      const total = await db.getOrganizationsCount(filters);

      // Enrichir les données avec des statistiques
      const enrichedOrganizations = await Promise.all(
        organizations.map(async (org: any) => {
          const [eventCount, lastActivity] = await Promise.all([
            db.getEventCountByOrganization(org.id),
            db.getLastActivityByOrganization(org.id)
          ]);

          return {
            ...org,
            eventCount,
            lastActivity,
            status: this.getAccountStatus(org)
          };
        })
      );

      return {
        organizations: enrichedOrganizations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Get accounts for admin error:', error);
      throw error;
    }
  }

  /**
   * Obtenir le statut d'un compte
   */
  private static getAccountStatus(organization: any): string {
    if (!organization.subscriptionStatus || organization.subscriptionStatus === 'cancelled') {
      return 'inactive';
    }
    
    if (organization.subscriptionEndDate) {
      const endDate = new Date(organization.subscriptionEndDate);
      const now = new Date();
      
      if (endDate < now) {
        return 'expired';
      }
      
      // Expiration dans moins de 7 jours
      const daysUntilExpiration = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiration <= 7) {
        return 'expiring_soon';
      }
    }
    
    return 'active';
  }

  /**
   * Obtenir les statistiques générales des comptes
   */
  static async getAccountStats() {
    try {
      const stats = await db.getAccountStatistics();
      return stats;
    } catch (error) {
      console.error('Get account stats error:', error);
      throw error;
    }
  }

  /**
   * Suspendre temporairement un compte (sans le supprimer)
   */
  static async suspendAccount(organizationId: string, adminId: string, reason?: string) {
    try {
      const updated = await db.updateOrganization(organizationId, {
        status: 'suspended',
        suspendedAt: new Date().toISOString(),
        suspendedBy: adminId,
        suspensionReason: reason,
        updatedAt: new Date().toISOString()
      });

      if (updated) {
        console.log(`⏸️ Account suspended: ${organizationId} by ${adminId}`);
        return { success: true, message: 'Compte suspendu avec succès' };
      } else {
        throw new Error('Échec de la suspension du compte');
      }
    } catch (error: any) {
      console.error('Account suspension error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Réactiver un compte suspendu
   */
  static async reactivateAccount(organizationId: string, adminId: string) {
    try {
      const updated = await db.updateOrganization(organizationId, {
        status: 'active',
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: adminId,
        updatedAt: new Date().toISOString()
      });

      if (updated) {
        console.log(`▶️ Account reactivated: ${organizationId} by ${adminId}`);
        return { success: true, message: 'Compte réactivé avec succès' };
      } else {
        throw new Error('Échec de la réactivation du compte');
      }
    } catch (error: any) {
      console.error('Account reactivation error:', error);
      return { success: false, message: error.message };
    }
  }
}