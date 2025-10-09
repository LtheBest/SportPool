import { storage } from './storage';
import { emailServiceEnhanced } from './email-enhanced';
import { requireAuth, AuthenticatedRequest } from './auth';
import type { Express, Request, Response } from 'express';

export interface AdminFeatureConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'ui' | 'functionality' | 'communication' | 'system';
  requiresRestart: boolean;
}

export interface UserDeletionRequest {
  userId: string;
  userType: 'organization' | 'admin';
  reason: string;
  requestedBy: string;
}

// Configuration des fonctionnalités administrables
const ADMIN_FEATURES: { [key: string]: AdminFeatureConfig } = {
  darkMode: {
    id: 'darkMode',
    name: 'Mode Sombre',
    description: 'Permet aux utilisateurs de basculer entre le thème clair et sombre',
    enabled: true,
    category: 'ui',
    requiresRestart: false
  },
  eventDeletion: {
    id: 'eventDeletion',
    name: 'Suppression d\'Événements',
    description: 'Permet aux organisateurs de supprimer leurs événements',
    enabled: true,
    category: 'functionality',
    requiresRestart: false
  },
  messageAttachments: {
    id: 'messageAttachments',
    name: 'Pièces Jointes Messages',
    description: 'Permet d\'ajouter des pièces jointes aux messages',
    enabled: true,
    category: 'communication',
    requiresRestart: false
  },
  eventReminders: {
    id: 'eventReminders',
    name: 'Rappels Événements',
    description: 'Envoi automatique de rappels par email pour les événements',
    enabled: true,
    category: 'communication',
    requiresRestart: false
  },
  registrationApproval: {
    id: 'registrationApproval',
    name: 'Validation Inscriptions',
    description: 'Les nouvelles inscriptions doivent être approuvées par un admin',
    enabled: false,
    category: 'system',
    requiresRestart: false
  },
  aiOptimization: {
    id: 'aiOptimization',
    name: 'Optimisation IA',
    description: 'Utilisation de l\'IA pour l\'optimisation des trajets de covoiturage',
    enabled: true,
    category: 'functionality',
    requiresRestart: false
  },
  analyticsTracking: {
    id: 'analyticsTracking',
    name: 'Suivi Analytics',
    description: 'Collecte de données d\'utilisation anonymes pour améliorer l\'expérience',
    enabled: true,
    category: 'system',
    requiresRestart: false
  }
};

export class AdminAdvancedService {
  
  /**
   * Obtenir toutes les fonctionnalités administrables
   */
  static getAdminFeatures(): AdminFeatureConfig[] {
    return Object.values(ADMIN_FEATURES);
  }

  /**
   * Vérifier si une fonctionnalité est activée
   */
  static isFeatureEnabled(featureId: string): boolean {
    const feature = ADMIN_FEATURES[featureId];
    return feature ? feature.enabled : false;
  }

  /**
   * Activer/désactiver une fonctionnalité
   */
  static async toggleFeature(featureId: string, enabled: boolean, adminId: string): Promise<void> {
    const feature = ADMIN_FEATURES[featureId];
    if (!feature) {
      throw new Error(`Fonctionnalité ${featureId} non trouvée`);
    }

    // Mettre à jour la configuration
    ADMIN_FEATURES[featureId].enabled = enabled;

    // Log de l'action
    console.log(`🔧 Fonctionnalité ${featureId} ${enabled ? 'activée' : 'désactivée'} par admin ${adminId}`);

    // Ici vous pourriez persister cette configuration dans une base de données
    // Par exemple : await storage.updateFeatureConfig(featureId, enabled, adminId);

    // Si la fonctionnalité nécessite un redémarrage, notifier les utilisateurs
    if (feature.requiresRestart && !enabled) {
      console.warn(`⚠️ La désactivation de ${feature.name} nécessite un redémarrage du serveur`);
    }
  }

