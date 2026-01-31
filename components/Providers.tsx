'use client';

import React, { PropsWithChildren, useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { BillingProvider } from '../contexts/BillingContext';
import { ErrorBoundary } from './ErrorBoundary';
import { initAnalytics } from '../lib/analytics';
import { initMonitoring } from '../lib/monitoring';

export function Providers({ children }: PropsWithChildren): React.JSX.Element {
  useEffect(() => {
    initAnalytics();
    initMonitoring();
  }, []);

  return (
    // ErrorBoundary commented out temporarily for testing
    // <ErrorBoundary>
      <AuthProvider>
        <BillingProvider>
          {children}
        </BillingProvider>
      </AuthProvider>
    // </ErrorBoundary>
  );
}
