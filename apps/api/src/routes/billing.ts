import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { billingService, PLANS } from '../services/BillingService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
});

export const billingRoutes = Router();

// Get available plans
billingRoutes.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = Object.values(PLANS).map((plan) => ({
      ...plan,
      priceDisplay: plan.price === 0 ? 'Free' : `€${(plan.price / 100).toFixed(0)}/mo`,
    }));

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get current subscription
billingRoutes.get('/subscription', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const subscription = await billingService.getSubscription(userId);

    res.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Create checkout session
billingRoutes.post('/checkout', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    const { priceId } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/billing?success=true`;
    const cancelUrl = `${baseUrl}/billing?canceled=true`;

    const checkoutUrl = await billingService.createCheckoutSession(
      userId,
      userEmail,
      priceId,
      successUrl,
      cancelUrl
    );

    res.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create portal session for managing subscription
billingRoutes.post('/portal', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/billing`;

    const portalUrl = await billingService.createPortalSession(userId, returnUrl);

    res.json({ url: portalUrl });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Check usage limits
billingRoutes.get('/limits', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const [repos, snapshots, tasks] = await Promise.all([
      billingService.checkLimit(userId, 'repos'),
      billingService.checkLimit(userId, 'snapshots'),
      billingService.checkLimit(userId, 'tasks'),
    ]);

    res.json({
      limits: {
        repos,
        snapshots,
        tasks,
      },
    });
  } catch (error) {
    console.error('Error checking limits:', error);
    res.status(500).json({ error: 'Failed to check limits' });
  }
});

// Stripe webhook handler (no auth required, but verified by signature)
export const webhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    await billingService.handleWebhook(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }
};
