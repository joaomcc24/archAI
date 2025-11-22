"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";

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

interface ProjectWithSnapshots extends Project {
  latestSnapshot: Snapshot | null;
  snapshotCount: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithSnapshots[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<{ [projectId: string]: boolean }>({});
  const [deleting, setDeleting] = useState<{ [projectId: string]: boolean }>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const testUserId = '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/projects?userId=${testUserId}`); // TODO: Get from Supabase auth
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      const projectsList: Project[] = data.projects;
      
      const projectsWithSnapshots = await Promise.all(
        projectsList.map(async (project): Promise<ProjectWithSnapshots> => {
          try {
            const snapshotsResponse = await fetch(`/api/snapshots?projectId=${project.id}`);
            const snapshotsData = await snapshotsResponse.json();
            const snapshots: Snapshot[] = snapshotsData.snapshots || [];
            const latestSnapshot = snapshots[0] ?? null;

            return {
              ...project,
              latestSnapshot,
              snapshotCount: snapshots.length,
            };
          } catch {
            return {
              ...project,
              latestSnapshot: null,
              snapshotCount: 0,
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
  };

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
    const githubToken = sessionStorage.getItem('githubToken');
    
    if (!githubToken) {
      setError('GitHub token not found. Please reconnect your repository.');
      return;
    }

    try {
      setGenerating(prev => ({ ...prev, [projectId]: true }));
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken }),
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

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to delete project');
      }

      setProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeleting(prev => ({ ...prev, [projectId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading your projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your connected GitHub repositories</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No repositories connected
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your first GitHub repository to get started with architecture documentation
            </p>
            <Button
              appName="web"
              className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => window.location.href = '/connect'}
            >
              Connect Repository
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Connected Repositories ({projects.length})
              </h2>
              <Button
                appName="web"
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => window.location.href = '/connect'}
              >
                Connect Another
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-gray-400"
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
                        <h3 className="font-medium text-gray-900">{project.repo_name}</h3>
                        <p className="text-sm text-gray-500">GitHub Repository</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Connected
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Connected on {formatDate(project.created_at)}
                    </p>
                    {project.snapshotCount > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {project.snapshotCount} snapshot{project.snapshotCount !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>

                  {project.latestSnapshot && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Latest Architecture</p>
                          <p className="text-xs text-blue-600">
                            {formatDate(project.latestSnapshot.created_at)}
                          </p>
                        </div>
                        <Button
                          appName="web"
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-blue-700"
                          onClick={() => {
                            window.location.href = `/snapshot/${project.latestSnapshot!.id}`;
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        appName="web"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleGenerateArchitecture(project.id)}
                        disabled={generating[project.id] || deleting[project.id]}
                      >
                        {generating[project.id] ? 'Generating...' : 'Generate Architecture'}
                      </Button>
                      <Button
                        appName="web"
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={() => {
                          window.open(`https://github.com/${project.repo_name}`, '_blank');
                        }}
                        disabled={deleting[project.id]}
                      >
                        View on GitHub
                      </Button>
                    </div>
                    <Button
                      appName="web"
                      className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={deleting[project.id]}
                    >
                      {deleting[project.id] ? 'Removing...' : 'Delete Connection'}
                    </Button>
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
