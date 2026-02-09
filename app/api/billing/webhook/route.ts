import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { billingService } from '@/lib/services/BillingService';

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

// POST /api/billing/webhook - Stripe webhook handler
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  // Support both CLI secret (whsec_) and production secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_CLI;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_CLI');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event | null = null;
  
  try {
    const body = await request.text();
    
    // Log webhook attempt for debugging
    console.log('Webhook received:', {
      hasSignature: !!sig,
      signatureLength: sig?.length,
      bodyLength: body.length,
      webhookSecretSet: !!webhookSecret,
      webhookSecretPrefix: webhookSecret?.substring(0, 10),
    });
    
    try {
      event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
    } catch (constructError) {
      // More detailed error for signature verification failures
      const errorMessage = constructError instanceof Error ? constructError.message : 'Unknown error';
      console.error('Webhook signature verification failed:', {
        error: errorMessage,
        signatureProvided: !!sig,
        webhookSecretProvided: !!webhookSecret,
        bodyPreview: body.substring(0, 100),
      });
      
      // If using Stripe CLI, the secret might be different
      if (errorMessage.includes('signature') || errorMessage.includes('No signatures found')) {
        console.error('Signature verification failed. Make sure you are using the correct webhook secret:');
        console.error('- For Stripe CLI: Use the secret from `stripe listen` command (starts with whsec_)');
        console.error('- For production: Use the webhook secret from Stripe Dashboard');
      }
      
      throw constructError;
    }
    
    console.log(`Processing webhook: ${event.type} (${event.id})`);
    
    await billingService.handleWebhook(event);
    
    console.log(`Successfully processed webhook: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const eventInfo = event ? `${event.type} (${event.id})` : 'unknown event';
    console.error(`Webhook error [${eventInfo}]:`, message);
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }
}
