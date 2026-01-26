import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { billingService } from '@/lib/services/BillingService';

// GET /api/billing/limits - Check usage limits
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const [repos, snapshots, tasks] = await Promise.all([
      billingService.checkLimit(auth.user.id, 'repos'),
      billingService.checkLimit(auth.user.id, 'snapshots'),
      billingService.checkLimit(auth.user.id, 'tasks'),
    ]);

    return NextResponse.json({
      limits: {
        repos,
        snapshots,
        tasks,
      },
    });
  } catch (error) {
    console.error('Error checking limits:', error);
    return NextResponse.json({ error: 'Failed to check limits' }, { status: 500 });
  }
}
