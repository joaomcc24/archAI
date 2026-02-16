'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppTopBar } from '../../components/AppTopBar';
import { getAnalyticsOptOut, setAnalyticsOptOut } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';

export default function AccountPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [optOut, setOptOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportWarning, setExportWarning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setOptOut(getAnalyticsOptOut());
  }, []);

  const downloadJson = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    setExportError(null);
    setExportWarning(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in again to export data.');
      }

      const response = await fetch('/api/account/export', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const text = await response.text();
      if (!response.ok) {
        let message = 'Failed to export data';
        try {
          const payload = JSON.parse(text) as { error?: string; userMessage?: string };
          message = payload.userMessage || payload.error || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      const exportData = JSON.parse(text);
      downloadJson(`repolens-export-${user.id}.json`, exportData);

      if (Array.isArray(exportData?.errors) && exportData.errors.length > 0) {
        setExportWarning(`Export completed with warnings: ${exportData.errors.join(' | ')}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export data';
      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleteError(null);

    const confirmed = window.confirm(
      'Are you sure? This will permanently delete your RepoLens account and associated data.'
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in again to delete your account.');
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const text = await response.text();
      if (!response.ok) {
        let message = 'Failed to delete account';
        try {
          const payload = JSON.parse(text) as { error?: string; userMessage?: string };
          message = payload.userMessage || payload.error || message;
        } catch {
          if (text) {
            message = text;
          }
        }
        throw new Error(message);
      }

      // Sign out locally and redirect to landing
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      setDeleteError(message);
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard min-h-screen bg-gray-50">
      <AppTopBar />
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">Manage identity, preferences, and privacy.</p>

        <div className="mt-8 grid grid-cols-1 gap-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Account</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900 font-medium">{user?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">User ID</p>
                <p className="text-gray-900 font-medium break-all">{user?.id || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Provider</p>
                <p className="text-gray-900 font-medium">
                  {user?.app_metadata?.provider === 'github' ? 'GitHub' : user?.app_metadata?.provider || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last sign in</p>
                <p className="text-gray-900 font-medium">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Connected GitHub</h2>
            <p className="text-gray-600 mt-2">
              Your account is connected via GitHub OAuth. Manage access or re-authorize if needed.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/connect"
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 shadow-sm"
              >
                Re-authorize GitHub
              </a>
              <a
                href="https://github.com/settings/connections/applications"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 border border-gray-200"
              >
                Manage GitHub access
              </a>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Theme</p>
                <p className="text-gray-900 font-medium">Choose light or dark mode.</p>
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
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Privacy</h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Analytics</p>
                <p className="text-gray-900 font-medium">Help improve RepoLens by sharing anonymous usage.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !optOut;
                  setOptOut(next);
                  setAnalyticsOptOut(next);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 border border-gray-200"
              >
                {optOut ? 'Enable analytics' : 'Disable analytics'}
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
            <p className="text-gray-600 mt-2">Manage your subscription and invoices.</p>
            <div className="mt-4">
              <a
                href="/billing"
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 shadow-sm"
              >
                Go to Billing
              </a>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Danger zone</h2>
            <p className="text-gray-600 mt-2">
              Export your data or permanently delete your account.
            </p>
            {exportError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
                {exportError}
              </div>
            )}
            {exportWarning && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-sm">
                {exportWarning}
              </div>
            )}
            {deleteError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
                {deleteError}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 shadow-sm disabled:opacity-50"
                disabled={exporting}
              >
                {exporting ? 'Preparing export...' : 'Download data export'}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting account...' : 'Delete account'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
