'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing sign in...');
  const [error, setError] = useState<string | null>(null);
  const nextRaw = searchParams.get('next');
  const nextPath = nextRaw && nextRaw.startsWith('/') ? nextRaw : '/dashboard';

  useEffect(() => {
    // Check for error in URL query params
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');
    
    if (errorDescription) {
      console.warn('OAuth error:', errorDescription, errorCode);
      const decoded = decodeURIComponent(errorDescription);
      const hint =
        errorCode === 'unexpected_failure'
          ? 'GitHub did not return a usable profile. Please try again or re-authorize GitHub.'
          : '';
      setError(hint ? `${decoded}\n${hint}` : decoded);
      return;
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setStatus('Redirecting...');
        router.replace(nextPath);
      }
    });

    // Check if already signed in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('Redirecting...');
        router.replace(nextPath);
      }
    };
    
    setTimeout(checkSession, 500);

    return () => subscription.unsubscribe();
  }, [router, searchParams, nextPath]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign in failed</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a 
            href="/login" 
            className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
