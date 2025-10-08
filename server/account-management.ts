// server/account-management.ts
import { db } from './db';
import { sendEmail } from './email';
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
          await this.sendAccountDeletionEmail(organization.email, organization.name, reason, deletionId);
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
   * Envoyer un email de confirmation de suppression
   */
  private static async sendAccountDeletionEmail(
    email: string,
    organizationName: string,
    reason?: string,
    deletionId?: string
  ): Promise<void> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Compte supprimé - TeamMove</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: #e8f4fd; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                .deletion-id { font-family: monospace; background: #f1f1f1; padding: 5px 10px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🗑️ Compte Supprimé</h1>
                    <p>Confirmation de suppression de votre compte TeamMove</p>
                </div>
                
                <div class="content">
                    <h2>Bonjour ${organizationName},</h2>
                    
                    <p>Nous vous confirmons que votre compte TeamMove a été supprimé avec succès.</p>
                    
                    <div class="info-box">
                        <h3>📋 Détails de la suppression</h3>
                        <ul>
                            <li><strong>Organisation :</strong> ${organizationName}</li>
                            <li><strong>Email :</strong> ${email}</li>
                            <li><strong>Date de suppression :</strong> ${new Date().toLocaleString('fr-FR')}</li>
                            ${reason ? `<li><strong>Motif :</strong> ${reason}</li>` : ''}
                            ${deletionId ? `<li><strong>Référence :</strong> <span class="deletion-id">${deletionId}</span></li>` : ''}
                        </ul>
                    </div>
                    
                    <h3>🔒 Que s'est-il passé ?</h3>
                    <p>Toutes vos données ont été définitivement supprimées de nos serveurs, incluant :</p>
                    <ul>
                        <li>Votre profil organisation</li>
                        <li>Tous vos événements créés</li>
                        <li>Toutes les invitations envoyées</li>
                        <li>Votre historique de messages</li>
                        <li>Vos données d'abonnement</li>
                    </ul>
                    
                    <h3>🔄 Vous voulez revenir ?</h3>
                    <p>Si vous changez d'avis, vous pouvez créer un nouveau compte à tout moment sur notre plateforme. Cependant, toutes vos données précédentes ont été définitivement supprimées.</p>
                    
                    <div class="info-box">
                        <p><strong>💡 Astuce :</strong> Si cette suppression était une erreur ou si vous avez des questions, contactez notre support dans les plus brefs délais.</p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>
                        Cet email a été envoyé automatiquement par TeamMove.<br>
                        Si vous n'avez pas demandé cette suppression, contactez immédiatement notre support.
                    </p>
                    <p>
                        <a href="mailto:support@teammove.app">Support TeamMove</a> |
                        <a href="https://teammove.fr">TeamMove.fr</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: email,
        subject: `🗑️ Confirmation de suppression de votre compte TeamMove - ${organizationName}`,
        html: htmlContent,
        category: 'account_deletion'
      });

      console.log(`📧 Account deletion email sent to: ${email}`);
    } catch (error) {
      console.error('Send deletion email error:', error);
      // Ne pas bloquer la suppression si l'email échoue
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