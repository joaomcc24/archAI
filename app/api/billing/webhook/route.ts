import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { billingService } from '@/lib/services/BillingService';

// Lazy initialize Stripe to avoid build-time errors
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
    });
  }
  return stripeInstance;
}

// POST /api/billing/webhook - Stripe webhook handler
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const body = await request.text();
    const event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
    await billingService.handleWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }
}
