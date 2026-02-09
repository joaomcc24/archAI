import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { billingService } from '@/lib/services/BillingService';

// GET /api/billing/limits - Check usage limits
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const [repos, snapshots, tasks] = await Promise.all([
      billingService.checkLimit(auth.user.id, 'repos').catch((err) => {
        console.error('Error checking repos limit:', err);
        return { allowed: true, current: 0, limit: -1 };
      }),
      billingService.checkLimit(auth.user.id, 'snapshots').catch((err) => {
        console.error('Error checking snapshots limit:', err);
        return { allowed: true, current: 0, limit: -1 };
      }),
      billingService.checkLimit(auth.user.id, 'tasks').catch((err) => {
        console.error('Error checking tasks limit:', err);
        return { allowed: true, current: 0, limit: -1 };
      }),
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
    const errorMessage = error instanceof Error ? error.message : 'Failed to check limits';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
