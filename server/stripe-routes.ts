// server/stripe-routes.ts
import { Router } from 'express';
import { 
  createCheckoutSession, 
  retrieveCheckoutSession, 
  handleWebhookEvent, 
  stripe,
  cancelSubscription,
  getSubscription
} from './stripe.js';
import { SUBSCRIPTION_PLANS } from './subscription-config.js';
import { getOrganizationById } from './storage.js';

const router = Router();

// Route pour créer une session de checkout
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId } = req.body;
    const organizationId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    // Récupérer les informations de l'organisation
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    // Créer la session Stripe
    const session = await createCheckoutSession({
      planId,
      organizationId,
      organizationEmail: organization.email,
      mode: planId.includes('pro') ? 'subscription' : 'payment'
    });

    console.log('✅ Checkout session created:', session.id);
    
    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la session de paiement',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour récupérer le statut d'une session
router.get('/checkout-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID manquant' });
    }

    const session = await retrieveCheckoutSession(sessionId);
    
    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
        mode: session.mode,
        metadata: session.metadata
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving checkout session:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la session',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour annuler un abonnement
router.post('/cancel-subscription', async (req, res) => {
  try {
    const organizationId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Récupérer les informations de l'organisation
    const organization = await getOrganizationById(organizationId);
    if (!organization || !organization.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Abonnement non trouvé' });
    }

    // Annuler l'abonnement Stripe
    const cancelledSubscription = await cancelSubscription(organization.stripeSubscriptionId);
    
    console.log('✅ Subscription cancelled:', cancelledSubscription.id);
    
    res.json({
      success: true,
      message: 'Abonnement annulé avec succès',
      subscription: {
        id: cancelledSubscription.id,
        status: cancelledSubscription.status,
        cancel_at_period_end: cancelledSubscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'annulation de l\'abonnement',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour récupérer les informations d'abonnement
router.get('/subscription-info', async (req, res) => {
  try {
    const organizationId = req.user?.id;

    if (!organizationId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Récupérer les informations de l'organisation
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    let stripeSubscription = null;
    if (organization.stripeSubscriptionId) {
      try {
        stripeSubscription = await getSubscription(organization.stripeSubscriptionId);
      } catch (error) {
        console.warn('⚠️ Could not retrieve Stripe subscription:', error);
      }
    }
    
    res.json({
      success: true,
      subscription: {
        type: organization.subscriptionType,
        status: organization.subscriptionStatus,
        endDate: organization.subscriptionEndDate,
        remainingEvents: organization.packageRemainingEvents,
        packageExpiryDate: organization.packageExpiryDate,
        stripeInfo: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          current_period_end: stripeSubscription.current_period_end,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Error getting subscription info:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des informations d\'abonnement',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route webhook pour Stripe (raw body needed)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Construire l'événement Stripe avec la signature
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    
    console.log('🔔 Received Stripe webhook:', event.type);
    
    // Traiter l'événement de manière asynchrone
    handleWebhookEvent(event).catch(error => {
      console.error('❌ Error handling webhook event:', error);
    });
    
    // Répondre rapidement à Stripe
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

// Route de test pour les paiements (mode développement uniquement)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-payment', async (req, res) => {
    try {
      const { planId, status = 'succeeded' } = req.body;
      
      // Simuler différents statuts de paiement
      switch (status) {
        case 'succeeded':
          // Simuler un paiement réussi
          res.json({
            success: true,
            message: 'Paiement test réussi',
            sessionId: 'cs_test_' + Date.now(),
            status: 'complete'
          });
          break;
          
        case 'pending':
          // Simuler un paiement en attente
          res.json({
            success: true,
            message: 'Paiement test en attente',
            sessionId: 'cs_test_' + Date.now(),
            status: 'open'
          });
          break;
          
        case 'failed':
          // Simuler un paiement échoué
          res.status(400).json({
            error: 'Paiement test échoué',
            code: 'card_declined',
            decline_code: 'generic_decline'
          });
          break;
          
        default:
          res.status(400).json({ error: 'Statut de test invalide' });
      }
    } catch (error) {
      console.error('❌ Error in test payment:', error);
      res.status(500).json({ error: 'Erreur du test de paiement' });
    }
  });
}

export default router;