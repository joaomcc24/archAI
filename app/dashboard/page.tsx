"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { supabase } from "../../lib/supabase";
import { trackEvent, AnalyticsEvents } from "../../lib/analytics";
import { DriftScore } from "@/components/DriftScore";
import { ProjectMembers } from "@/components/ProjectMembers";
import { AppTopBar } from "@/components/AppTopBar";

interface Project {
  id: string;
  user_id: string;
  repo_name: string;
  installation_id: string;
  created_at: string;
}

interface Snapshot {
  id: string;
  project_id: string;
  markdown: string;
  created_at: string;
}

interface Task {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  markdown: string;
  created_at: string;
  project_name?: string;
}

interface DriftResult {
  id: string;
  drift_score: number;
  created_at: string;
}

interface ProjectMember {
  user_id: string;
  role: 'owner' | 'member' | 'viewer';
}

interface ProjectWithSnapshots extends Project {
  latestSnapshot: Snapshot | null;
  snapshotCount: number;
  latestDrift?: DriftResult | null;
  userRole?: 'owner' | 'member' | 'viewer';
  memberCount?: number;
}

function DashboardContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithSnapshots[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<{ [projectId: string]: boolean }>({});
  const [deleting, setDeleting] = useState<{ [projectId: string]: boolean }>({});
  const [sharingProject, setSharingProject] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/tasks', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to fetch tasks:', response.status, text);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 100));
        return;
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = 'Failed to fetch projects';
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${text.substring(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      const projectsList: Project[] = data.projects;
      
      const projectsWithSnapshots = await Promise.all(
        projectsList.map(async (project): Promise<ProjectWithSnapshots> => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const snapshotsResponse = await fetch(`/api/snapshots?projectId=${project.id}`, {
              headers: session ? {
                'Authorization': `Bearer ${session.access_token}`,
              } : {},
            });
            
            if (!snapshotsResponse.ok) {
              throw new Error(`Failed to fetch snapshots: ${snapshotsResponse.status}`);
            }

            const contentType = snapshotsResponse.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error('Expected JSON from snapshots API');
            }

            const snapshotsData = await snapshotsResponse.json();
            const snapshots: Snapshot[] = snapshotsData.snapshots || [];
            const latestSnapshot = snapshots[0] ?? null;

            // Fetch latest drift result
            let latestDrift: DriftResult | null = null;
            try {
              const driftResponse = await fetch(`/api/projects/${project.id}/drift`, {
                headers: session ? {
                  'Authorization': `Bearer ${session.access_token}`,
                } : {},
              });
              if (driftResponse.ok) {
                const driftData = await driftResponse.json();
                if (driftData.drift_results && driftData.drift_results.length > 0) {
                  latestDrift = driftData.drift_results[0];
                }
              }
            } catch {
              // Ignore drift fetch errors
            }

            // Fetch user role and member count
            let userRole: 'owner' | 'member' | 'viewer' | undefined;
            let memberCount: number | undefined;
            try {
              const membersResponse = await fetch(`/api/projects/${project.id}/members`, {
                headers: session ? {
                  'Authorization': `Bearer ${session.access_token}`,
                } : {},
              });
              if (membersResponse.ok) {
                const membersData = await membersResponse.json();
                const members: ProjectMember[] = membersData.members || [];
                memberCount = members.length;
                const currentUserMember = members.find((member) => member.user_id === user?.id);
                userRole = currentUserMember?.role;
              }
            } catch {
              // Ignore member fetch errors
            }

            return {
              ...project,
              latestSnapshot,
              snapshotCount: snapshots.length,
              latestDrift,
              userRole,
              memberCount,
            };
          } catch {
            return {
              ...project,
              latestSnapshot: null,
              snapshotCount: 0,
              latestDrift: null,
            };
          }
        })
      );

      setProjects(projectsWithSnapshots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTasks();
    }
  }, [user, fetchProjects, fetchTasks]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleGenerateArchitecture = async (projectId: string) => {
    try {
      setGenerating(prev => ({ ...prev, [projectId]: true }));
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate architecture');
      }

      await fetchProjects();
      
      if (data.snapshot?.id) {
        window.location.href = `/snapshot/${data.snapshot.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate architecture');
    } finally {
      setGenerating(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmDeletion = window.confirm(
      'Are you sure you want to disconnect this repository? This will remove all generated snapshots.'
    );

    if (!confirmDeletion) {
      return;
    }

    try {
      setDeleting(prev => ({ ...prev, [projectId]: true }));
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to delete project');
      }

      setProjects(prev => prev.filter(project => project.id !== projectId));

      // Track project deletion
      trackEvent(AnalyticsEvents.PROJECT_DELETED, {
        project_id: projectId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeleting(prev => ({ ...prev, [projectId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="dashboard min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-4 text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="dashboard min-h-screen bg-gray-50">
        <AppTopBar />
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your connected GitHub repositories</p>
            </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No repositories connected
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Connect your first GitHub repository to get started with architecture documentation
            </p>
            <Button
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
              onClick={() => window.location.href = '/connect'}
            >
              Connect Repository
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Connected Repositories
                </h2>
                <p className="text-gray-600 mt-1">{projects.length} {projects.length === 1 ? 'repository' : 'repositories'}</p>
              </div>
              <Button
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                onClick={() => window.location.href = '/connect'}
              >
                Connect Another
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-3 rounded-xl flex-shrink-0 github-icon-wrap">
                        <svg
                          className="w-6 h-6 github-icon"
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
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg truncate">{project.repo_name}</h3>
                        <p className="text-sm text-gray-500">GitHub Repository</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {project.userRole && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
                          project.userRole === 'owner'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : project.userRole === 'member'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {project.userRole.charAt(0).toUpperCase() + project.userRole.slice(1)}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        Connected
                      </span>
                    </div>
                  </div>

                  <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Connected {formatDate(project.created_at)}</span>
                    </div>
                    {project.snapshotCount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                        <span>{project.snapshotCount} snapshot{project.snapshotCount !== 1 ? 's' : ''} available</span>
                      </div>
                    )}
                  </div>

                  {project.latestSnapshot && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Latest Architecture</p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            {formatDate(project.latestSnapshot.created_at)}
                          </p>
                        </div>
                        <Button
                          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 shadow-sm"
                          onClick={() => {
                            window.location.href = `/snapshot/${project.latestSnapshot!.id}`;
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  )}

                  {project.latestDrift && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-amber-900">Latest Drift</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            {formatDate(project.latestDrift.created_at)}
                          </p>
                        </div>
                        <DriftScore score={project.latestDrift.drift_score} size="sm" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-blue-600 border border-indigo-200 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        onClick={() => handleGenerateArchitecture(project.id)}
                        disabled={generating[project.id] || deleting[project.id]}
                      >
                        {generating[project.id] ? 'Generating...' : 'Generate Architecture'}
                      </Button>
                      <Button
                        className="px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm border github-link inline-flex items-center gap-2"
                        onClick={() => {
                          window.open(`https://github.com/${project.repo_name}`, '_blank');
                        }}
                        disabled={deleting[project.id]}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>GitHub</span>
                      </Button>
                    </div>
                    {project.snapshotCount > 0 && (
                      <Button
                        className="w-full bg-purple-600 border border-indigo-200 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        onClick={() => {
                          window.location.href = `/projects/${project.id}/drift`;
                        }}
                        disabled={deleting[project.id]}
                      >
                        Detect Drift
                      </Button>
                    )}
                    {project.userRole === 'owner' && (
                      <Button
                        className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        onClick={() => setSharingProject(project.id)}
                        disabled={deleting[project.id]}
                      >
                        Share Project
                      </Button>
                    )}
                    {project.userRole === 'owner' && (
                      <Button
                        className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        onClick={() => handleDeleteProject(project.id)}
                        disabled={deleting[project.id]}
                      >
                        {deleting[project.id] ? 'Removing...' : 'Delete Connection'}
                      </Button>
                    )}
                    {project.userRole !== 'owner' && (
                      <Button
                        className="w-full bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        onClick={() => setSharingProject(project.id)}
                        disabled={deleting[project.id]}
                      >
                        View Members
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Share Project Modal */}
            {sharingProject && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Project Members</h2>
                    <button
                      onClick={() => setSharingProject(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <ProjectMembers
                    projectId={sharingProject}
                    userRole={projects.find(p => p.id === sharingProject)?.userRole || 'viewer'}
                    onClose={() => setSharingProject(null)}
                  />
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {tasks.length > 0 && (
              <div className="mt-12">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Generated Tasks
                  </h2>
                  <p className="text-gray-600 mt-1">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} generated</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Task
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Project
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {tasks.map((task) => (
                          <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                  <div className="text-sm text-gray-500 truncate max-w-md">{task.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-600 font-medium">{task.project_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(task.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => window.location.href = `/task/${task.id}`}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
