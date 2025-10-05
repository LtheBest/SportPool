import type { Express } from "express";
import { StripeServiceNew } from "./stripe-service-new";
import { requireAuth, AuthenticatedRequest } from "./auth";
import { storage } from "./storage";
import { SUBSCRIPTION_PLANS } from "./subscription-config";
import { SubscriptionService } from "./subscription-service";
import { emailServiceEnhanced as emailService } from "./email-enhanced";

export function registerStripeRoutes(app: Express): void {
  
  // Create checkout session for registration (Case 1: New paid account)
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { organizationId, planId, customerEmail } = req.body;

      if (!organizationId || !planId) {
        return res.status(400).json({
          message: "Organization ID and plan ID are required",
          code: "MISSING_PARAMS"
        });
      }

      // Validate plan exists and is not 'decouverte'
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        return res.status(400).json({
          message: "Plan invalide",
          code: "INVALID_PLAN"
        });
      }

      if (planId === 'decouverte') {
        return res.status(400).json({
          message: "Le plan Découverte est gratuit",
          code: "FREE_PLAN"
        });
      }

      // Verify organization exists
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({
          message: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      const baseUrl = process.env.APP_URL || 'https://teammove.onrender.com';
      
      const sessionDetails = await StripeServiceNew.createCheckoutSession({
        organizationId,
        planId,
        successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&org_id=${organizationId}`,
        cancelUrl: `${baseUrl}/payment/cancelled?org_id=${organizationId}`,
        customerEmail: customerEmail || organization.email,
      });

      res.json({
        success: true,
        sessionId: sessionDetails.sessionId,
        checkoutUrl: sessionDetails.url,
        planId: sessionDetails.planId,
      });

    } catch (error: any) {
      console.error('Stripe checkout session error:', error);
      res.status(500).json({
        message: error.message || "Erreur lors de la création de la session de paiement",
        code: "STRIPE_ERROR"
      });
    }
  });

  // Create checkout session for subscription upgrade (Case 2: Upgrade from Découverte)
  app.post("/api/stripe/upgrade-subscription", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({
          message: "Plan ID requis",
          code: "MISSING_PLAN_ID"
        });
      }

      // Validate plan exists and is not 'decouverte'
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) {
        return res.status(400).json({
          message: "Offre sélectionnée invalide",
          code: "INVALID_PLAN"
        });
      }

      if (planId === 'decouverte') {
        return res.status(400).json({
          message: "Vous êtes déjà sur le plan Découverte",
          code: "ALREADY_ON_FREE_PLAN"
        });
      }

      // Get organization details
      const organization = await storage.getOrganization(authReq.user.organizationId);
      if (!organization) {
        return res.status(404).json({
          message: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      // Check if already on a paid plan
      if (organization.subscriptionType !== 'decouverte') {
        return res.status(400).json({
          message: "Vous avez déjà un abonnement actif",
          code: "ALREADY_SUBSCRIBED"
        });
      }

      const baseUrl = process.env.APP_URL || 'https://teammove.onrender.com';
      
      const sessionDetails = await StripeServiceNew.createCheckoutSession({
        organizationId: authReq.user.organizationId,
        planId,
        successUrl: `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/dashboard?payment=cancelled`,
        customerEmail: organization.email,
      });

      res.json({
        success: true,
        sessionId: sessionDetails.sessionId,
        checkoutUrl: sessionDetails.url,
        planId: sessionDetails.planId,
      });

    } catch (error: any) {
      console.error('Subscription upgrade error:', error);
      res.status(500).json({
        message: error.message || "Erreur lors de la mise à niveau",
        code: "UPGRADE_ERROR"
      });
    }
  });

  // Handle payment success callback
  app.post("/api/stripe/payment-success", async (req, res) => {
    try {
      const { sessionId, organizationId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          message: "Session ID requis",
          code: "MISSING_SESSION_ID"
        });
      }

      // Verify payment with Stripe
      const paymentResult = await StripeServiceNew.handlePaymentSuccess(sessionId);
      
      if (!paymentResult.success) {
        return res.status(400).json({
          message: "Paiement non confirmé",
          code: "PAYMENT_NOT_CONFIRMED"
        });
      }

      const orgId = paymentResult.organizationId || organizationId;
      const planId = paymentResult.planId;

      if (!orgId || !planId) {
        return res.status(400).json({
          message: "Données de paiement incomplètes",
          code: "INCOMPLETE_PAYMENT_DATA"
        });
      }

      // Get organization
      const organization = await storage.getOrganization(orgId);
      if (!organization) {
        return res.status(404).json({
          message: "Organisation non trouvée",
          code: "ORG_NOT_FOUND"
        });
      }

      // Update organization with new subscription
      const plan = SUBSCRIPTION_PLANS[planId];
      await storage.updateOrganization(orgId, {
        subscriptionType: planId,
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        paymentSessionId: sessionId,
      });

      // Send welcome email for successful upgrade
      try {
        await emailService.sendWelcomeEmail(
          organization.email,
          organization.name,
          organization.contactFirstName,
          organization.contactLastName,
          organization.type as 'club' | 'association' | 'company'
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      res.json({
        success: true,
        message: "Abonnement activé avec succès",
        planName: plan.name,
        organizationId: orgId,
      });

    } catch (error: any) {
      console.error('Payment success handling error:', error);
      res.status(500).json({
        message: error.message || "Erreur lors du traitement du paiement",
        code: "PAYMENT_PROCESSING_ERROR"
      });
    }
  });

  // Get Stripe configuration info
  app.get("/api/stripe/config", (req, res) => {
    try {
      const publishableKey = StripeServiceNew.getPublishableKey();
      const isTestMode = StripeServiceNew.isTestMode();

      if (!publishableKey) {
        return res.status(500).json({
          message: "Configuration Stripe manquante",
          code: "STRIPE_CONFIG_MISSING"
        });
      }

      res.json({
        publishableKey,
        testMode: isTestMode,
      });

    } catch (error: any) {
      console.error('Stripe config error:', error);
      res.status(500).json({
        message: "Erreur de configuration Stripe",
        code: "STRIPE_CONFIG_ERROR"
      });
    }
  });

  // Verify Stripe configuration (admin only)
  app.get("/api/stripe/verify", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const organization = await storage.getOrganization(authReq.user.organizationId);
      
      if (!organization || organization.role !== 'admin') {
        return res.status(403).json({
          message: "Accès administrateur requis",
          code: "ADMIN_REQUIRED"
        });
      }

      const verification = await StripeServiceNew.verifyConfiguration();
      
      res.json(verification);

    } catch (error: any) {
      console.error('Stripe verification error:', error);
      res.status(500).json({
        message: "Erreur de vérification Stripe",
        code: "STRIPE_VERIFY_ERROR"
      });
    }
  });

  // Handle Stripe webhooks
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({
          message: "Missing Stripe signature",
        });
      }

      await StripeServiceNew.handleWebhook(req.body, signature);
      
      res.json({ received: true });

    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({
        message: error.message || "Webhook error",
      });
    }
  });
}