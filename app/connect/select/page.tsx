'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { supabase } from '../../../lib/supabase';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
}

interface Branch {
  name: string;
  isDefault: boolean;
}

function SelectRepositoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  // Branch selection state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const reposData = searchParams.get('repos');
        if (reposData) {
          const parsedRepos = JSON.parse(decodeURIComponent(reposData));
          setRepositories(parsedRepos);
        } else {
          setError('No repositories found. Please try connecting again.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repositories');
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [searchParams]);

  const handleRepoSelect = async (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    setError(null);
    setLoadingBranches(true);
    setBranches([]);
    setSelectedBranch(null);
    setShowBranchSelector(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/projects/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoName: repoFullName,
          githubToken: searchParams.get('token'),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch branches');
      }

      setBranches(data.branches);
      // Auto-select the default branch
      const defaultBranch = data.branches.find((b: Branch) => b.isDefault);
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch branches');
      setShowBranchSelector(false);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedRepo) {
      setError('Please select a repository');
      return;
    }

    if (!selectedBranch) {
      setError('Please select a branch');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/auth/github/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repoName: selectedRepo,
          githubToken: searchParams.get('token'),
          branch: selectedBranch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect repository');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Repository</h1>
          <p className="text-gray-600">Choose which repository and branch you&apos;d like to analyze</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {repositories.map((repo) => (
              <div key={repo.id}>
                <label
                  className={`block p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedRepo === repo.full_name ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleRepoSelect(repo.full_name)}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="repository"
                      value={repo.full_name}
                      checked={selectedRepo === repo.full_name}
                      onChange={() => handleRepoSelect(repo.full_name)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{repo.full_name}</p>
                          {repo.description && (
                            <p className="text-sm text-gray-500 mt-1">{repo.description}</p>
                          )}
                        </div>
                        {repo.private && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
                
                {/* Branch selector for selected repo */}
                {selectedRepo === repo.full_name && showBranchSelector && (
                  <div className="px-4 pb-4 pt-2 bg-blue-50 border-t border-blue-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Branch
                    </label>
                    {loadingBranches ? (
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading branches...
                      </div>
                    ) : (
                      <select
                        value={selectedBranch || ''}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                      >
                        <option value="">Select a branch...</option>
                        {branches.map((branch) => (
                          <option key={branch.name} value={branch.name}>
                            {branch.name} {branch.isDefault ? '(default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleConnect}
            disabled={!selectedRepo || !selectedBranch || connecting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connecting ? 'Connecting...' : 'Connect Repository'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectRepositoryPage() {
  return (
    <ProtectedRoute>
      <SelectRepositoryContent />
    </ProtectedRoute>
  );
}
