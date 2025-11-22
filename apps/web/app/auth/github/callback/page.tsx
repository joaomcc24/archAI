"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GithubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Finishing GitHub connection…");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    const exchangeCode = async () => {
      if (!code) {
        setError("Missing authorization code");
        setStatus("");
        return;
      }

      try {
        setStatus("Creating project…");
        const fallbackUserId = '00000000-0000-0000-0000-000000000001';
        const res = await fetch('/api/auth/github/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, userId: fallbackUserId })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'GitHub OAuth failed');
        }

        if (data.githubToken) {
          sessionStorage.setItem('githubToken', data.githubToken);
        }

        router.replace('/dashboard');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to finish GitHub OAuth');
        setStatus("");
      }
    };

    exchangeCode();
  }, [router, searchParams]);

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



