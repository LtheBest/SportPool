// Nouvelles routes Stripe complètement refaites
import express from 'express';
import { StripeServiceNew } from './stripe-service-new';
import { SubscriptionService } from './subscription-service';
import { SUBSCRIPTION_PLANS } from './subscription-config';
import { requireAuth, AuthenticatedRequest } from './auth';
import { db } from './db';
import { organizations } from '../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Configuration du domaine
const YOUR_DOMAIN = process.env.APP_URL || 'http://localhost:8080';

/**
 * Endpoint principal pour créer une session de checkout - Compatible avec l'exemple Stripe
 */
router.post('/create-checkout-session', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const userId = req.user?.id;

    // Validation de l'utilisateur
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }

    // Validation du plan
    if (!planId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offre sélectionnée invalide' 
      });
    }

    // Vérifier que le plan existe
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offre sélectionnée invalide' 
      });
    }

    // Plan découverte (gratuit) - pas besoin de Stripe
    if (planId === 'discovery') {
      const success = await SubscriptionService.updateSubscription(userId, 'discovery');
      
      return res.json({
        success: true,
        redirect: '/dashboard',
        message: 'Plan Découverte activé avec succès'
      });
    }

    // Récupérer les informations utilisateur
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Construire les URLs de redirection
    const finalSuccessUrl = successUrl || `${YOUR_DOMAIN}/payment/success`;
    const finalCancelUrl = cancelUrl || `${YOUR_DOMAIN}/payment/cancelled`;

    // Créer la session Stripe
    const result = await StripeServiceNew.createCheckoutSession({
      userId,
      planId,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      customerEmail: user[0].email
    });

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: result.error || 'Aucune URL de redirection fournie'
      });
    }

    // Redirection 303 comme dans l'exemple Stripe
    if (result.url) {
      res.redirect(303, result.url);
    } else {
      res.json({
        success: true,
        sessionId: result.sessionId,
        url: result.url
      });
    }

  } catch (error: any) {
    console.error('Erreur création session checkout:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

/**
 * API pour créer une session (version JSON pour les appels AJAX)
 */
router.post('/subscriptions/create', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const userId = req.user?.id;

    // Validation de l'utilisateur
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }

    // Validation du plan
    if (!planId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offre sélectionnée invalide' 
      });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offre sélectionnée invalide' 
      });
    }

    // Plan découverte (gratuit)
    if (planId === 'discovery') {
      const success = await SubscriptionService.updateSubscription(userId, 'discovery');
      
      return res.json({
        success: true,
        redirect: '/dashboard',
        message: 'Plan Découverte activé avec succès'
      });
    }

    // Récupérer les informations utilisateur
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Construire les URLs
    const finalSuccessUrl = successUrl || `${YOUR_DOMAIN}/payment/success`;
    const finalCancelUrl = cancelUrl || `${YOUR_DOMAIN}/payment/cancelled`;

    // Créer la session Stripe
    const result = await StripeServiceNew.createCheckoutSession({
      userId,
      planId,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      customerEmail: user[0].email
    });

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: result.error 
      });
    }

    res.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url
    });

  } catch (error: any) {
    console.error('Erreur création abonnement:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la création de l\'abonnement'
    });
  }
});

/**
 * Obtenir les plans d'abonnement disponibles
 */
router.get('/subscriptions/plans', (req, res) => {
  const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    ...plan,
    stripeProductId: undefined,
    stripePriceId: undefined // Ne pas exposer les IDs Stripe
  }));

  res.json({
    success: true,
    plans
  });
});

/**
 * Obtenir les informations d'abonnement de l'utilisateur actuel
 */
router.get('/subscriptions/info', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }

    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(userId);
    const usageStats = await SubscriptionService.getUserUsageStats(userId);
    
    res.json({
      success: true,
      ...subscriptionStatus,
      usage: usageStats
    });
  } catch (error: any) {
    console.error('Erreur récupération info abonnement:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Vérifier le statut d'une session de paiement
 */
router.get('/payment/verify/:sessionId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }

    const result = await StripeServiceNew.processSuccessfulPayment(sessionId);
    
    // Vérifier que la session appartient à l'utilisateur connecté
    if (result.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Session non autorisée' 
      });
    }

    res.json({
      success: true,
      message: 'Paiement vérifié avec succès',
      planId: result.planId,
      subscriptionId: result.subscriptionId
    });

  } catch (error: any) {
    console.error('Erreur vérification paiement:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Traiter le succès d'un paiement (appelé par le frontend après redirection)
 */
router.post('/payment/success', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { session_id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }

    if (!session_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de session manquant' 
      });
    }

    const result = await StripeServiceNew.processSuccessfulPayment(session_id);
    
    // Vérifier que la session appartient à l'utilisateur connecté
    if (result.userId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Session non autorisée' 
      });
    }

    // Récupérer le statut d'abonnement mis à jour
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(userId);

    res.json({
      success: true,
      message: 'Abonnement activé avec succès !',
      subscription: subscriptionStatus,
      planId: result.planId
    });

  } catch (error: any) {
    console.error('Erreur traitement succès paiement:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Annuler un abonnement (revenir au plan découverte)
 */
router.post('/subscriptions/cancel', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }
    
    const success = await StripeServiceNew.cancelSubscription(userId);
    
    if (!success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'annulation de l\'abonnement' 
      });
    }

    res.json({
      success: true,
      message: 'Abonnement annulé avec succès. Vous êtes maintenant sur le plan Découverte.'
    });

  } catch (error: any) {
    console.error('Erreur annulation abonnement:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Webhook Stripe pour traiter les événements de paiement
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('stripe-signature');
    if (!signature) {
      return res.status(400).send('Signature manquante');
    }

    const result = await StripeServiceNew.handleWebhook(req.body, signature);
    
    if (!result.success) {
      return res.status(400).send(`Erreur webhook: ${result.error}`);
    }
    
    res.status(200).send('Webhook reçu');
  } catch (error: any) {
    console.error('Erreur webhook:', error);
    res.status(400).send(`Erreur webhook: ${error.message}`);
  }
});

/**
 * Configuration Stripe publique
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: StripeServiceNew.getPublishableKey()
  });
});

/**
 * Test de la configuration Stripe
 */
router.get('/test-config', async (req, res) => {
  try {
    const config = await StripeServiceNew.verifyConfiguration();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Obtenir le statut de l'utilisateur pour les fonctionnalités
 */
router.get('/user/features', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "NO_TOKEN"
      });
    }

    const canDelete = await SubscriptionService.canDeleteEvent(userId);
    const canCreate = await SubscriptionService.canCreateEvent(userId);
    const canInvite = await SubscriptionService.canSendInvitations(userId);
    const canAdvanced = await SubscriptionService.canUseAdvancedFeatures(userId);
    
    res.json({
      success: true,
      features: {
        canDeleteEvents: canDelete,
        canCreateEvents: canCreate,
        canSendInvitations: canInvite,
        canUseAdvancedFeatures: canAdvanced
      }
    });

  } catch (error: any) {
    console.error('Erreur récupération fonctionnalités:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export { router as stripeRoutesNew };