'use client';

import React, { PropsWithChildren, useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { BillingProvider } from '../contexts/BillingContext';
import { ErrorBoundary } from './ErrorBoundary';
import { initAnalytics } from '../lib/analytics';
import { initMonitoring } from '../lib/monitoring';
import { ThemeProvider } from '../contexts/ThemeContext';

export function Providers({ children }: PropsWithChildren): React.JSX.Element {
  useEffect(() => {
    // Initialize analytics and monitoring only on client side
    if (typeof window !== 'undefined') {
      try {
        initAnalytics();
        initMonitoring();
      } catch (error) {
        console.error('Failed to initialize analytics/monitoring:', error);
      }
    }
  }, []);

  return (
    // ErrorBoundary commented out temporarily for testing
    // <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BillingProvider>
            {children}
          </BillingProvider>
        </AuthProvider>
      </ThemeProvider>
    // </ErrorBoundary>
  );
}
