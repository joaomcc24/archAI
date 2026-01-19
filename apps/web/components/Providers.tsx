'use client';

import React, { PropsWithChildren } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';

export function Providers({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}
