'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: 'var(--landing-bg)',
            color: 'var(--landing-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 16px',
          }}
        >
          <div
            style={{
              maxWidth: '448px',
              width: '100%',
              textAlign: 'center',
              backgroundColor: 'rgba(15, 23, 42, 0.04)',
              borderRadius: '16px',
              padding: '24px 20px',
              border: '1px solid rgba(148, 163, 184, 0.4)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                marginBottom: '12px',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '14px',
                marginBottom: '24px',
                color: 'var(--landing-muted, #94a3b8)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              style={{
                padding: '8px 18px',
                backgroundImage: 'linear-gradient(to right, #22c55e, #22c55e, #14b8a6)',
                color: '#0b1120',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 10px 30px rgba(34, 197, 94, 0.25)',
              }}
            >
              Go to homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: Props): React.JSX.Element {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}