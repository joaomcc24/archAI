'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const navLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h4a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a5 5 0 00-10 0v2m-2 4h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
      </svg>
    ),
  },
];

export function AppTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Array<{
    id: string;
    token: string;
    project_id: string;
    project_name: string;
    role: 'member' | 'viewer';
    expires_at: string;
  }>>([]);

  const activeIndex = useMemo(() => {
    return Math.max(
      0,
      navLinks.findIndex((link) => pathname === link.href)
    );
  }, [pathname]);

  useEffect(() => {
    const el = linkRefs.current[activeIndex];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setIndicatorStyle({
      left: rect.left - parentRect.left,
      width: rect.width,
    });
  }, [activeIndex]);

  useEffect(() => {
    if (!user) {
      setPendingInvitations([]);
      return;
    }

    const fetchPendingInvitations = async () => {
      try {
        setLoadingInvitations(true);
        setInvitationError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/invitations', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Failed to load invitations: ${response.status}`);
        }
        const payload = JSON.parse(text) as { invitations?: Array<{
          id: string;
          token: string;
          project_id: string;
          project_name: string;
          role: 'member' | 'viewer';
          expires_at: string;
        }> };

        setPendingInvitations(payload.invitations || []);
      } catch (error) {
        setInvitationError(error instanceof Error ? error.message : 'Failed to load invitations');
      } finally {
        setLoadingInvitations(false);
      }
    };

    void fetchPendingInvitations();
  }, [user]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const refreshInvitations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch('/api/invitations', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) return;
      const payload = await response.json() as { invitations?: Array<{
        id: string;
        token: string;
        project_id: string;
        project_name: string;
        role: 'member' | 'viewer';
        expires_at: string;
      }> };
      setPendingInvitations(payload.invitations || []);
    } catch {
      // non-blocking UI refresh
    }
  };

  const handleAcceptInvitation = async (token: string, projectId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      await refreshInvitations();
      setNotificationsOpen(false);
      router.push(`/projects/${projectId}/drift`);
    } catch (error) {
      setInvitationError(error instanceof Error ? error.message : 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (token: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/invitations/${token}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to decline invitation');
      }
      await refreshInvitations();
    } catch (error) {
      setInvitationError(error instanceof Error ? error.message : 'Failed to decline invitation');
    }
  };

  return (
    <div className="app-topbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sm">
          <Image
            src="/favicon.ico"
            alt="RepoLens"
            width={28}
            height={28}
            className="rounded-md"
          />
          RepoLens
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 relative app-topbar-track">
            <span
              className="app-topbar-indicator"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                ref={(node) => {
                  linkRefs.current[index] = node;
                }}
                className={`app-topbar-link inline-flex items-center gap-2 ${
                  index === activeIndex ? 'app-topbar-link-active' : ''
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className="flex items-center gap-1 rounded-full px-1 py-1"
            style={{
              backgroundColor: 'var(--dash-toggle-bg)',
              border: '1px solid var(--dash-toggle-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setTheme('light')}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              style={{
                backgroundColor: theme === 'light' ? 'var(--dash-toggle-active-bg)' : 'transparent',
                color: theme === 'light' ? 'var(--dash-toggle-active-text)' : 'var(--dash-toggle-text)',
              }}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? 'var(--dash-toggle-active-bg)' : 'transparent',
                color: theme === 'dark' ? 'var(--dash-toggle-active-text)' : 'var(--dash-toggle-text)',
              }}
            >
              Dark
            </button>
          </div>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
              </svg>
              {pendingInvitations.length > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-bold bg-red-500 text-white">
                  {pendingInvitations.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">Project invitations and updates</p>
                </div>
                {invitationError && (
                  <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
                    {invitationError}
                  </div>
                )}
                <div className="max-h-80 overflow-y-auto">
                  {loadingInvitations ? (
                    <div className="px-4 py-6 text-sm text-gray-500">Loading invitations...</div>
                  ) : pendingInvitations.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">No pending invitations.</div>
                  ) : (
                    pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                        <p className="text-sm text-gray-900">
                          You were invited to <span className="font-semibold">{invitation.project_name}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Role: {invitation.role === 'member' ? 'Member' : 'Viewer'} · Expires{' '}
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptInvitation(invitation.token, invitation.project_id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclineInvitation(invitation.token)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 px-2.5 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                {user?.email ? user.email[0]?.toUpperCase() : 'U'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
                <div className="py-2">
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Account settings
                  </Link>
                  <Link
                    href="/"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    Go to home
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
