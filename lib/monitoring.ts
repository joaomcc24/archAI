// Monitoring and error tracking utilities

// Only initialize Sentry on server-side or if DSN is configured
let sentryInitialized = false;

export function initMonitoring() {
  if (typeof window === 'undefined') {
    // Server-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && !sentryInitialized) {
      try {
        // Sentry is initialized via sentry.server.config.ts
        sentryInitialized = true;
      } catch (error) {
        console.error('Failed to initialize Sentry:', error);
      }
    }
  } else {
    // Client-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && !sentryInitialized) {
      try {
        // Sentry is initialized via sentry.client.config.ts
        sentryInitialized = true;
      } catch (error) {
        console.error('Failed to initialize Sentry:', error);
      }
    }
  }
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  // Always log to console as fallback
  console.error('Error captured:', error, context);
  
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  // Fire-and-forget async import and capture
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureException(error, {
        contexts: {
          custom: context || {},
        },
      });
    })
    .catch(() => {
      // Silently fail if Sentry is not available
    });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>) {
  // Always log to console as fallback
  if (level === 'error') {
    console.error('Message captured:', message, context);
  } else if (level === 'warning') {
    console.warn('Message captured:', message, context);
  } else {
    console.log('Message captured:', message, context);
  }
  
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  // Fire-and-forget async import and capture
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureMessage(message, level, {
        contexts: {
          custom: context || {},
        },
      });
    })
    .catch(() => {
      // Silently fail if Sentry is not available
    });
}

export function setUserContext(userId: string, email?: string) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }

  // Fire-and-forget async import and set user
  import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.setUser({
        id: userId,
        email,
      });
    })
    .catch(() => {
      // Silently fail if Sentry is not available
    });
}
