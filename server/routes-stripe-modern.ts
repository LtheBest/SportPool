import type { Express, Request, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "./auth";
import { storage } from "./storage";
import { getStripeService, STRIPE_PLANS } from "./stripe-modern";
import { emailServiceEnhanced } from "./email-enhanced";

export function registerModernStripeRoutes(app: Express): void {
  const stripeService = getStripeService();

  /**
   * GET /api/stripe/config - Configuration Stripe publique
   */
  app.get("/api/stripe/config", (req: Request, res: Response) => {
    try {
      const publishableKey = stripeService.getPublishableKey();
      const isTestMode = stripeService.isTestMode();

      if (!publishableKey) {
        return res.status(500).json({
          error: "Configuration Stripe manquante",
          code: "STRIPE_CONFIG_MISSING"
        });
      }

      res.json({
        success: true,
        data: {
          publishableKey,
          testMode: isTestMode,
        }
      });
    } catch (error: any) {
      console.error('Erreur configuration Stripe:', error);
      res.status(500).json({
        error: "Erreur de configuration Stripe",
        code: "STRIPE_CONFIG_ERROR"
      });
    }
  });

  /**
   * GET /api/stripe/plans - Récupérer les plans disponibles
   */
  app.get("/api/stripe/plans", (req: Request, res: Response) => {
    try {
      const plans = Object.values(STRIPE_PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        price: plan.price,
        currency: plan.currency,
        mode: plan.mode,
        interval: plan.interval,
        features: plan.features,
        description: plan.description,
      }));

      res.json({
        success: true,
        data: plans
      });
    } catch (error: any) {
      console.error('Erreur récupération plans:', error);
      res.status(500).json({
        error: "Erreur lors de la récupération des plans",
        code: "PLANS_FETCH_ERROR"
      });
    }
  });

  /**
   * POST /api/stripe/create-checkout - Créer une session de checkout
   * Utilisé pour l'inscription avec un plan payant
   */
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    try {
      const { organizationId, planId, customerEmail } = req.body;

      // Validation des paramètres
      if (!organizationId || !planId) {
        return res.status(400).json({
          error: "Organization ID et plan ID requis",
          code: "MISSING_PARAMS"
        });
      }

      // Vérifier que le plan existe
      const plan = STRIPE_PLANS[planId];
      if (!plan) {
        return res.status(400).json({
          error: "Offre sélectionnée invalide",
          code: "INVALID_PLAN"
        });
      }

      // Plan découverte = gratuit
      if (planId === 'decouverte') {
        return res.status(400).json({
          error: "Le plan Découverte est gratuit",
          code: "FREE_PLAN"
        });
      }

      // Vérifier que l'organisation existe
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({
          error: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      // URLs de redirection
      const baseUrl = process.env.APP_URL || 'https://teammove.fr';
      const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&org_id=${organizationId}`;
      const cancelUrl = `${baseUrl}/payment/cancelled?org_id=${organizationId}`;

      // Créer la session Stripe
      const sessionDetails = await stripeService.createCheckoutSession({
        organizationId,
        planId,
        customerEmail: customerEmail || organization.email,
        successUrl,
        cancelUrl,
      });

      res.json({
        success: true,
        data: {
          sessionId: sessionDetails.sessionId,
          checkoutUrl: sessionDetails.url,
          planId: sessionDetails.planId,
        }
      });

    } catch (error: any) {
      console.error('Erreur création session checkout:', error);
      res.status(500).json({
        error: error.message || "Erreur lors de la création de la session de paiement",
        code: "CHECKOUT_ERROR"
      });
    }
  });

  /**
   * POST /api/stripe/upgrade-subscription - Mise à niveau d'abonnement (utilisateur connecté)
   */
  app.post("/api/stripe/upgrade-subscription", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { planId } = req.body;

      // Validation
      if (!planId) {
        return res.status(400).json({
          error: "Plan ID requis",
          code: "MISSING_PLAN_ID"
        });
      }

      // Vérifier le plan
      const plan = STRIPE_PLANS[planId];
      if (!plan) {
        return res.status(400).json({
          error: "Offre sélectionnée invalide",
          code: "INVALID_PLAN"
        });
      }

      // Récupérer l'organisation
      const organizationId = authReq.user.organizationId;
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({
          error: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      // Plan découverte = downgrade gratuit
      if (planId === 'decouverte') {
        // Mettre à jour directement vers découverte
        await storage.updateOrganization(organizationId, {
          subscriptionType: 'decouverte',
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          packageRemainingEvents: null,
          packageExpiryDate: null,
        });

        return res.json({
          success: true,
          message: "Abonnement changé vers le plan Découverte",
          planName: plan.name
        });
      }

      // URLs de redirection
      const baseUrl = process.env.APP_URL || 'https://teammove.fr';
      const successUrl = `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/dashboard?payment=cancelled`;

      // Créer session de paiement
      const sessionDetails = await stripeService.createCheckoutSession({
        organizationId,
        planId,
        customerEmail: organization.email,
        successUrl,
        cancelUrl,
      });

      res.json({
        success: true,
        data: {
          sessionId: sessionDetails.sessionId,
          checkoutUrl: sessionDetails.url,
          planId: sessionDetails.planId,
        }
      });

    } catch (error: any) {
      console.error('Erreur upgrade abonnement:', error);
      res.status(500).json({
        error: error.message || "Erreur lors de la mise à niveau",
        code: "UPGRADE_ERROR"
      });
    }
  });

  /**
   * POST /api/stripe/verify-payment - Vérifier et traiter un paiement réussi
   */
  app.post("/api/stripe/verify-payment", async (req: Request, res: Response) => {
    try {
      const { sessionId, organizationId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          error: "Session ID requis",
          code: "MISSING_SESSION_ID"
        });
      }

      // Vérifier le paiement avec Stripe
      const paymentResult = await stripeService.verifyPaymentSession(sessionId);
      
      if (!paymentResult.success) {
        return res.status(400).json({
          error: "Paiement non confirmé",
          code: "PAYMENT_NOT_CONFIRMED",
          data: {
            paymentStatus: paymentResult.paymentStatus
          }
        });
      }

      const orgId = paymentResult.organizationId || organizationId;
      const planId = paymentResult.planId;

      if (!orgId || !planId) {
        return res.status(400).json({
          error: "Données de paiement incomplètes",
          code: "INCOMPLETE_PAYMENT_DATA"
        });
      }

      // Récupérer l'organisation
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({
          error: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      // Mettre à jour l'abonnement selon le type de plan
      const plan = STRIPE_PLANS[planId];
      const updateData: any = {
        subscriptionType: planId,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        paymentSessionId: sessionId,
      };

      // Configuration spécifique selon le type de plan
      if (plan.type === 'evenementielle') {
        if (planId === 'evenementielle-single') {
          updateData.packageRemainingEvents = 1;
        } else if (planId === 'evenementielle-pack10') {
          updateData.packageRemainingEvents = 10;
        }
        
        // Expiration à 12 mois pour les packs événementiels
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        updateData.packageExpiryDate = expiryDate;
      } else if (plan.type === 'pro') {
        // Abonnements pro : expiration mensuelle
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        updateData.subscriptionEndDate = endDate;
        updateData.packageRemainingEvents = null; // Illimité
        updateData.packageExpiryDate = null;
      }

      await storage.updateOrganization(orgId, updateData);

      // Envoyer email de bienvenue
      try {
        await emailServiceEnhanced.sendWelcomeEmail(
          organization.email,
          organization.name,
          organization.contactFirstName || 'Utilisateur',
          organization.contactLastName || '',
          organization.type as 'club' | 'association' | 'company'
        );
      } catch (emailError) {
        console.error('Erreur envoi email de bienvenue:', emailError);
      }

      res.json({
        success: true,
        message: "Abonnement activé avec succès",
        data: {
          planName: plan.name,
          organizationId: orgId,
          paymentStatus: paymentResult.paymentStatus
        }
      });

    } catch (error: any) {
      console.error('Erreur vérification paiement:', error);
      res.status(500).json({
        error: error.message || "Erreur lors du traitement du paiement",
        code: "PAYMENT_PROCESSING_ERROR"
      });
    }
  });

  /**
   * GET /api/stripe/subscription-info - Informations sur l'abonnement actuel (utilisateur connecté)
   */
  app.get("/api/stripe/subscription-info", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organizationId = authReq.user.organizationId;

      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({
          error: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      const currentPlan = STRIPE_PLANS[organization.subscriptionType] || STRIPE_PLANS.decouverte;

      res.json({
        success: true,
        data: {
          subscriptionType: organization.subscriptionType,
          subscriptionStatus: organization.subscriptionStatus,
          subscriptionStartDate: organization.subscriptionStartDate,
          subscriptionEndDate: organization.subscriptionEndDate,
          packageRemainingEvents: organization.packageRemainingEvents,
          packageExpiryDate: organization.packageExpiryDate,
          currentPlan: {
            id: currentPlan.id,
            name: currentPlan.name,
            type: currentPlan.type,
            features: currentPlan.features,
          }
        }
      });

    } catch (error: any) {
      console.error('Erreur récupération info abonnement:', error);
      res.status(500).json({
        error: "Erreur lors de la récupération des informations d'abonnement",
        code: "SUBSCRIPTION_INFO_ERROR"
      });
    }
  });

  /**
   * POST /api/stripe/webhook - Gestionnaire de webhooks Stripe (optionnel)
   */
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({
          error: "Missing Stripe signature"
        });
      }

      await stripeService.handleWebhook(req.body, signature);
      
      res.json({ received: true });

    } catch (error: any) {
      console.error('Erreur webhook Stripe:', error);
      res.status(400).json({
        error: error.message || "Webhook error"
      });
    }
  });

  /**
   * GET /api/stripe/verify-config - Vérifier la configuration Stripe (admin)
   */
  app.get("/api/stripe/verify-config", requireAuth, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          error: "Accès administrateur requis",
          code: "ADMIN_REQUIRED"
        });
      }

      const verification = await stripeService.verifyConfiguration();
      
      res.json({
        success: true,
        data: verification
      });

    } catch (error: any) {
      console.error('Erreur vérification config Stripe:', error);
      res.status(500).json({
        error: "Erreur de vérification Stripe",
        code: "STRIPE_VERIFY_ERROR"
      });
    }
  });
}