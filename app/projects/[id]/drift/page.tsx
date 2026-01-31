'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DriftScore } from '@/components/DriftScore';
import { FileChangesList, FileChanges } from '@/components/FileChangesList';
import { ArchitectureDiff } from '@/components/ArchitectureDiff';
import { useAuth } from '@/contexts/AuthContext';
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

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function DriftPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Drift Detection</h1>
              {project && (
                <p className="mt-2 text-gray-600">
                  {project.repo_name}
                  {project.branch && ` (${project.branch})`}
                </p>
              )}
            </div>
            <Button
              onClick={handleDetectDrift}
              disabled={detecting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {detecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Detecting...
                </>
              ) : (
                <>
                  <RefreshIcon className="w-5 h-5" />
                  Detect Drift
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {latestDrift ? (
          <div className="space-y-6">
            {/* Drift Score Card */}
            <div className="bg-white shadow-xl rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Latest Drift Detection</h2>
                <DriftScore score={latestDrift.drift_score} size="lg" />
              </div>
              <p className="text-sm text-gray-500">
                Detected on {new Date(latestDrift.created_at).toLocaleString()}
              </p>
            </div>

            {/* File Changes */}
            <div className="bg-white shadow-xl rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">File Changes</h2>
              <FileChangesList changes={latestDrift.file_changes} />
            </div>

            {/* Architecture Diff */}
            <div className="bg-white shadow-xl rounded-xl p-6">
              <ArchitectureDiff diff={latestDrift.architecture_diff} />
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-xl rounded-xl p-12 text-center">
            <RefreshIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Drift Detected Yet</h2>
            <p className="text-gray-600 mb-6">
              Click "Detect Drift" to compare the current repository state with the latest snapshot.
            </p>
            <Button
              onClick={handleDetectDrift}
              disabled={detecting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {detecting ? 'Detecting...' : 'Detect Drift'}
            </Button>
          </div>
        )}

        {/* Drift History */}
        {driftResults.length > 1 && (
          <div className="mt-8 bg-white shadow-xl rounded-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Drift History</h2>
            <div className="space-y-4">
              {driftResults.slice(1).map((drift) => (
                <div
                  key={drift.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {new Date(drift.created_at).toLocaleString()}
                      </p>
                    </div>
                    <DriftScore score={drift.drift_score} size="sm" />
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">
                      {drift.file_changes.added.length + drift.file_changes.removed.length + drift.file_changes.modified.length}
                    </span>{' '}
                    file changes
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
