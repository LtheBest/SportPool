import { Router } from 'express';
import { NewStripeService } from './stripe-service-new';
import { stripeConfig, getStripePlan, STRIPE_PLANS, formatPrice } from './stripe-config';
import { requireAuthWithOrg, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/stripe/config
 * Récupérer la configuration Stripe publique
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        publishableKey: stripeConfig.publishableKey,
        isTestMode: stripeConfig.isTestMode(),
        currency: 'eur',
        locale: 'fr'
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération config Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur de configuration'
    });
  }
});

/**
 * GET /api/stripe/plans
 * Récupérer tous les plans disponibles
 */
router.get('/plans', (req, res) => {
  try {
    const plans = Object.values(STRIPE_PLANS).map(plan => ({
      ...plan,
      priceFormatted: formatPrice(plan.priceAmount, plan.currency)
    }));
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération plans:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur récupération des plans'
    });
  }
});

/**
 * POST /api/stripe/create-checkout-session
 * Créer une session de paiement Stripe
 */
router.post('/create-checkout-session', requireAuthWithOrg, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, mode = 'registration' } = req.body;
    const organization = req.user?.organization;
    
    if (!organization) {
      return res.status(401).json({
        success: false,
        error: 'Organisation non trouvée'
      });
    }
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID requis'
      });
    }
    
    // Validation du plan
    const plan = getStripePlan(planId);
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Plan non trouvé'
      });
    }
    
    // Vérification pour le plan gratuit
    if (plan.priceAmount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le plan Découverte ne nécessite pas de paiement'
      });
    }
    
    // Vérification pour les upgrades
    if (mode === 'upgrade') {
      if (organization.subscriptionType === planId) {
        return res.status(400).json({
          success: false,
          error: 'Vous avez déjà ce plan'
        });
      }
      
      // TODO: Ajouter la logique de validation d'upgrade (pas de downgrade, etc.)
    }
    
    console.log('🎯 Création session checkout:', {
      organizationId: organization.id,
      planId,
      mode,
      email: organization.email
    });
    
    // Créer la session Stripe
    const session = await NewStripeService.createCheckoutSession({
      planId,
      organizationId: organization.id,
      customerEmail: organization.email,
      mode: mode as 'registration' | 'upgrade',
      organizationName: organization.name,
      metadata: {
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection.remoteAddress || '',
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
        plan: {
          id: session.plan.id,
          name: session.plan.name,
          price: formatPrice(session.plan.priceAmount, session.plan.currency)
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur création session checkout:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur de paiement'
    });
  }
});

/**
 * GET /api/stripe/session/:sessionId
 * Récupérer les détails d'une session de paiement
 */
router.get('/session/:sessionId', requireAuthWithOrg, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const organization = req.user?.organization;
    
    if (!organization) {
      return res.status(401).json({
        success: false,
        error: 'Organisation non trouvée'
      });
    }
    
    const session = await NewStripeService.getCheckoutSession(sessionId);
    
    // Vérifier que la session appartient à cette organisation
    if (session.metadata?.organizationId !== organization.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.payment_status,
        mode: session.mode,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        planId: session.metadata?.planId,
        paymentIntent: session.payment_intent,
        subscription: session.subscription
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur récupération session:', error);
    res.status(500).json({
      success: false,
      error: 'Session non trouvée'
    });
  }
});

/**
 * POST /api/stripe/create-portal-session
 * Créer une session de portail client pour la gestion des abonnements
 */
router.post('/create-portal-session', requireAuthWithOrg, async (req: AuthenticatedRequest, res) => {
  try {
    const organization = req.user?.organization;
    
    if (!organization) {
      return res.status(401).json({
        success: false,
        error: 'Organisation non trouvée'
      });
    }
    
    if (!organization.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'Aucun compte de facturation trouvé'
      });
    }
    
    const returnUrl = `${stripeConfig.baseUrl}/dashboard`;
    const portal = await NewStripeService.createCustomerPortal(
      organization.stripeCustomerId,
      returnUrl
    );
    
    res.json({
      success: true,
      data: {
        url: portal.url
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur portail client:', error);
    res.status(500).json({
      success: false,
      error: 'Impossible d\'accéder au portail de facturation'
    });
  }
});

/**
 * POST /api/stripe/webhook
 * Endpoint webhook Stripe (sans authentification)
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    console.error('❌ Signature Stripe manquante');
    return res.status(400).json({ error: 'Signature manquante' });
  }
  
  try {
    const result = await NewStripeService.handleWebhook(req.body, signature);
    
    if (result.success) {
      console.log('✅ Webhook traité avec succès:', result.event?.type);
      res.json({ received: true, event: result.event?.type });
    } else {
      console.error('❌ Erreur traitement webhook:', result.error);
      res.status(400).json({ error: result.error });
    }
    
  } catch (error: any) {
    console.error('❌ Erreur webhook:', error);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * GET /api/stripe/verify
 * Vérifier la configuration Stripe (admin uniquement)
 */
router.get('/verify', requireAuthWithOrg, async (req: AuthenticatedRequest, res) => {
  try {
    const organization = req.user?.organization;
    
    // Vérification admin (à adapter selon votre logique)
    if (organization?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès administrateur requis'
      });
    }
    
    const verification = await NewStripeService.verifyConfiguration();
    
    res.json({
      success: verification.valid,
      data: verification
    });
    
  } catch (error: any) {
    console.error('❌ Erreur vérification Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur de vérification'
    });
  }
});

export { router as stripeRoutes };