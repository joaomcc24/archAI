"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'viewer';
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  created_at: string;
  email?: string; // Will be fetched separately
}

interface ProjectInvitation {
  id: string;
  project_id: string;
  email: string;
  role: 'member' | 'viewer';
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface ProjectMembersProps {
  projectId: string;
  userRole: 'owner' | 'member' | 'viewer';
  onClose?: () => void;
}

const isDev = process.env.NODE_ENV !== 'production';

const logError = (...args: unknown[]) => {
  if (isDev) {
    console.error(...args);
  }
};

const logWarn = (...args: unknown[]) => {
  if (isDev) {
    console.warn(...args);
  }
};

export function ProjectMembers({ projectId, userRole, onClose }: ProjectMembersProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const isOwner = userRole === 'owner';
  const isDark = theme === 'dark';

  const checkCanShare = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // The API returns { subscription: { plan: { id: ... } } }
        setCanShare(data.subscription?.plan?.id === 'team');
      } else {
        logError('Failed to fetch subscription:', response.status, await response.text());
      }
    } catch (err) {
      logError('Failed to check sharing capability:', err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const text = await response.text();

      if (!response.ok) {
        let message = 'Failed to load members';
        if (isJson) {
          try {
            const data = JSON.parse(text) as { error?: string };
            message = data.error || message;
          } catch {
            message = text ? text.slice(0, 200) : message;
          }
        } else {
          message = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(message);
      }

      if (!isJson) {
        logWarn('Expected JSON but got', contentType);
        setMembers([]);
        return;
      }

      try {
        const data = JSON.parse(text) as { members?: ProjectMember[] };
        setMembers(data.members || []);
      } catch (parseErr) {
        logError('Failed to parse members response:', parseErr);
        setMembers([]);
        throw new Error('Invalid response format');
      }
    } catch (err) {
      logError('Failed to fetch members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchInvitations = useCallback(async () => {
    if (!isOwner) return;

    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      const text = await response.text();

      if (!response.ok) {
        let message = 'Failed to load invitations';
        if (isJson) {
          try {
            const data = JSON.parse(text) as { error?: string };
            message = data.error || message;
          } catch {
            // If JSON parse fails even though content-type says JSON, use raw text
            message = text ? text.slice(0, 200) : message;
          }
        } else {
          // HTML error page or other non-JSON response
          message = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(message);
      }

      // Parse JSON only if content-type indicates JSON
      if (!isJson) {
        logWarn('Expected JSON but got', contentType);
        setInvitations([]);
        return;
      }

      try {
        const data = JSON.parse(text) as { invitations?: ProjectInvitation[] };
        setInvitations(data.invitations || []);
      } catch (parseErr) {
        logError('Failed to parse invitations response:', parseErr);
        setInvitations([]);
      }
    } catch (err) {
      logError('Failed to fetch invitations:', err);
      // Don't set error state for fetchInvitations failures - it's often called after mutations
      // and we don't want to show errors for non-critical refetches
      setInvitations([]);
    }
  }, [isOwner, projectId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !canShare) return;

    try {
      setInviting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        let errorMessage = 'Failed to send invitation';
        try {
          const errorData = JSON.parse(text) as { error?: string };
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = text ? text.slice(0, 200) : `HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(text) as { invitation?: { token?: string } };
      const token = data.invitation?.token;
      if (token && typeof window !== 'undefined') {
        setLastInviteLink(`${window.location.origin}/invitations/${token}`);
      }
      setInviteEmail("");
      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      void fetchMembers();
      void fetchInvitations();
      void checkCanShare();
    }
  }, [projectId, fetchMembers, fetchInvitations, checkCanShare]);

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/projects/${projectId}/invitations?invitationId=${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = 'Failed to revoke invitation';
        try {
          const data = JSON.parse(text) as { error?: string };
          msg = data.error || msg;
        } catch {
          if (text) msg = text.slice(0, 200);
        }
        throw new Error(msg);
      }

      setLastInviteLink(null);
      await fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const copyInviteLink = async () => {
    if (!lastInviteLink) return;
    try {
      await navigator.clipboard.writeText(lastInviteLink);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'member' | 'viewer') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'member':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    setError(null);
    void fetchMembers();
    if (isOwner) void fetchInvitations();
  };

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      )}

      {lastInviteLink && (
        <div
          className={`rounded-lg p-4 space-y-2 border ${
            isDark
              ? 'bg-emerald-950/40 border-emerald-800/50'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              isDark ? 'text-emerald-200' : 'text-emerald-800'
            }`}
          >
            Invitation email sent successfully. You can still copy the link below if needed:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className={`flex-1 min-w-0 text-xs px-2 py-1.5 rounded border truncate block ${
                isDark
                  ? 'text-emerald-100 bg-emerald-900/30 border-emerald-800/50'
                  : 'text-emerald-900 bg-white/80 border-emerald-200'
              }`}
            >
              {lastInviteLink}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={copyInviteLink}
              aria-label="Copy invitation link to clipboard"
            >
              {inviteLinkCopied ? 'Copied!' : 'Copy link'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setLastInviteLink(null);
              }}
              className={`text-xs hover:underline ${
                isDark ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {member.user_id === user?.id ? 'You' : member.user_id.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {member.user_id === user?.id ? 'You' : member.user_id.substring(0, 8)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {member.joined_at ? `Joined ${new Date(member.joined_at).toLocaleDateString()}` : 'Pending'}
                  </p>
                </div>
              </div>
              {isOwner && member.role !== 'owner' && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.user_id, e.target.value as 'member' | 'viewer')}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    aria-label="Change member role"
                  >
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user_id)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Form */}
      {isOwner && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Members</h3>
          {!canShare && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
              Team plan required to share projects. <a href="/billing" className="underline">Upgrade now</a>
            </div>
          )}
          {canShare && (
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 disabled:bg-gray-50 disabled:text-gray-500"
                  required
                  disabled={inviting}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'viewer')}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 disabled:bg-gray-50 disabled:text-gray-500"
                  disabled={inviting}
                  aria-label="Select invitation role"
                >
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? 'Sending...' : 'Invite'}
                </Button>
              </div>
            </form>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Pending Invitations</h4>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{invitation.email}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(invitation.role)}`}>
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {onClose && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
