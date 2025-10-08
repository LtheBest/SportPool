// server/feature-routes.ts
import express from 'express';
import { FeatureFlagService } from './feature-flags';
import { requireAuth, requireAdmin } from './auth';

const router = express.Router();

/**
 * Obtenir toutes les fonctionnalités (admin seulement)
 */
router.get('/admin/features', requireAuth, requireAdmin, async (req, res) => {
  try {
    const features = await FeatureFlagService.getAllFeatures();
    const categories = await FeatureFlagService.getCategories();

    res.json({
      success: true,
      features,
      categories
    });
  } catch (error: any) {
    console.error('Get admin features error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Obtenir les fonctionnalités par catégorie (admin)
 */
router.get('/admin/features/category/:category', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const features = await FeatureFlagService.getFeaturesByCategory(category);

    res.json({
      success: true,
      category,
      features
    });
  } catch (error: any) {
    console.error('Get features by category error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Activer/désactiver une fonctionnalité (admin seulement)
 */
router.patch('/admin/features/:featureId/toggle', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { featureId } = req.params;
    const { enabled } = req.body;
    const adminId = req.user?.id;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre "enabled" doit être un boolean'
      });
    }

    const updated = await FeatureFlagService.toggleFeature(featureId, enabled, adminId);

    if (updated) {
      res.json({
        success: true,
        message: `Fonctionnalité ${enabled ? 'activée' : 'désactivée'} avec succès`,
        featureId,
        enabled
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Fonctionnalité non trouvée'
      });
    }
  } catch (error: any) {
    console.error('Toggle feature error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Créer une nouvelle fonctionnalité (admin seulement)
 */
router.post('/admin/features', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, name, description, enabled, category } = req.body;
    const adminId = req.user?.id;

    if (!id || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Les champs id, name et category sont requis'
      });
    }

    // Vérifier que la fonctionnalité n'existe pas déjà
    const existing = await FeatureFlagService.getFeature(id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Une fonctionnalité avec cet ID existe déjà'
      });
    }

    const created = await FeatureFlagService.createFeature({
      id,
      name,
      description: description || '',
      enabled: enabled !== undefined ? enabled : true,
      category
    }, adminId);

    if (created) {
      res.status(201).json({
        success: true,
        message: 'Fonctionnalité créée avec succès',
        featureId: id
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la fonctionnalité'
      });
    }
  } catch (error: any) {
    console.error('Create feature error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Supprimer une fonctionnalité (admin seulement)
 */
router.delete('/admin/features/:featureId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { featureId } = req.params;

    const deleted = await FeatureFlagService.deleteFeature(featureId);

    if (deleted) {
      res.json({
        success: true,
        message: 'Fonctionnalité supprimée avec succès',
        featureId
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Fonctionnalité non trouvée'
      });
    }
  } catch (error: any) {
    console.error('Delete feature error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Obtenir les fonctionnalités publiques (pour tous les utilisateurs)
 */
router.get('/features', async (req, res) => {
  try {
    const features = await FeatureFlagService.getPublicFeatures();

    res.json({
      success: true,
      features
    });
  } catch (error: any) {
    console.error('Get public features error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      features: {} // Fonctionnalités par défaut si erreur
    });
  }
});

/**
 * Vérifier si une fonctionnalité spécifique est activée
 */
router.get('/features/:featureId/status', async (req, res) => {
  try {
    const { featureId } = req.params;
    const enabled = await FeatureFlagService.isFeatureEnabled(featureId);

    res.json({
      success: true,
      featureId,
      enabled
    });
  } catch (error: any) {
    console.error('Check feature status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      enabled: false // Par défaut désactivé si erreur
    });
  }
});

/**
 * Exporter la configuration des fonctionnalités (admin seulement)
 */
router.get('/admin/features/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const configuration = await FeatureFlagService.exportConfiguration();

    res.json({
      success: true,
      configuration,
      exportedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Export configuration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Importer la configuration des fonctionnalités (admin seulement)
 */
router.post('/admin/features/import', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { configuration } = req.body;
    const adminId = req.user?.id;

    if (!Array.isArray(configuration)) {
      return res.status(400).json({
        success: false,
        message: 'La configuration doit être un tableau de fonctionnalités'
      });
    }

    const result = await FeatureFlagService.importConfiguration(configuration, adminId);

    res.json({
      success: true,
      message: `Configuration importée: ${result.success} succès, ${result.errors.length} erreurs`,
      details: result
    });
  } catch (error: any) {
    console.error('Import configuration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Réinitialiser les fonctionnalités par défaut (admin seulement)
 */
router.post('/admin/features/reset-defaults', requireAuth, requireAdmin, async (req, res) => {
  try {
    await FeatureFlagService.initializeDefaultFeatures();

    res.json({
      success: true,
      message: 'Fonctionnalités par défaut réinitialisées avec succès'
    });
  } catch (error: any) {
    console.error('Reset defaults error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export { router as featureRoutes };