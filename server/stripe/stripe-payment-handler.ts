import type { Stripe } from 'stripe';
import { getStripePlan } from './stripe-config';

interface PaymentSuccessParams {
  sessionId: string;
  organizationId: string;
  planId: string;
  mode: 'registration' | 'upgrade';
  paymentIntentId?: string;
  subscriptionId?: string;
  customerEmail: string;
  amountPaid: number;
}

/**
 * Traiter un paiement réussi (checkout.session.completed)
 */
export async function handleSuccessfulPayment(params: PaymentSuccessParams): Promise<void> {
  console.log('🎯 Traitement paiement réussi:', {
    organizationId: params.organizationId,
    planId: params.planId,
    mode: params.mode
  });
  
  const plan = getStripePlan(params.planId);
  if (!plan) {
    throw new Error(`Plan non trouvé: ${params.planId}`);
  }
  
  try {
    // Importer le service de base de données
    const { db, organizations } = await import('../../db/index');
    const { eq } = await import('drizzle-orm');
    
    // Récupérer l'organisation
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, params.organizationId))
      .limit(1);
      
    const organization = orgResult[0];
    if (!organization) {
      throw new Error(`Organisation non trouvée: ${params.organizationId}`);
    }
    
    // Calculer les nouvelles valeurs selon le plan
    const updateData = calculateSubscriptionUpdate(organization, plan, params);
    
    // Mettre à jour l'organisation
    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, params.organizationId));
    
    console.log('✅ Organisation mise à jour:', {
      organizationId: params.organizationId,
      newPlan: plan.id,
      subscriptionType: updateData.subscriptionType
    });
    
    // Envoyer l'email de confirmation si c'est une inscription
    if (params.mode === 'registration') {
      await sendRegistrationConfirmationEmail(organization, plan, params);
    } else {
      await sendUpgradeConfirmationEmail(organization, plan, params);
    }
    
  } catch (error) {
    console.error('❌ Erreur traitement paiement:', error);
    throw error;
  }
}

/**
 * Calculer les mises à jour de l'abonnement
 */
function calculateSubscriptionUpdate(
  organization: any, 
  plan: any, 
  params: PaymentSuccessParams
): Record<string, any> {
  const now = new Date();
  
  const updateData: Record<string, any> = {
    subscriptionType: plan.id === 'evenement_single' || plan.id === 'evenement_pack10' 
      ? 'evenementielle' 
      : plan.id.replace('_', '_'), // pro_club, pro_pme, etc.
    subscriptionStatus: 'active',
    lastPaymentDate: now,
    updatedAt: now,
    // Infos Stripe
    stripeCustomerId: params.customerEmail, // On stockera l'ID réel plus tard
    stripeSessionId: params.sessionId
  };
  
  // Configuration selon le type de plan
  if (plan.type === 'payment') {
    // Plans événementiels (paiement unique)
    if (plan.id === 'evenement_single') {
      updateData.packageRemainingEvents = 1;
      updateData.packageExpiryDate = new Date(now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000); // 12 mois
    } else if (plan.id === 'evenement_pack10') {
      updateData.packageRemainingEvents = (organization.packageRemainingEvents || 0) + 10;
      updateData.packageExpiryDate = new Date(now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000); // 12 mois
    }
  } else if (plan.type === 'subscription') {
    // Plans pro (abonnement mensuel)
    updateData.subscriptionEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours
    updateData.stripeSubscriptionId = params.subscriptionId;
    
    // Réinitialiser les limites événementielles pour les pro
    updateData.packageRemainingEvents = null;
    updateData.packageExpiryDate = null;
  }
  
  return updateData;
}

/**
 * Traiter une mise à jour d'abonnement
 */
export async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  console.log('🔄 Mise à jour abonnement:', subscription.id);
  
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    console.warn('⚠️  Pas d\'organizationId dans les métadonnées de l\'abonnement');
    return;
  }
  
  try {
    const { db, organizations } = await import('../../db/index');
    const { eq } = await import('drizzle-orm');
    
    const updateData: Record<string, any> = {
      subscriptionStatus: subscription.status,
      updatedAt: new Date()
    };
    
    // Mettre à jour la date de fin si l'abonnement est actif
    if (subscription.status === 'active' && subscription.current_period_end) {
      updateData.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    }
    
    await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organizationId));
      
    console.log('✅ Abonnement mis à jour:', {
      organizationId,
      status: subscription.status,
      endDate: updateData.subscriptionEndDate
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour abonnement:', error);
  }
}