  /**
   * Supprimer complètement un utilisateur ou organisateur
   */
  static async deleteUser(params: UserDeletionRequest): Promise<{
    success: boolean;
    message: string;
    emailSent: boolean;
  }> {
    const { userId, userType, reason, requestedBy } = params;

    try {
      let userToDelete: any = null;
      let userEmail = '';
      let userName = '';

      // Récupérer les informations de l'utilisateur à supprimer
      if (userType === 'organization') {
        userToDelete = await storage.getOrganization(userId);
        if (userToDelete) {
          userEmail = userToDelete.email;
          userName = userToDelete.name;
        }
      } else if (userType === 'admin') {
        // Pour les admins, vous pourriez avoir une table séparée
        // userToDelete = await storage.getAdmin(userId);
        throw new Error('Suppression d\'administrateurs non implémentée pour le moment');
      }

      if (!userToDelete) {
        throw new Error(`Utilisateur ${userId} non trouvé`);
      }

      // Vérifier que ce n'est pas l'admin qui fait la demande qui se supprime lui-même
      if (userId === requestedBy && userType === 'admin') {
        throw new Error('Un administrateur ne peut pas se supprimer lui-même');
      }

      // Effectuer la suppression complète
      let deletionSteps: string[] = [];

      if (userType === 'organization') {
        // 1. Supprimer tous les événements de l'organisation
        const events = await storage.getOrganizationEvents(userId);
        for (const event of events) {
          await storage.deleteEvent(event.id);
        }
        deletionSteps.push(`${events.length} événement(s) supprimé(s)`);

        // 2. Supprimer tous les messages liés
        const messages = await storage.getOrganizationMessages(userId);
        for (const message of messages) {
          await storage.deleteMessage(message.id);
        }
        deletionSteps.push(`${messages.length} message(s) supprimé(s)`);

        // 3. Supprimer les fichiers/photos uploadés
        try {
          await storage.deleteOrganizationFiles(userId);
          deletionSteps.push('Fichiers supprimés');
        } catch (error) {
          console.warn('Certains fichiers n\'ont pas pu être supprimés:', error);
        }

        // 4. Supprimer l'organisation elle-même
        await storage.deleteOrganization(userId);
        deletionSteps.push('Compte organisation supprimé');
      }

      // Envoyer l'email de confirmation de suppression
      let emailSent = false;
      try {
        await emailServiceEnhanced.sendAccountDeletionConfirmation(
          userEmail,
          userName,
          userType === 'organization' ? 'Organisation' : 'Administrateur',
          reason,
          deletionSteps
        );
        emailSent = true;
      } catch (emailError) {
        console.error('Erreur envoi email suppression:', emailError);
        emailSent = false;
      }

      // Log de sécurité
      console.log(`🗑️ SUPPRESSION UTILISATEUR: ${userType} ${userId} (${userName}) supprimé par admin ${requestedBy}. Raison: ${reason}`);

      return {
        success: true,
        message: `${userType === 'organization' ? 'Organisation' : 'Administrateur'} ${userName} supprimée avec succès. ${deletionSteps.join(', ')}.`,
        emailSent
      };

    } catch (error: any) {
      console.error('Erreur suppression utilisateur:', error);
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Désactiver/réactiver un compte sans le supprimer
   */
  static async toggleUserActivation(
    userId: string,
    userType: 'organization' | 'admin',
    active: boolean,
    adminId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message: string;
    emailSent: boolean;
  }> {
    try {
      let user: any = null;
      let userEmail = '';
      let userName = '';

      // Récupérer l'utilisateur
      if (userType === 'organization') {
        user = await storage.getOrganization(userId);
        if (user) {
          userEmail = user.email;
          userName = user.name;
          
          // Mettre à jour le statut
          await storage.updateOrganization(userId, {
            isActive: active,
            deactivationReason: active ? null : reason,
            deactivatedAt: active ? null : new Date(),
            deactivatedBy: active ? null : adminId
          });
        }
      }

      if (!user) {
        throw new Error(`Utilisateur ${userId} non trouvé`);
      }

      // Envoyer email de notification
      let emailSent = false;
      try {
        if (active) {
          await emailServiceEnhanced.sendAccountReactivationNotification(
            userEmail,
            userName
          );
        } else {
          await emailServiceEnhanced.sendAccountDeactivationNotification(
            userEmail,
            userName,
            reason || 'Non spécifiée'
          );
        }
        emailSent = true;
      } catch (emailError) {
        console.error('Erreur envoi email activation/désactivation:', emailError);
      }

      // Log de l'action
      console.log(`🔄 CHANGEMENT ACTIVATION: ${userType} ${userId} (${userName}) ${active ? 'réactivé' : 'désactivé'} par admin ${adminId}`);

      return {
        success: true,
        message: `${userName} ${active ? 'réactivé' : 'désactivé'} avec succès`,
        emailSent
      };

    } catch (error: any) {
      console.error('Erreur changement activation utilisateur:', error);
      throw new Error(`Erreur: ${error.message}`);
    }
  }

  /**
   * Obtenir les statistiques d'administration
   */
  static async getAdminStats(): Promise<{
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    events: {
      total: number;
      thisMonth: number;
    };
    subscriptions: {
      decouverte: number;
      evenementielle: number;
      pro: number;
    };
    features: AdminFeatureConfig[];
  }> {
    try {
      const organizations = await storage.getAllOrganizations();
      const allEvents = await storage.getAllEvents();
      
      // Statistiques utilisateurs
      const activeUsers = organizations.filter(org => org.isActive !== false);
      const inactiveUsers = organizations.filter(org => org.isActive === false);

      // Événements ce mois
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const eventsThisMonth = allEvents.filter(event => 
        new Date(event.createdAt || event.date) >= thisMonth
      );

      // Répartition des abonnements
      const subscriptions = {
        decouverte: organizations.filter(org => 
          !org.subscriptionType || org.subscriptionType === 'decouverte'
        ).length,
        evenementielle: organizations.filter(org => 
          org.subscriptionType?.startsWith('evenementielle')
        ).length,
        pro: organizations.filter(org => 
          org.subscriptionType?.startsWith('pro-')
        ).length
      };

      return {
        users: {
          total: organizations.length,
          active: activeUsers.length,
          inactive: inactiveUsers.length
        },
        events: {
          total: allEvents.length,
          thisMonth: eventsThisMonth.length
        },
        subscriptions,
        features: this.getAdminFeatures()
      };

    } catch (error) {
      console.error('Erreur récupération statistiques admin:', error);
      throw error;
    }
  }
}

/**
 * Enregistrer les routes d'administration avancées
 */
export function registerAdvancedAdminRoutes(app: Express): void {

  /**
   * GET /api/admin/features - Obtenir toutes les fonctionnalités
   */
  app.get('/api/admin/features', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          error: 'Accès administrateur requis',
          code: 'ADMIN_REQUIRED'
        });
      }

