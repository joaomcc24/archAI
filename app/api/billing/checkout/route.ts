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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/billing?success=true`;
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