/**
 * Traiter l'annulation d'un abonnement
 */
export async function handleSubscriptionCancellation(subscription: Stripe.Subscription): Promise<void> {
  console.log('🗑️  Annulation abonnement:', subscription.id);
  
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    console.warn('⚠️  Pas d\'organizationId dans les métadonnées de l\'abonnement');
    return;
  }
  
  try {
    const { db, organizations } = await import('../../db/index');
    const { eq } = await import('drizzle-orm');
    
    // Rétrograder vers le plan découverte
    await db
      .update(organizations)
      .set({
        subscriptionType: 'decouverte',
        subscriptionStatus: 'canceled',
        subscriptionEndDate: new Date(subscription.ended_at! * 1000),
        stripeSubscriptionId: null,
        packageRemainingEvents: null,
        packageExpiryDate: null,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId));
      
    console.log('✅ Abonnement annulé, retour au plan découverte:', organizationId);
    
    // Envoyer email de notification d'annulation
    await sendCancellationNotificationEmail(organizationId);
    
  } catch (error) {
    console.error('❌ Erreur annulation abonnement:', error);
  }
}

/**
 * Envoyer l'email de confirmation d'inscription avec paiement
 */
async function sendRegistrationConfirmationEmail(
  organization: any, 
  plan: any, 
  params: PaymentSuccessParams
): Promise<void> {
  try {
    const { EmailService } = await import('../email');
    
    const emailData = {
      to: organization.email,
      templateId: 'registration-paid-confirmation',
      dynamicTemplateData: {
        organizationName: organization.name,
        planName: plan.name,
        planFeatures: plan.features,
        amountPaid: (params.amountPaid / 100).toFixed(2),
        currency: plan.currency.toUpperCase(),
        dashboardUrl: `${process.env.APP_URL}/dashboard`,
        supportUrl: `${process.env.APP_URL}/support`
      }
    };
    
    await EmailService.sendEmail(emailData);
    console.log('📧 Email de confirmation d\'inscription envoyé:', organization.email);
    
  } catch (error) {
    console.error('❌ Erreur envoi email confirmation inscription:', error);
  }
}

/**
 * Envoyer l'email de confirmation d'upgrade
 */
async function sendUpgradeConfirmationEmail(
  organization: any, 
  plan: any, 
  params: PaymentSuccessParams
): Promise<void> {
  try {
    const { EmailService } = await import('../email');
    
    const emailData = {
      to: organization.email,
      templateId: 'plan-upgrade-confirmation',
      dynamicTemplateData: {
        organizationName: organization.name,
        newPlanName: plan.name,
        planFeatures: plan.features,
        amountPaid: (params.amountPaid / 100).toFixed(2),
        currency: plan.currency.toUpperCase(),
        dashboardUrl: `${process.env.APP_URL}/dashboard`,
        supportUrl: `${process.env.APP_URL}/support`
      }
    };
    
    await EmailService.sendEmail(emailData);
    console.log('📧 Email de confirmation d\'upgrade envoyé:', organization.email);
    
  } catch (error) {
    console.error('❌ Erreur envoi email confirmation upgrade:', error);
  }
}

/**
 * Envoyer l'email de notification d'annulation
 */
async function sendCancellationNotificationEmail(organizationId: string): Promise<void> {
  try {
    const { db, organizations } = await import('../../db/index');
    const { eq } = await import('drizzle-orm');
    
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
      
    const organization = orgResult[0];
    if (!organization) return;
    
    const { EmailService } = await import('../email');
    
    const emailData = {
      to: organization.email,
      templateId: 'subscription-cancelled',
      dynamicTemplateData: {
        organizationName: organization.name,
        dashboardUrl: `${process.env.APP_URL}/dashboard`,
        plansUrl: `${process.env.APP_URL}/subscription`,
        supportUrl: `${process.env.APP_URL}/support`
      }
    };
    
    await EmailService.sendEmail(emailData);
    console.log('📧 Email d\'annulation envoyé:', organization.email);
    
  } catch (error) {
    console.error('❌ Erreur envoi email annulation:', error);
  }
}