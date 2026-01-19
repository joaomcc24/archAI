"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import { ProtectedRoute } from "../../../../components/ProtectedRoute";
import { supabase } from "../../../../lib/supabase";

function GithubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Finishing GitHub connection…");
  
  // Prevent double-execution in React Strict Mode
  const hasExchanged = useRef(false);

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;
    
    // Prevent double-execution
    if (hasExchanged.current) return;
    
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    const exchangeCode = async () => {
      if (!code) {
        setError("Missing authorization code");
        setStatus("");
        return;
      }

      if (!user) {
        setError("Please sign in first");
        setStatus("");
        return;
      }

      // Mark as exchanged to prevent duplicate calls
      hasExchanged.current = true;

      try {
        setStatus("Exchanging authorization code…");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No session found');
        }

        const res = await fetch('/api/auth/github/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, state })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'GitHub OAuth failed');
        }

        // Redirect to repository selection page
        const reposParam = encodeURIComponent(JSON.stringify(data.repositories));
        router.replace(`/connect/select?repos=${reposParam}&token=${data.githubToken}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to finish GitHub OAuth');
        setStatus("");
        // Reset so user can retry
        hasExchanged.current = false;
      }
    };

    exchangeCode();
  }, [router, searchParams, user, loading]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0B0B0B',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ width: 420 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Connecting GitHub…</h1>
        {status && <p style={{ color: '#A3A3A3', marginBottom: 16 }}>{status}</p>}
        {error && (
          <div style={{ background: '#2F1515', border: '1px solid #7F1D1D', padding: 12, borderRadius: 8 }}>
            <p style={{ color: '#FCA5A5' }}>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GithubCallbackPage() {
  return (
    <ProtectedRoute>
      <GithubCallbackContent />
    </ProtectedRoute>
  );
}



