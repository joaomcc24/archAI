'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase recovers session from URL hash when user lands from the reset email link
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true);
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !password) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Image src="/favicon.ico" alt="RepoLens" width={32} height={32} />
            <span className="font-semibold text-slate-900 text-lg">RepoLens</span>
          </Link>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <Link href="/forgot-password" className="text-slate-900 font-medium hover:underline">
            Request a new reset link
          </Link>
          <span className="text-slate-500"> or </span>
          <Link href="/login" className="text-slate-900 font-medium hover:underline">
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Set new password</h1>
        <p className="text-slate-600 text-sm mb-6">
          Enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
                Updating...
              </span>
            ) : (
              'Update password'
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
