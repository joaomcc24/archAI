import Stripe from 'stripe';
import { supabaseAdmin as supabase } from '../supabase-server';
import { PLANS, SubscriptionPlan } from '../plans';
import { appendFileSync } from 'fs';

// Lazy initialize Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10' as Stripe.LatestApiVersion,
    });
  }
  return stripeInstance;
}

export { PLANS };
export type { SubscriptionPlan };

export class BillingService {
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subscription?.stripe_customer_id) {
      return subscription.stripe_customer_id;
    }

    const customer = await getStripe().customers.create({
      email,
      metadata: {
        user_id: userId,
      },
    });

    try {
      if (subscription) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customer.id })
          .eq('user_id', userId);
        if (updateError) {
          console.error('Failed to update stripe_customer_id:', updateError);
        }
      } else {
        const { error: insertError } = await supabase.from('subscriptions').insert({
          user_id: userId,
          stripe_customer_id: customer.id,
          plan_id: 'free',
          status: 'free',
        });
        if (insertError) {
          console.error('Failed to insert stripe_customer_id:', insertError);
        }
      }
    } catch (error) {
      console.error('Failed to persist stripe_customer_id:', error);
    }

    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const customerId = await this.getOrCreateCustomer(userId, email);

    const session = await getStripe().checkout.sessions.create({
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

  async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      throw new Error('No subscription found for this user');
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return session.url;
  }

  async getSubscription(userId: string): Promise<{
    plan: SubscriptionPlan;
    status: string;
    currentPeriodEnd: Date | null;
  }> {
    try {
      // #region agent log
      try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:89',message:'Getting subscription',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
      // #endregion

      const { data: subscription, error: queryError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // #region agent log
      try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:96',message:'Subscription query result',data:{hasSubscription:!!subscription,status:subscription?.status,planId:subscription?.plan_id,queryError:queryError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
      // #endregion

      if (queryError) {
        console.error('Error querying subscription:', queryError);
        // Return free plan on error
        return {
          plan: PLANS.free,
          status: 'free',
          currentPeriodEnd: null,
        };
      }

      if (!subscription || subscription.status !== 'active') {
        // #region agent log
        try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:100',message:'Returning free plan',data:{planId:'free',limits:PLANS.free.limits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
        // #endregion
        return {
          plan: PLANS.free,
          status: 'free',
          currentPeriodEnd: null,
        };
      }

      const plan = PLANS[subscription.plan_id] || PLANS.free;

      // #region agent log
      try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:110',message:'Returning subscription plan',data:{planId:plan.id,limits:plan.limits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
      // #endregion

      return {
        plan,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : null,
      };
    } catch (error) {
      console.error('Unexpected error in getSubscription:', error);
      // Always return free plan on any unexpected error
      return {
        plan: PLANS.free,
        status: 'free',
        currentPeriodEnd: null,
      };
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    console.log(`handleWebhook called for event type: ${event.type} (${event.id})`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session data:', {
          id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata,
        });
        await this.handleCheckoutCompleted(session);
        console.log('Successfully processed checkout.session.completed');
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
      case 'payment_intent.succeeded':
      case 'payment_intent.created':
      case 'charge.succeeded':
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice_payment.paid':
        // These events are handled by checkout.session.completed or subscription.updated
        // Just acknowledge receipt
        console.log(`Received ${event.type} event (no action needed)`);
        break;
      default:
        // Log unhandled events but don't throw errors
        console.log(`Unhandled webhook event type: ${event.type}`);
        break;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.user_id;
    if (!userId) {
      console.error('checkout.session.completed: Missing user_id in metadata', {
        sessionId: session.id,
        metadata: session.metadata,
      });
      throw new Error('Missing user_id in checkout session metadata');
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      console.error('checkout.session.completed: Missing subscription ID', {
        sessionId: session.id,
      });
      throw new Error('Missing subscription ID in checkout session');
    }

    const subscriptionResponse = await getStripe().subscriptions.retrieve(subscriptionId);
    const subscription = subscriptionResponse as unknown as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };
    
    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      console.error('checkout.session.completed: Missing price ID in subscription', {
        subscriptionId,
      });
      throw new Error('Missing price ID in subscription');
    }

    const planId = await this.getPlanIdFromPriceId(priceId);

    console.log('checkout.session.completed: Upserting subscription', {
      userId,
      subscriptionId,
      priceId,
      planId,
      customerId: session.customer,
    });

    // Check if subscription already exists for this user
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          plan_id: planId,
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('checkout.session.completed: Failed to update subscription', {
          error: updateError,
          userId,
          subscriptionId,
          planId,
          priceId,
        });
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      console.log('checkout.session.completed: Successfully updated existing subscription', {
        userId,
        subscriptionId,
        planId,
        priceId,
      });
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase.from('subscriptions').insert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscriptionId,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

      if (insertError) {
        console.error('checkout.session.completed: Failed to insert subscription', {
          error: insertError,
          userId,
          subscriptionId,
          planId,
          priceId,
        });
        throw new Error(`Failed to create subscription: ${insertError.message}`);
      }

      console.log('checkout.session.completed: Successfully created new subscription', {
        userId,
        subscriptionId,
        planId,
        priceId,
      });
    }

    console.log('checkout.session.completed: Successfully created subscription', {
      userId,
      subscriptionId,
      planId,
      priceId,
    });
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
    const subscription = sub as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };
    const priceId = subscription.items.data[0]?.price.id;
    
    if (!priceId) {
      console.error('handleSubscriptionUpdated: Missing price ID in subscription', {
        subscriptionId: subscription.id,
      });
      return;
    }

    const planId = await this.getPlanIdFromPriceId(priceId);

    console.log('handleSubscriptionUpdated: Processing subscription update', {
      subscriptionId: subscription.id,
      priceId,
      planId,
      status: subscription.status,
    });

    // First, try to find existing subscription to get user_id
    const { data: existing, error: queryError } = await supabase
      .from('subscriptions')
      .select('user_id, stripe_customer_id, plan_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (queryError || !existing) {
      // If subscription doesn't exist yet, skip update
      // This can happen if subscription.updated fires before checkout.session.completed
      console.warn(`Subscription ${subscription.id} not found in database, skipping update. Error: ${queryError?.message || 'No record found'}`);
      return;
    }

    console.log('handleSubscriptionUpdated: Current subscription in DB', {
      userId: existing.user_id,
      currentPlanId: existing.plan_id,
      newPlanId: planId,
      planChanged: existing.plan_id !== planId,
    });

    // Update existing subscription (we know it exists because we found it above)
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        stripe_customer_id: existing.stripe_customer_id || subscription.customer as string,
        stripe_subscription_id: subscription.id,
        plan_id: planId,
        status: subscription.status === 'active' ? 'active' : 'inactive',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('user_id', existing.user_id);

    if (updateError) {
      console.error(`Failed to update subscription ${subscription.id}:`, updateError);
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    console.log('handleSubscriptionUpdated: Successfully updated subscription', {
      subscriptionId: subscription.id,
      userId: existing.user_id,
      planId,
      priceId,
    });
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
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID || '';
    const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID || '';
    
    const priceMap: Record<string, string> = {
      [proPriceId]: 'pro',
      [teamPriceId]: 'team',
    };

    const planId = priceMap[priceId] || 'pro';
    
    // Log for debugging
    console.log('getPlanIdFromPriceId:', {
      receivedPriceId: priceId,
      proPriceId,
      teamPriceId,
      mappedPlanId: planId,
      priceIdMatches: {
        pro: priceId === proPriceId,
        team: priceId === teamPriceId,
      },
    });

    return planId;
  }

  /**
   * Check if user can share projects (Team plan required)
   */
  async canShareProjects(userId: string): Promise<boolean> {
    const { plan } = await this.getSubscription(userId);
    return plan.id === 'team';
  }

  async checkLimit(
    userId: string,
    limitType: 'repos' | 'snapshots' | 'tasks'
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    // #region agent log
    try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:220',message:'checkLimit entry',data:{userId,limitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})+'\n');}catch(e){}
    // #endregion

    const { plan } = await this.getSubscription(userId);
    const limit = plan.limits[limitType];

    // #region agent log
    try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:225',message:'Plan and limit determined',data:{planId:plan.id,limit,limitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n');}catch(e){}
    // #endregion

    if (limit === -1) {
      // #region agent log
      try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:228',message:'Unlimited limit - returning allowed',data:{limitType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n');}catch(e){}
      // #endregion
      return { allowed: true, current: 0, limit: -1 };
    }

    let current = 0;

    if (limitType === 'repos') {
      // #region agent log
      try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:233',message:'Querying projects count',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n');}catch(e){}
      // #endregion
      // Count only projects where user is owner (not shared projects they're a member of)
      const { count, error } = await supabase
        .from('project_members')
        .select('project_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'owner');
      
      // #region agent log
      try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:238',message:'Projects count result',data:{count:count||0,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n');}catch(e){}
      // #endregion
      
      current = count || 0;
    } else if (limitType === 'snapshots') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Count snapshots from projects where user has access (owner, member, or viewer)
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
      
      const projectIds = memberProjects?.map((mp) => mp.project_id) || [];
      
      if (projectIds.length === 0) {
        current = 0;
      } else {
        const { count } = await supabase
          .from('snapshots')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .gte('created_at', startOfMonth.toISOString());
        current = count || 0;
      }
    } else if (limitType === 'tasks') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Count tasks from projects where user has access (owner, member, or viewer)
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);
      
      const projectIds = memberProjects?.map((mp) => mp.project_id) || [];
      
      if (projectIds.length === 0) {
        current = 0;
      } else {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds)
          .gte('created_at', startOfMonth.toISOString());
        current = count || 0;
      }
    }

    const allowed = current < limit;
    
    // #region agent log
    try{appendFileSync('/Users/joaocardoso/SaaS/archassistant/.cursor/debug.log',JSON.stringify({location:'lib/services/BillingService.ts:263',message:'checkLimit result',data:{allowed,current,limit,comparison:`${current} < ${limit} = ${allowed}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,E'})+'\n');}catch(e){}
    // #endregion

    return {
      allowed,
      current,
      limit,
    };
  }
}

export const billingService = new BillingService();
