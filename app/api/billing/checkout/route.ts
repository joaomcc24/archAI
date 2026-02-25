import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { billingService } from '@/lib/services/BillingService';
import { trackServerEvent, AnalyticsEvents } from '@/lib/analytics-server';
import { validateRequestBody, checkoutSchema, formatZodError } from '@/lib/validation';
import { formatErrorResponse, ValidationError } from '@/lib/errors';
import '@/lib/env-validation'; // Validate env vars on module load

// POST /api/billing/checkout - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    // Validate request body
    const validation = await validateRequestBody(request, checkoutSchema);
    if (!validation.success) {
      const zodError = formatZodError(validation.error);
      const error = new ValidationError(zodError.error, zodError.fields);
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    const { priceId } = validation.data;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('NEXT_PUBLIC_APP_URL must be set in production for billing checkout redirects.');
      } else {
        console.warn(
          'NEXT_PUBLIC_APP_URL is not set. Falling back to http://localhost:3000 for billing checkout URLs.'
        );
      }
    }
    const baseUrl = appUrl || 'http://localhost:3000';
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '';
    const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || '';
    const planId = priceId === teamPriceId ? 'team' : priceId === proPriceId ? 'pro' : 'pro';

    const successUrl = `${baseUrl}/billing?success=true&plan=${encodeURIComponent(planId)}`;
    const cancelUrl = `${baseUrl}/billing?canceled=true`;

    const checkoutUrl = await billingService.createCheckoutSession(
      auth.user.id,
      auth.user.email,
      priceId,
      successUrl,
      cancelUrl
    );

    // Track analytics event
    await trackServerEvent(AnalyticsEvents.CHECKOUT_STARTED, {
      price_id: priceId,
    }, auth.user.id);

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
