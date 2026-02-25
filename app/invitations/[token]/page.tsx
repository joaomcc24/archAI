"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Invitation {
  id: string;
  project_id: string;
  project_name: string;
  email: string;
  role: 'member' | 'viewer';
  expires_at: string;
}

function InvitationPageContent({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => {
      setToken(p.token);
      fetchInvitation(p.token);
    });
  }, [params]);

  const fetchInvitation = async (invitationToken: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invitations/${invitationToken}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Invitation not found or has expired');
        } else {
          setError('Failed to load invitation');
        }
        return;
      }

      const data = await response.json();
      setInvitation(data.invitation);
    } catch (err) {
      console.error('Failed to fetch invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !token) {
      router.push(`/login?next=${encodeURIComponent(`/invitations/${token || ''}`)}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
        return;
      }

      // Check if user email matches invitation email
      if (user.email?.toLowerCase().trim() !== invitation?.email.toLowerCase().trim()) {
        setError(`This invitation was sent to ${invitation?.email}. Please sign in with that email address.`);
        return;
      }

      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }

      // Redirect to project
      if (invitation) {
        router.push(`/projects/${invitation.project_id}/drift`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const emailMatches = user?.email?.toLowerCase().trim() === invitation.email.toLowerCase().trim();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {isExpired ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Invitation Expired</h1>
              <p className="text-gray-600 mb-6 text-center">
                This invitation has expired. Please ask the project owner to send a new invitation.
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Project Invitation</h1>
              <p className="text-gray-600 mb-6 text-center">
                You've been invited to collaborate on
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                    <svg
                      className="w-5 h-5 text-gray-700"
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
                  <div>
                    <h3 className="font-semibold text-gray-900">{invitation.project_name}</h3>
                    <p className="text-sm text-gray-500">GitHub Repository</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Role:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      invitation.role === 'member'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {invitation.role === 'member' ? 'Member' : 'Viewer'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">Invited as:</span>
                    <span className="text-sm font-medium text-gray-900">{invitation.email}</span>
                  </div>
                </div>
              </div>

              {!user && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
                  Sign in with GitHub (or email) to accept this invitation.
                </div>
              )}

              {user && !emailMatches && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
                  This invitation was sent to <strong>{invitation.email}</strong>. Please sign in with that email address to accept.
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!token) {
                      router.push('/dashboard');
                      return;
                    }
                    if (!user) {
                      router.push(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`);
                      return;
                    }
                    void (async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;
                      await fetch(`/api/invitations/${token}`, {
                        method: 'DELETE',
                        headers: {
                          Authorization: `Bearer ${session.access_token}`,
                        },
                      });
                      router.push('/dashboard');
                    })();
                  }}
                  className="flex-1"
                  disabled={accepting}
                >
                  {user ? 'Decline' : 'Sign in'}
                </Button>
                <Button
                  onClick={handleAccept}
                  className="flex-1"
                  disabled={accepting || (Boolean(user) && !emailMatches)}
                >
                  {accepting ? 'Accepting...' : user ? 'Accept Invitation' : 'Sign in to Accept'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
  );
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  return <InvitationPageContent params={params} />;
}
