import { Request, Response, Router } from 'express';
import { StripeService, SUBSCRIPTION_PLANS } from './stripe-service';
import { requireAuth } from './auth';

const router = Router();

/**
 * Récupérer la liste des plans disponibles
 */
router.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      features: plan.features,
      limits: plan.limits,
    }));

    res.json({ plans });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des plans' });
  }
});

/**
 * Créer une session de checkout
 */
router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;
    const organization = req.user;

    if (!planId || !SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    // Vérifier que ce n'est pas le plan gratuit
    if (planId === 'discovery') {
      return res.status(400).json({ error: 'Le plan Découverte est gratuit et ne nécessite pas de paiement' });
    }

    // Créer ou récupérer le client Stripe
    let customerId = organization.stripeCustomerId;
    
    if (!customerId) {
      const customer = await StripeService.createCustomer(
        organization.email,
        organization.name,
        organization.id
      );
      customerId = customer.id;
      
      // TODO: Sauvegarder customerId dans la base de données
      console.log(`Nouveau client Stripe créé: ${customerId} pour l'organisation ${organization.id}`);
    }

    // Créer la session de checkout
    const session = await StripeService.createCheckoutSession(
      planId,
      customerId,
      `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      `${process.env.APP_URL}/payment/cancelled?plan=${planId}`
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création de la session de paiement',
      details: error.message 
    });
  }
});

/**
 * Récupérer les informations de session après paiement
 */
router.get('/session/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await StripeService.getCheckoutSession(sessionId);
    
    res.json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      planId: session.metadata?.planId,
      planName: session.metadata?.planName,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des informations de paiement',
      details: error.message 
    });
  }
});

/**
 * Créer un portail de facturation
 */
router.post('/create-billing-portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const organization = req.user;
    
    if (!organization.stripeCustomerId) {
      return res.status(400).json({ error: 'Aucun compte de facturation trouvé' });
    }

    const session = await StripeService.createBillingPortal(
      organization.stripeCustomerId,
      `${process.env.APP_URL}/dashboard`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating billing portal:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du portail de facturation',
      details: error.message 
    });
  }
});

/**
 * Récupérer les informations d'abonnement actuelles
 */
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const organization = req.user;

    // TODO: Récupérer les informations d'abonnement depuis la base de données
    // Pour l'instant, retourner des données fictives basées sur le planType
    
    const currentPlan = organization.planType || 'discovery';
    const planDetails = SUBSCRIPTION_PLANS[currentPlan as keyof typeof SUBSCRIPTION_PLANS];
    
    res.json({
      subscriptionType: currentPlan,
      subscriptionStatus: 'active', // TODO: Récupérer le vrai statut
      planName: planDetails?.name || 'Découverte',
      price: planDetails?.price || 0,
      features: planDetails?.features || [],
      limits: planDetails?.limits || {},
      remainingEvents: null, // TODO: Calculer depuis la DB
      remainingInvitations: null, // TODO: Calculer depuis la DB
      paymentMethod: null, // TODO: Récupérer depuis Stripe
      nextBillingDate: null, // TODO: Récupérer depuis Stripe
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des informations d\'abonnement',
      details: error.message 
    });
  }
});

/**
 * Webhook Stripe
 */
router.post('/webhook', async (req: Request, res: Response) => {
  await StripeService.handleWebhook(req, res);
});

/**
 * Test de création des prix (à utiliser une seule fois pour configurer Stripe)
 */
router.post('/setup-prices', async (req: Request, res: Response) => {
  try {
    // Cette route ne devrait être accessible qu'en mode développement
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Action non autorisée en production' });
    }

    await StripeService.createPrices();
    res.json({ message: 'Prix créés avec succès. Consultez les logs pour récupérer les IDs.' });
  } catch (error: any) {
    console.error('Error setting up prices:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création des prix',
      details: error.message 
    });
  }
});

/**
 * Route de test pour vérifier la configuration Stripe
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Test simple : créer un client temporaire
    const testCustomer = await StripeService.createCustomer(
      'test@example.com',
      'Test Customer'
    );

    // Supprimer le client de test immédiatement
    // Note: Dans une vraie application, vous ne feriez pas cela
    
    res.json({
      message: 'Configuration Stripe OK',
      testCustomerId: testCustomer.id,
      availablePlans: Object.keys(SUBSCRIPTION_PLANS),
    });
  } catch (error: any) {
    console.error('Stripe configuration test failed:', error);
    res.status(500).json({ 
      error: 'Erreur de configuration Stripe',
      details: error.message,
      suggestions: [
        'Vérifiez que STRIPE_SECRET_KEY est définie',
        'Vérifiez que la clé Stripe est valide',
        'Assurez-vous d\'être connecté à Internet'
      ]
    });
  }
});

export default router;