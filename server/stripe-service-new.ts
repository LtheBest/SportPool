import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS } from './subscription-config';

// Initialize Stripe with the secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-09-30.acacia',
});

export interface CreateCheckoutSessionParams {
  organizationId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface SubscriptionDetails {
  sessionId: string;
  url: string;
  planId: string;
}

export class StripeServiceNew {
  
  // Create a Stripe checkout session for subscription
  static async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<SubscriptionDetails> {
    try {
      // Validate that the plan exists
      const plan = SUBSCRIPTION_PLANS[params.planId];
      if (!plan) {
        throw new Error(`Plan invalide: ${params.planId}`);
      }

      // Create checkout session configuration
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: 'payment', // Use 'payment' mode for one-time payments
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: plan.name,
                description: plan.description,
              },
              unit_amount: plan.price * 100, // Convert to centimes
            },
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          organizationId: params.organizationId,
          planId: params.planId,
        },
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
      };

      // Add customer email if provided
      if (params.customerEmail) {
        sessionConfig.customer_email = params.customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      if (!session.url) {
        throw new Error('Session URL not generated');
      }

      return {
        sessionId: session.id,
        url: session.url,
        planId: params.planId,
      };
    } catch (error: any) {
      console.error('Stripe checkout session creation error:', error);
      throw new Error(`Erreur de paiement: ${error.message}`);
    }
  }

  // Retrieve a checkout session by ID
  static async getSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent', 'customer']
      });
      return session;
    } catch (error: any) {
      console.error('Error retrieving session:', error);
      return null;
    }
  }

  // Handle successful payment - verify and process
  static async handlePaymentSuccess(sessionId: string): Promise<{ success: boolean; organizationId?: string; planId?: string }> {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.payment_status !== 'paid') {
        throw new Error('Payment not completed');
      }

      const organizationId = session.metadata?.organizationId;
      const planId = session.metadata?.planId;

      if (!organizationId || !planId) {
        throw new Error('Missing metadata');
      }

      return {
        success: true,
        organizationId,
        planId,
      };
    } catch (error: any) {
      console.error('Error handling payment success:', error);
      return { success: false };
    }
  }

  // Create a customer in Stripe
  static async createCustomer(organizationId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId,
        },
      });

      return customer;
    } catch (error: any) {
      console.error('Error creating customer:', error);
      throw new Error(`Erreur création client: ${error.message}`);
    }
  }

  // Find or create a customer
  static async findOrCreateCustomer(organizationId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      // Search for existing customer by email
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        
        // Update metadata if necessary
        if (customer.metadata?.organizationId !== organizationId) {
          return await stripe.customers.update(customer.id, {
            metadata: {
              organizationId,
            },
          }) as Stripe.Customer;
        }
        
        return customer;
      }

      // Create new customer
      return await this.createCustomer(organizationId, email, name);
    } catch (error: any) {
      console.error('Error finding/creating customer:', error);
      throw error;
    }
  }

  // Check if Stripe is in test mode
  static isTestMode(): boolean {
    const apiKey = process.env.STRIPE_SECRET_KEY || '';
    return apiKey.includes('_test_') || apiKey.startsWith('sk_test_');
  }

  // Get publishable key based on mode
  static getPublishableKey(): string {
    if (this.isTestMode()) {
      return process.env.STRIPE_PUBLISHABLE_TEST_KEY || process.env.VITE_STRIPE_PUBLIC_KEY || '';
    }
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }

  // Verify Stripe configuration
  static async verifyConfiguration(): Promise<{ valid: boolean; mode: string; issues?: string[] }> {
    try {
      const issues: string[] = [];
      
      // Check API keys
      if (!process.env.STRIPE_SECRET_KEY) {
        issues.push('STRIPE_SECRET_KEY missing');
      }

      const mode = this.isTestMode() ? 'test' : 'production';

      // Basic connection test
      try {
        await stripe.accounts.retrieve();
      } catch (error) {
        issues.push('Stripe connection failed');
      }

      return {
        valid: issues.length === 0,
        mode,
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error: any) {
      return {
        valid: false,
        mode: 'unknown',
        issues: [error.message]
      };
    }
  }

  // Handle webhooks (for future use)
  static async handleWebhook(payload: string | Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured - webhook ignored');
      return;
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      console.log(`📨 Webhook received: ${event.type} - ID: ${event.id}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          console.log('💳 Payment succeeded:', (event.data.object as Stripe.PaymentIntent).id);
          break;

        case 'payment_intent.payment_failed':
          console.log('❌ Payment failed:', (event.data.object as Stripe.PaymentIntent).id);
          break;

        default:
          console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
      }
    } catch (error: any) {
      console.error('❌ Stripe webhook error:', error);
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  // Handle checkout completed webhook
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('✅ Checkout session completed:', session.id);
    
    const organizationId = session.metadata?.organizationId;
    const planId = session.metadata?.planId;
    
    if (!organizationId || !planId) {
      console.error('❌ Missing metadata in checkout session');
      return;
    }

    // Process successful payment - import subscription service to handle upgrade
    try {
      const { SubscriptionService } = await import('./subscription-service');
      await SubscriptionService.handlePaymentSuccess(session.id, organizationId, planId);
    } catch (error) {
      console.error('❌ Error processing payment success:', error);
    }
  }
}

export default StripeServiceNew;