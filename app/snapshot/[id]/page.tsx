"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/Button";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { supabase } from "../../../lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeHighlighter = SyntaxHighlighter as React.ComponentType<any>;

interface Snapshot {
  id: string;
  project_id: string;
  markdown: string;
  created_at: string;
}

interface Project {
  id: string;
  repo_name: string;
  branch?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

// Copy icon component
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// Check icon for copy success
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Download icon
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// Refresh icon
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// Task/Document icon
function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// Close icon
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SnapshotPageContent({ params }: { params: Promise<{ id: string }> }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);
  
  // Task generation state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [generatingTask, setGeneratingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [snapshotTasks, setSnapshotTasks] = useState<Task[]>([]);

  useEffect(() => {
    params.then((resolvedParams) => {
      setSnapshotId(resolvedParams.id);
    });
  }, [params]);

  const fetchSnapshot = useCallback(async () => {
    if (!snapshotId) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/snapshots/${snapshotId}`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch snapshot');
      }

      setSnapshot(data.snapshot);

      // Fetch project info for regeneration
      if (data.snapshot?.project_id) {
        const projectResponse = await fetch(`/api/projects/${data.snapshot.project_id}`, {
          headers: session ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setProject(projectData.project);
        }

        // Fetch tasks for this snapshot
        const tasksResponse = await fetch(`/api/tasks/snapshot/${snapshotId}`, {
          headers: session ? {
            'Authorization': `Bearer ${session.access_token}`,
          } : {},
        });
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setSnapshotTasks(tasksData.tasks || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshot');
    } finally {
      setLoading(false);
    }
  }, [snapshotId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const handleDownload = () => {
    if (!snapshot) return;

    const blob = new Blob([snapshot.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = project ? `${project.repo_name.replace('/', '-')}-architecture.md` : `architecture-${snapshot.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    if (!snapshot) return;
    
    try {
      await navigator.clipboard.writeText(snapshot.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyCodeBlock = async (code: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeBlock(blockId);
      setTimeout(() => setCopiedCodeBlock(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!project) return;

    try {
      setRegenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/projects/${project.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate architecture');
      }

      // Redirect to the new snapshot
      if (data.snapshot?.id) {
        window.location.href = `/snapshot/${data.snapshot.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
      setRegenerating(false);
    }
  };

  const handleGenerateTask = async () => {
    if (!snapshot || !taskDescription.trim()) return;

    try {
      setGeneratingTask(true);
      setTaskError(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          description: taskDescription.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate task');
      }

      // Redirect to the task page
      if (data.task?.id) {
        window.location.href = `/task/${data.task.id}`;
      }
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to generate task');
      setGeneratingTask(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading architecture documentation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{error || 'Snapshot not found'}</p>
            </div>
            <Button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              onClick={() => window.location.href = '/dashboard'}
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {project ? project.repo_name : 'Architecture'} Documentation
              </h1>
              <p className="text-gray-500 mt-1">
                Generated on {formatDate(snapshot.created_at)}
                {project?.branch && <span className="ml-2 text-sm bg-gray-200 text-gray-700 px-2 py-0.5 rounded">branch: {project.branch}</span>}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                title="Copy markdown to clipboard"
              >
                {copied ? <CheckIcon className="w-5 h-5 text-green-600" /> : <CopyIcon className="w-5 h-5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                title="Download as markdown file"
              >
                <DownloadIcon className="w-5 h-5" />
                <span>Download</span>
              </button>

              {project && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate architecture documentation"
                >
                  <RefreshIcon className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
                </button>
              )}

              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                title="Generate implementation task from feature description"
              >
                <TaskIcon className="w-5 h-5" />
                <span>Generate Task</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Regenerating overlay */}
        {regenerating && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <p className="text-blue-700">Regenerating architecture documentation... This may take a minute.</p>
            </div>
          </div>
        )}

        {/* Markdown Content */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden">
          <div className="p-8 sm:p-10 text-gray-900 prose prose-lg max-w-none
            [&_h1]:text-gray-900 [&_h1]:font-bold [&_h1]:text-3xl [&_h1]:border-b [&_h1]:border-gray-200 [&_h1]:pb-4 [&_h1]:mb-6
            [&_h2]:text-gray-900 [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-gray-900 [&_h3]:font-semibold [&_h3]:text-xl [&_h3]:mt-8
            [&_h4]:text-gray-900 [&_h4]:font-semibold [&_h4]:text-lg [&_h4]:mt-6
            [&_p]:text-gray-800 [&_p]:leading-relaxed [&_p]:my-4
            [&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline
            [&_strong]:text-gray-900 [&_strong]:font-semibold
            [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6
            [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
            [&_li]:text-gray-800 [&_li]:my-1
            [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:text-gray-800
            [&_pre]:p-0 [&_pre]:bg-transparent
            [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:bg-blue-50 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:not-italic [&_blockquote]:text-gray-700
            [&_table]:border-collapse [&_th]:bg-gray-100 [&_th]:border [&_th]:border-gray-300 [&_th]:px-4 [&_th]:py-2 [&_th]:text-gray-900
            [&_td]:border [&_td]:border-gray-300 [&_td]:px-4 [&_td]:py-2 [&_td]:text-gray-800
          ">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const blockId = `code-${Math.random().toString(36).substr(2, 9)}`;
                  
                  // Check if it's an inline code or a code block
                  const isInline = !match && !className;
                  
                  if (isInline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="relative group rounded-lg overflow-hidden my-4">
                      <div className="absolute right-2 top-2 z-10">
                        <button
                          onClick={() => handleCopyCodeBlock(codeString, blockId)}
                          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy code"
                        >
                          {copiedCodeBlock === blockId ? (
                            <CheckIcon className="w-4 h-4 text-green-400" />
                          ) : (
                            <CopyIcon className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      </div>
                      {match ? (
                        <div className="text-xs text-gray-400 bg-gray-800 px-4 py-1 border-b border-gray-700">
                          {match[1]}
                        </div>
                      ) : null}
                      <CodeHighlighter
                        style={oneDark}
                        language={match ? match[1] : 'text'}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: match ? '0' : '0.5rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        {codeString}
                      </CodeHighlighter>
                    </div>
                  );
                },
              }}
            >
              {snapshot.markdown}
            </ReactMarkdown>
          </div>
        </div>

        {/* Tasks generated from this snapshot */}
        {snapshotTasks.length > 0 && (
          <div className="mt-8 bg-white shadow-xl rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Tasks Generated from this Snapshot ({snapshotTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {snapshotTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{task.title}</h3>
                      <p className="text-sm text-gray-500 truncate mt-1">{task.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Created {new Date(task.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => window.location.href = `/task/${task.id}`}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      View Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Generated by ArchAI • <a href="/dashboard" className="text-blue-600 hover:underline">View all projects</a></p>
        </div>
      </div>

      {/* Task Generation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Generate Implementation Task</h2>
                <p className="text-gray-500 text-sm mt-1">Describe the feature you want to build</p>
              </div>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setTaskDescription('');
                  setTaskError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <CloseIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Feature Description
              </label>
              <textarea
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="e.g., Add user settings page with profile editing, password change, and notification preferences"
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-gray-900 placeholder-gray-400"
                disabled={generatingTask}
              />
              <p className="mt-2 text-sm text-gray-500">
                Be specific about what you want to build. The more detail you provide, the better the task breakdown will be.
              </p>

              {taskError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{taskError}</p>
                </div>
              )}

              {generatingTask && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent"></div>
                    <p className="text-green-700">Generating task breakdown... This may take a moment.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setTaskDescription('');
                  setTaskError(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={generatingTask}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateTask}
                disabled={generatingTask || taskDescription.trim().length < 10}
                className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingTask ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <TaskIcon className="w-5 h-5" />
                    <span>Generate Task</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SnapshotPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <SnapshotPageContent params={params} />
    </ProtectedRoute>
  );
}
