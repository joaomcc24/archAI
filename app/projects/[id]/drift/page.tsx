'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DriftScore } from '@/components/DriftScore';
import { FileChangesList, FileChanges } from '@/components/FileChangesList';
import { ArchitectureDiff } from '@/components/ArchitectureDiff';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

interface DriftResult {
  id: string;
  snapshot_id: string;
  drift_score: number;
  file_changes: FileChanges;
  structure_diff: string;
  architecture_diff: string;
  created_at: string;
  completed_at: string | null;
}

interface Project {
  id: string;
  repo_name: string;
  branch?: string;
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function DriftPageContent({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [driftResults, setDriftResults] = useState<DriftResult[]>([]);
  const [latestDrift, setLatestDrift] = useState<DriftResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setProjectId(resolvedParams.id);
    });
  }, [params]);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    }
  }, [projectId]);

  const fetchDriftResults = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/projects/${projectId}/drift`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });
      if (!response.ok) {
        throw new Error('Failed to fetch drift results');
      }
      const data = await response.json();
      setDriftResults(data.drift_results || []);
      if (data.drift_results && data.drift_results.length > 0) {
        setLatestDrift(data.drift_results[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drift results');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchDriftResults();
    }
  }, [projectId, fetchProject, fetchDriftResults]);

  const handleDetectDrift = async () => {
    if (!projectId) return;

    setDetecting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found. Please log in again.');
      }

      const response = await fetch(`/api/projects/${projectId}/drift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect drift');
      }

      const data = await response.json();
      
      // Track analytics
      trackEvent(AnalyticsEvents.DRIFT_DETECTED, {
        project_id: projectId,
        drift_score: data.drift.drift_score,
      });

      // Refresh drift results
      await fetchDriftResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect drift');
    } finally {
      setDetecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading drift detection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 mb-4 transition-colors font-medium text-sm"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Drift Detection</h1>
          <p className="text-gray-600 mt-2">
            See how far your codebase has moved away from the last snapshot and when it&apos;s time to refresh your
            architecture docs.
          </p>
          {project && (
            <p className="text-sm text-gray-500 mt-2">
              Project:{' '}
              <span className="font-medium text-gray-800">
                {project.repo_name}
                {project.branch && ` (${project.branch})`}
              </span>
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Latest Drift */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Latest Drift</h2>
              {latestDrift ? (
                <>
                  <p className="text-sm text-gray-600">
                    Detected on {new Date(latestDrift.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Comparing the latest snapshot with the current repository state.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  No drift checks have been run yet for this project.
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {latestDrift && <DriftScore score={latestDrift.drift_score} size="lg" />}
              <Button
                onClick={handleDetectDrift}
                disabled={detecting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
              >
                {detecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <RefreshIcon className="w-4 h-4" />
                    Run drift check
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Score explanation (adapted from billing usage) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How to read the drift score</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">0–19</span>
                <span className="text-xs text-green-700 font-medium">Low drift</span>
              </div>
              <p className="text-sm text-gray-600">
                Repo is very close to the snapshot. Docs are mostly in sync.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">20–49</span>
                <span className="text-xs text-amber-700 font-medium">Moderate</span>
              </div>
              <p className="text-sm text-gray-600">
                Noticeable changes. It&apos;s a good time to review architecture docs.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">50–100</span>
                <span className="text-xs text-red-700 font-medium">High drift</span>
              </div>
              <p className="text-sm text-gray-600">
                Significant changes. Plan an architecture update soon.
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            You might occasionally see a non‑zero score even when the cards above show no visible file or architecture
            changes. This usually comes from small text‑level updates or low‑impact differences in the architecture
            markdown that we still count in the score to avoid missing subtle drift.
          </p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {latestDrift && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Run summary</h2>
                <p className="text-sm text-gray-600 mb-2">
                  We compare file structure and architecture markdown between the snapshot and your current branch.
                </p>
                <p className="text-sm text-gray-600">
                  Total file changes:{' '}
                  <span className="font-medium text-gray-900">
                    {latestDrift.file_changes.added.length +
                      latestDrift.file_changes.removed.length +
                      latestDrift.file_changes.modified.length}
                  </span>
                </p>
              </div>
            )}

            {driftResults.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Previous runs</h2>
                <div className="space-y-3">
                  {driftResults.slice(1).map((drift) => (
                    <div
                      key={drift.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-sm hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {new Date(drift.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {drift.file_changes.added.length +
                            drift.file_changes.removed.length +
                            drift.file_changes.modified.length}{' '}
                          file changes
                        </p>
                      </div>
                      <DriftScore score={drift.drift_score} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {latestDrift ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">File changes</h2>
                  <FileChangesList changes={latestDrift.file_changes} />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Architecture diff</h2>
                  <ArchitectureDiff diff={latestDrift.architecture_diff} />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                    <RefreshIcon className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <h2 className="text-base font-semibold text-gray-900 mb-2">No drift checks yet</h2>
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Run your first drift check to see how much your codebase has changed since the last snapshot. We&apos;ll
                  show file-level and architecture-level differences here.
                </p>
                <Button
                  onClick={handleDetectDrift}
                  disabled={detecting}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
                >
                  {detecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <RefreshIcon className="w-4 h-4" />
                      Run drift check
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriftPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <DriftPageContent params={params} />
    </ProtectedRoute>
  );
}
