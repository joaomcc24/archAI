import { NextRequest, NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';

// GET /api/billing/plans - Get available plans (public)
export async function GET(request: NextRequest) {
  try {
    const plans = Object.values(PLANS).map((plan) => ({
      ...plan,
      priceDisplay: plan.price === 0 ? 'Free' : `€${(plan.price / 100).toFixed(0)}/mo`,
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
