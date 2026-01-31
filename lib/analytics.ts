import posthog from 'posthog-js';

let initialized = false;

export const initAnalytics = () => {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!posthogKey) {
    console.warn('PostHog key not configured');
    return;
  }

  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        // Disable in development if you want
        // posthog.opt_out_capturing();
      }
    },
  });
  
  initialized = true;
};

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  posthog.identify(userId, properties);
};

export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  posthog.capture(event, properties);
};

export const resetAnalytics = () => {
  if (typeof window === 'undefined') return;
  posthog.reset();
};

// Pre-defined events for consistency
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
  
  // Billing
  CHECKOUT_STARTED: 'checkout_started',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Pages
  PAGE_VIEWED: 'page_viewed',
} as const;
