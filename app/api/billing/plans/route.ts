import { NextRequest, NextResponse } from 'next/server';

// GET /api/billing/plans - Get available plans (public)
export async function GET(_request: NextRequest) {
  try {
    // Dynamic import to handle potential import errors gracefully
    const { PLANS } = await import('@/lib/plans');
    
    // Validate PLANS exists
    if (!PLANS || typeof PLANS !== 'object') {
      console.error('PLANS is not defined or invalid');
      return NextResponse.json(
        { error: 'Plans configuration not available' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const plans = Object.values(PLANS).map((plan) => ({
      ...plan,
      priceDisplay: plan.price === 0 ? 'Free' : `€${(plan.price / 100).toFixed(0)}/mo`,
    }));

    return NextResponse.json({ plans }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch plans', details: errorMessage },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
