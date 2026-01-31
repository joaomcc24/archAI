// Server-side analytics helper
// Note: PostHog is primarily client-side, but we can track events via their API

export async function trackServerEvent(
  event: string,
  properties?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!posthogKey) {
    // Silently fail if PostHog is not configured
    return;
  }

  try {
    await fetch(`${posthogHost}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        properties: {
          ...properties,
          $lib: 'server',
          $lib_version: '1.0.0',
        },
        distinct_id: userId || 'anonymous',
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    // Silently fail - don't break the app if analytics fails
    console.error('Failed to track server event:', error);
  }
}

export const AnalyticsEvents = {
  // Auth
  SIGNED_UP: 'user_signed_up',
  SIGNED_IN: 'user_signed_in',
  SIGNED_OUT: 'user_signed_out',
  
  // Projects
  PROJECT_CONNECTED: 'project_connected',
  PROJECT_DELETED: 'project_deleted',
  
  // Snapshots
  SNAPSHOT_GENERATED: 'snapshot_generated',
  SNAPSHOT_VIEWED: 'snapshot_viewed',
  SNAPSHOT_DELETED: 'snapshot_deleted',
  
  // Tasks
  TASK_GENERATED: 'task_generated',
  TASK_VIEWED: 'task_viewed',
  TASK_DELETED: 'task_deleted',
  
  // Drift Detection
  DRIFT_DETECTED: 'drift_detected',
  
  // Billing
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Pages
  PAGE_VIEWED: 'page_viewed',
} as const;
