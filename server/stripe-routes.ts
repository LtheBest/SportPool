// server/stripe-routes.ts
import express from 'express';
import { StripeService, SUBSCRIPTION_PLANS } from './stripe-service';
import { requireAuth } from './auth';

const router = express.Router();

// YOUR_DOMAIN configuration
const YOUR_DOMAIN = process.env.APP_URL || 'http://localhost:8080';

/**
 * Créer une session de checkout - Endpoint principal comme dans l'exemple Stripe
 */
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const organization = req.user;

    if (!planId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offre sélectionnée invalide' 
      });
    }

    // Vérifier que le plan existe
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Plan non trouvé' 
      });
    }

    // Plan découverte (gratuit) - pas besoin de Stripe
    if (plan.id === 'decouverte') {
      await StripeService.updateOrganizationSubscription(
        organization.id,
        'decouverte',
        { id: 'free_plan', customer_email: organization.email }
      );
      
      return res.json({
        success: true,
        redirect: '/dashboard',
        message: 'Plan Découverte activé avec succès'
      });
    }

    // Construire les URLs avec le domaine correct
    const finalSuccessUrl = successUrl || `${YOUR_DOMAIN}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${YOUR_DOMAIN}/payment/cancelled`;

    // Créer la session Stripe
    const session = await StripeService.createCheckoutSession({
      planId,
      organizationId: organization.id,
      organizationEmail: organization.email,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
    });

    if (!session.url) {
      return res.status(500).json({ 
        success: false, 
        message: 'Aucune URL de redirection fournie' 
      });
    }

    // Redirection 303 comme dans l'exemple Stripe
    res.redirect(303, session.url);

  } catch (error: any) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

/**
 * API pour créer une session (version JSON pour les appels AJAX)
 */
router.post('/subscriptions/create', requireAuth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const organization = req.user;

    if (!planId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Offre sélectionnée invalide' 
      });
    }

    // Vérifier que le plan existe
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: 'Plan non trouvé' 
      });
    }

    // Plan découverte (gratuit)
    if (plan.id === 'decouverte') {
      await StripeService.updateOrganizationSubscription(
        organization.id,
        'decouverte',
        { id: 'free_plan', customer_email: organization.email }
      );
      
      return res.json({
        success: true,
        redirect: '/dashboard',
        message: 'Plan Découverte activé avec succès'
      });
    }

    // Construire les URLs
    const finalSuccessUrl = successUrl || `${YOUR_DOMAIN}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${YOUR_DOMAIN}/payment/cancelled`;

    // Créer la session Stripe
    const session = await StripeService.createCheckoutSession({
      planId,
      organizationId: organization.id,
      organizationEmail: organization.email,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    console.error('Subscription creation error:', error);
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
  res.json({
    success: true,
    plans: SUBSCRIPTION_PLANS.map(plan => ({
      ...plan,
      stripePriceId: undefined // Ne pas exposer les IDs Stripe
    }))
  });
});

/**
 * Obtenir les informations d'abonnement de l'organisation actuelle
 */
router.get('/subscriptions/info', requireAuth, async (req, res) => {
  try {
    const organization = req.user;
    const subscriptionInfo = await StripeService.getOrganizationSubscription(organization.id);
    
    res.json({
      success: true,
      ...subscriptionInfo
    });
  } catch (error: any) {
    console.error('Get subscription info error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Vérifier le statut d'une session de paiement
 */
router.get('/payment/verify/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const organization = req.user;

    const result = await StripeService.processSuccessfulPayment(sessionId);
    
    // Vérifier que la session appartient à l'organisation connectée
    if (result.organizationId !== organization.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Session non autorisée' 
      });
    }

    res.json({
      success: true,
      message: 'Paiement vérifié avec succès',
      plan: result.plan
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Annuler un abonnement (revenir au plan découverte)
 */
router.post('/subscriptions/cancel', requireAuth, async (req, res) => {
  try {
    const organization = req.user;
    
    await StripeService.cancelSubscription(organization.id);
    
    res.json({
      success: true,
      message: 'Abonnement annulé avec succès. Vous êtes maintenant sur le plan Découverte.'
    });

  } catch (error: any) {
    console.error('Subscription cancellation error:', error);
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
      return res.status(400).send('Missing signature');
    }

    await StripeService.handleWebhook(req.body, signature);
    
    res.status(200).send('Webhook received');
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook error: ${error.message}`);
  }
});

/**
 * Configuration Stripe publique
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: StripeService.getPublishableKey()
  });
});

/**
 * Test de la configuration Stripe (admin seulement)
 */
router.get('/test-config', requireAuth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin (optionnel)
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Admin required' });
    // }

    const config = await StripeService.verifyConfiguration();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export { router as stripeRoutes };