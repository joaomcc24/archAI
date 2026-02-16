'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--landing-bg)] text-[var(--landing-text)]">
          <div className="max-w-md w-full text-center bg-black/5 border border-white/10 rounded-2xl px-6 py-6 backdrop-blur">
            <p className="text-xs font-mono tracking-[0.3em] uppercase text-emerald-400 mb-3">
              Error
            </p>
            <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
            <p className="text-sm text-zinc-500 mb-6">
              An unexpected error occurred while loading this page. You can try again or return to the
              dashboard.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-100 transition-colors shadow-sm"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