      const features = AdminAdvancedService.getAdminFeatures();
      
      res.json({
        success: true,
        data: features
      });

    } catch (error: any) {
      console.error('Erreur récupération fonctionnalités:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        code: 'SERVER_ERROR'
      });
    }
  });

  /**
   * POST /api/admin/features/:featureId/toggle - Activer/désactiver une fonctionnalité
   */
  app.post('/api/admin/features/:featureId/toggle', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { featureId } = req.params;
      const { enabled } = req.body;
      
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          error: 'Accès administrateur requis',
          code: 'ADMIN_REQUIRED'
        });
      }

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: 'Le paramètre enabled doit être un booléen',
          code: 'INVALID_ENABLED_VALUE'
        });
      }

      await AdminAdvancedService.toggleFeature(featureId, enabled, authReq.user.organizationId);

      res.json({
        success: true,
        message: `Fonctionnalité ${featureId} ${enabled ? 'activée' : 'désactivée'}`
      });

    } catch (error: any) {
      console.error('Erreur toggle fonctionnalité:', error);
      res.status(500).json({
        error: error.message || 'Erreur serveur',
        code: 'TOGGLE_FEATURE_ERROR'
      });
    }
  });

  /**
   * DELETE /api/admin/users/:userId - Supprimer complètement un utilisateur
   */
  app.delete('/api/admin/users/:userId', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { userId } = req.params;
      const { userType, reason } = req.body;
      
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          error: 'Accès administrateur requis',
          code: 'ADMIN_REQUIRED'
        });
      }

      if (!userType || !reason) {
        return res.status(400).json({
          error: 'userType et reason sont requis',
          code: 'MISSING_PARAMS'
        });
      }

      if (!['organization', 'admin'].includes(userType)) {
        return res.status(400).json({
          error: 'userType doit être "organization" ou "admin"',
          code: 'INVALID_USER_TYPE'
        });
      }

      const result = await AdminAdvancedService.deleteUser({
        userId,
        userType,
        reason,
        requestedBy: authReq.user.organizationId
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Erreur suppression utilisateur:', error);
      res.status(500).json({
        error: error.message || 'Erreur serveur',
        code: 'USER_DELETION_ERROR'
      });
    }
  });

  /**
   * POST /api/admin/users/:userId/toggle-activation - Désactiver/réactiver un compte
   */
  app.post('/api/admin/users/:userId/toggle-activation', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { userId } = req.params;
      const { userType, active, reason } = req.body;
      
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          error: 'Accès administrateur requis',
          code: 'ADMIN_REQUIRED'
        });
      }

      if (typeof active !== 'boolean' || !userType) {
        return res.status(400).json({
          error: 'active (boolean) et userType sont requis',
          code: 'MISSING_PARAMS'
        });
      }

      const result = await AdminAdvancedService.toggleUserActivation(
        userId,
        userType,
        active,
        authReq.user.organizationId,
        reason
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Erreur activation/désactivation utilisateur:', error);
      res.status(500).json({
        error: error.message || 'Erreur serveur',
        code: 'USER_ACTIVATION_ERROR'
      });
    }
  });

  /**
   * GET /api/admin/stats - Statistiques d'administration
   */
  app.get('/api/admin/stats', requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          error: 'Accès administrateur requis',
          code: 'ADMIN_REQUIRED'
        });
      }

      const stats = await AdminAdvancedService.getAdminStats();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Erreur récupération stats admin:', error);
      res.status(500).json({
        error: 'Erreur serveur',
        code: 'SERVER_ERROR'
      });
    }
  });
}