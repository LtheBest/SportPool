// server/account-routes.ts
import express from 'express';
import { AccountManagementService } from './account-management';
import { requireAuth, requireAdmin } from './auth';
import { FeatureFlagService } from './feature-flags';

const router = express.Router();

/**
 * Obtenir la liste des comptes pour l'admin
 */
router.get('/admin/accounts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      search = '',
      planType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const result = await AccountManagementService.getAccountsForAdmin({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      planType: planType as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Obtenir les statistiques des comptes (admin)
 */
router.get('/admin/accounts/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await AccountManagementService.getAccountStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('Get account stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Supprimer un compte (admin)
 */
router.delete('/admin/accounts/:organizationId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    // Vérifier si l'admin peut supprimer des comptes
    const canDeleteAccounts = await FeatureFlagService.isFeatureEnabled('admin_account_deletion');
    if (!canDeleteAccounts) {
      return res.status(403).json({
        success: false,
        message: 'La suppression de comptes par l\'admin est actuellement désactivée'
      });
    }

    // Empêcher la suppression de son propre compte
    if (organizationId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    const result = await AccountManagementService.adminDeleteAccount(
      organizationId,
      adminId,
      reason
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Admin delete account error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Suspendre un compte (admin)
 */
router.patch('/admin/accounts/:organizationId/suspend', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    // Empêcher la suspension de son propre compte
    if (organizationId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas suspendre votre propre compte'
      });
    }

    const result = await AccountManagementService.suspendAccount(
      organizationId,
      adminId,
      reason
    );

    res.json(result);
  } catch (error: any) {
    console.error('Suspend account error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Réactiver un compte suspendu (admin)
 */
router.patch('/admin/accounts/:organizationId/reactivate', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const adminId = req.user?.id;

    const result = await AccountManagementService.reactivateAccount(
      organizationId,
      adminId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Reactivate account error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Auto-suppression du compte par l'utilisateur lui-même
 */
router.delete('/account/delete', requireAuth, async (req, res) => {
  try {
    const { reason, confirmPassword } = req.body;
    const organizationId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    // Vérifier si la suppression de compte est activée
    const canDeleteAccount = await FeatureFlagService.isFeatureEnabled('user_account_deletion');
    if (!canDeleteAccount) {
      return res.status(403).json({
        success: false,
        message: 'La suppression de compte est actuellement désactivée'
      });
    }

    // TODO: Vérifier le mot de passe de confirmation si nécessaire
    // const isPasswordValid = await verifyPassword(organizationId, confirmPassword);
    // if (!isPasswordValid) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Mot de passe de confirmation incorrect'
    //   });
    // }

    const result = await AccountManagementService.selfDeleteAccount(
      organizationId,
      reason
    );

    if (result.success) {
      // Déconnecter l'utilisateur après suppression
      res.clearCookie('session');
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Self delete account error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Demander une suppression de compte (avec email de confirmation)
 */
router.post('/account/request-deletion', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const organization = req.user;

    if (!organization) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    // Vérifier si la fonctionnalité est activée
    const canRequestDeletion = await FeatureFlagService.isFeatureEnabled('user_account_deletion');
    if (!canRequestDeletion) {
      return res.status(403).json({
        success: false,
        message: 'La demande de suppression de compte est actuellement désactivée'
      });
    }

    // Générer un token de suppression (optionnel, pour confirmation par email)
    const deletionToken = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Envoyer un email de confirmation avec le token
    // await sendDeletionConfirmationEmail(organization.email, organization.name, deletionToken, reason);

    res.json({
      success: true,
      message: 'Demande de suppression enregistrée. Vérifiez votre email pour confirmer.',
      deletionToken // En production, ne pas retourner le token
    });
  } catch (error: any) {
    console.error('Request deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Confirmer une suppression de compte via token (optionnel)
 */
router.post('/account/confirm-deletion', requireAuth, async (req, res) => {
  try {
    const { deletionToken, confirmPassword } = req.body;
    const organizationId = req.user?.id;

    if (!organizationId || !deletionToken) {
      return res.status(400).json({
        success: false,
        message: 'Paramètres manquants'
      });
    }

    // TODO: Vérifier le token de suppression
    // const isValidToken = await verifyDeletionToken(organizationId, deletionToken);
    // if (!isValidToken) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Token de suppression invalide ou expiré'
    //   });
    // }

    const result = await AccountManagementService.selfDeleteAccount(
      organizationId,
      'Suppression confirmée par email'
    );

    if (result.success) {
      res.clearCookie('session');
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Confirm deletion error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Obtenir les informations de compte pour suppression
 */
router.get('/account/deletion-info', requireAuth, async (req, res) => {
  try {
    const organization = req.user;

    if (!organization) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    // Récupérer les statistiques du compte
    const eventCount = await db.getEventCountByOrganization(organization.id);
    const invitationCount = await db.getInvitationCountByOrganization(organization.id);

    res.json({
      success: true,
      organization: {
        name: organization.name,
        email: organization.email,
        planType: organization.planType,
        createdAt: organization.createdAt
      },
      stats: {
        eventCount,
        invitationCount
      },
      canDelete: await FeatureFlagService.isFeatureEnabled('user_account_deletion')
    });
  } catch (error: any) {
    console.error('Get deletion info error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export { router as accountRoutes };