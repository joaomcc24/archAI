'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const text = await response.text();
      if (!response.ok) {
        let message = 'Failed to send reset email';
        try {
          const payload = JSON.parse(text) as { error?: string; message?: string };
          message = payload.message || payload.error || message;
        } catch {
          if (text) {
            message = text;
          }
        }
        throw new Error(message);
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Image src="/favicon.ico" alt="RepoLens" width={32} height={32} />
            <span className="font-semibold text-slate-900 text-lg">RepoLens</span>
          </Link>
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl">
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h1>
            <p className="text-slate-600 text-sm">
              We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
            </p>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Didn’t get the email? Check spam or{' '}
            <button type="button" onClick={() => setSent(false)} className="text-slate-900 font-medium hover:underline">
              try again
            </button>
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-slate-600 hover:text-slate-900">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Image src="/favicon.ico" alt="RepoLens" width={32} height={32} />
          <span className="font-semibold text-slate-900 text-lg">RepoLens</span>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset password</h1>
        <p className="text-slate-600 text-sm mb-6">
          Enter your email and we’ll send you a link to set a new password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>
        <Link href="/login" className="mt-6 inline-block text-sm text-slate-600 hover:text-slate-900">
          Back to login
        </Link>
      </div>
    </div>
  );
}
