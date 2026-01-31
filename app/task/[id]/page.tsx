"use client";

import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/Button";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import { supabase } from "../../../lib/supabase";
import { trackEvent, AnalyticsEvents } from "../../../lib/analytics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeHighlighter = SyntaxHighlighter as React.ComponentType<any>;

interface Task {
  id: string;
  project_id: string;
  snapshot_id: string;
  title: string;
  description: string;
  markdown: string;
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

// Back arrow icon
function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

// Trash icon
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function TaskPageContent({ params }: { params: Promise<{ id: string }> }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    params.then((resolvedParams) => {
      setTaskId(resolvedParams.id);
    });
  }, [params]);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/tasks/${taskId}`, {
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch task');
      }

      setTask(data.task);

      // Track task viewed
      if (data.task) {
        trackEvent(AnalyticsEvents.TASK_VIEWED, {
          task_id: taskId,
          project_id: data.task.project_id,
          snapshot_id: data.task.snapshot_id,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId, fetchTask]);

  const handleDownload = () => {
    if (!task) return;
    
    const blob = new Blob([task.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    if (!task) return;
    
    try {
      await navigator.clipboard.writeText(task.markdown);
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

  const handleDelete = async () => {
    if (!task || !confirm('Are you sure you want to delete this task?')) return;

    try {
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: session ? {
          'Authorization': `Bearer ${session.access_token}`,
        } : {},
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete task');
      }

      // Go back to snapshot
      window.location.href = `/snapshot/${task.snapshot_id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading task...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{error || 'Task not found'}</p>
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
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Task</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {task.title}
              </h1>
              <p className="text-gray-500 mt-1">
                Generated on {formatDate(task.created_at)}
              </p>
              <p className="text-gray-600 mt-2 text-sm">
                <span className="font-medium">Feature request:</span> {task.description}
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

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                title="Delete this task"
              >
                <TrashIcon className="w-5 h-5" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
              
              <button
                onClick={() => window.location.href = `/snapshot/${task.snapshot_id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
              >
                <BackIcon className="w-5 h-5" />
                <span>Back to Snapshot</span>
              </button>
            </div>
          </div>
        </div>

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
            [&_blockquote]:border-l-4 [&_blockquote]:border-green-500 [&_blockquote]:bg-green-50 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:not-italic [&_blockquote]:text-gray-700
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
              {task.markdown}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Generated by ArchAI • <a href="/dashboard" className="text-blue-600 hover:underline">View all projects</a></p>
        </div>
      </div>
    </div>
  );
}

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <TaskPageContent params={params} />
    </ProtectedRoute>
  );
}
