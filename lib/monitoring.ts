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
  if (typeof window !== 'undefined') {
    // Client-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/nextjs');
        Sentry.captureException(error, {
          contexts: {
            custom: context || {},
          },
        });
      } catch {
        // Silently fail if Sentry is not available
      }
    }
  } else {
    // Server-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/nextjs');
        Sentry.captureException(error, {
          contexts: {
            custom: context || {},
          },
        });
      } catch {
        // Silently fail if Sentry is not available
      }
    }
  }
  
  // Always log to console as fallback
  console.error('Error captured:', error, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    // Client-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/nextjs');
        Sentry.captureMessage(message, level, {
          contexts: {
            custom: context || {},
          },
        });
      } catch {
        // Silently fail if Sentry is not available
      }
    }
  } else {
    // Server-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/nextjs');
        Sentry.captureMessage(message, level, {
          contexts: {
            custom: context || {},
          },
        });
      } catch {
        // Silently fail if Sentry is not available
      }
    }
  }
  
  // Always log to console as fallback
  if (level === 'error') {
    console.error('Message captured:', message, context);
  } else if (level === 'warning') {
    console.warn('Message captured:', message, context);
  } else {
    console.log('Message captured:', message, context);
  }
}

export function setUserContext(userId: string, email?: string) {
  if (typeof window !== 'undefined') {
    // Client-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/nextjs');
        Sentry.setUser({
          id: userId,
          email,
        });
      } catch {
        // Silently fail if Sentry is not available
      }
    }
  } else {
    // Server-side
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/nextjs');
        Sentry.setUser({
          id: userId,
          email,
        });
      } catch {
        // Silently fail if Sentry is not available
      }
    }
  }
}
