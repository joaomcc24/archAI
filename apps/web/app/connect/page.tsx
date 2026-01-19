"use client";

import { useState } from "react";
import { ProtectedRoute } from "../../components/ProtectedRoute";

function ConnectPageContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get GitHub auth URL');
      }

      window.location.href = data.authUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start GitHub OAuth');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb', 
      padding: '48px 16px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '448px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '30px', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '8px' 
          }}>
            Connect GitHub Repository
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>
            Connect your GitHub repository to generate architecture documentation
          </p>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          borderRadius: '8px', 
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#f3f4f6',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg
                style={{ width: '32px', height: '32px', color: '#9ca3af' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              Connect Your Repository
            </h2>
            <p style={{ color: '#6b7280' }}>
              Authorize access to your GitHub repositories to get started
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: '16px',
              padding: '8px 12px',
              backgroundColor: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              textAlign: 'left'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            style={{
              width: '100%',
              backgroundColor: '#111827',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? 'Redirecting to GitHub…' : 'Connect GitHub Repository'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <ProtectedRoute>
      <ConnectPageContent />
    </ProtectedRoute>
  );
}