import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    repos: number;
    snapshots: number;
    tasks: number;
  };
}

export const PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'eur',
    interval: 'month',
    features: [
      '1 GitHub repository',
      '3 architecture snapshots/month',
      '10 task generations/month',
      'Community support',
    ],
    limits: {
      repos: 1,
      snapshots: 3,
      tasks: 10,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1900, // in cents
    currency: 'eur',
    interval: 'month',
    features: [
      'Up to 5 GitHub repositories',
      'Unlimited architecture snapshots',
      'Unlimited task generations',
      'Priority support',
      'Export to PDF',
    ],
    limits: {
      repos: 5,
      snapshots: -1, // unlimited
      tasks: -1, // unlimited
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 4900, // in cents
    currency: 'eur',
    interval: 'month',
    features: [
      'Unlimited GitHub repositories',
      'Unlimited architecture snapshots',
      'Unlimited task generations',
      'Priority support',
      'Export to PDF',
      'Team collaboration (coming soon)',
    ],
    limits: {
      repos: -1, // unlimited
      snapshots: -1,
      tasks: -1,
    },
  },
};

export class BillingService {
  /**
   * Create or retrieve a Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.stripe_customer_id) {
      return subscription.stripe_customer_id;
    }

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        user_id: userId,
      },
    });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId, email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
      },
    });

    return session.url || '';
  }

  /**
   * Create a portal session for managing subscription
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!subscription?.stripe_customer_id) {
      throw new Error('No subscription found for this user');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string): Promise<{
    plan: SubscriptionPlan;
    status: string;
    currentPeriodEnd: Date | null;
  }> {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!subscription || subscription.status !== 'active') {
      return {
        plan: PLANS.free,
        status: 'free',
        currentPeriodEnd: null,
      };
    }

    const plan = PLANS[subscription.plan_id] || PLANS.free;

    return {
      plan,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(invoice);
        break;
      }
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.user_id;
    if (!userId) return;

    const subscriptionId = session.subscription as string;
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    const subscription = subscriptionResponse as unknown as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };
    
    // Determine plan from price
    const priceId = subscription.items.data[0]?.price.id;
    const planId = await this.getPlanIdFromPriceId(priceId);

    await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
    const subscription = sub as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };
    const priceId = subscription.items.data[0]?.price.id;
    const planId = await this.getPlanIdFromPriceId(priceId);

    await supabase
      .from('subscriptions')
      .update({
        plan_id: planId,
        status: subscription.status === 'active' ? 'active' : 'inactive',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        plan_id: 'free',
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const invoiceWithSub = invoice as Stripe.Invoice & { subscription?: string };
    const subscriptionId = invoiceWithSub.subscription;
    if (!subscriptionId) return;

    await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
      })
      .eq('stripe_subscription_id', subscriptionId);
  }

  private async getPlanIdFromPriceId(priceId: string): Promise<string> {
    // Map Stripe price IDs to plan IDs
    // You'll need to set these as environment variables after creating prices in Stripe
    const priceMap: Record<string, string> = {
      [process.env.STRIPE_PRO_PRICE_ID || '']: 'pro',
      [process.env.STRIPE_TEAM_PRICE_ID || '']: 'team',
    };

    return priceMap[priceId] || 'pro';
  }

  /**
   * Check if user can perform an action based on their plan limits
   */
  async checkLimit(
    userId: string,
    limitType: 'repos' | 'snapshots' | 'tasks'
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const { plan } = await this.getSubscription(userId);
    const limit = plan.limits[limitType];

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1 };
    }

    let current = 0;

    if (limitType === 'repos') {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      current = count || 0;
    } else if (limitType === 'snapshots') {
      // Count snapshots created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('snapshots')
        .select('*, projects!inner(user_id)', { count: 'exact', head: true })
        .eq('projects.user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
      current = count || 0;
    } else if (limitType === 'tasks') {
      // Count tasks created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('tasks')
        .select('*, projects!inner(user_id)', { count: 'exact', head: true })
        .eq('projects.user_id', userId)
        .gte('created_at', startOfMonth.toISOString());
      current = count || 0;
    }

    return {
      allowed: current < limit,
      current,
      limit,
    };
  }
}

export const billingService = new BillingService();
