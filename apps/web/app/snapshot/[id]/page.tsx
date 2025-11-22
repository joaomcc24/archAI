"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@repo/ui/button";

interface Snapshot {
  id: string;
  project_id: string;
  markdown: string;
  created_at: string;
}

export default function SnapshotPage({ params }: { params: Promise<{ id: string }> }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolvedParams) => {
      setSnapshotId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/snapshots/${snapshotId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch snapshot');
        }

        setSnapshot(data.snapshot);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load snapshot');
      } finally {
        setLoading(false);
      }
    };

    if (snapshotId) {
      fetchSnapshot();
    }
  }, [snapshotId]);

  const handleDownload = () => {
    if (!snapshot) return;

    const blob = new Blob([snapshot.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-${snapshot.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading snapshot...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error || 'Snapshot not found'}</p>
          </div>
          <Button
            appName="web"
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
            onClick={() => window.location.href = '/dashboard'}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Architecture Snapshot</h1>
            <p className="text-gray-600">Generated on {formatDate(snapshot.created_at)}</p>
          </div>
          <div className="flex space-x-3">
            <Button
              appName="web"
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleDownload}
            >
              Download Markdown
            </Button>
            <Button
              appName="web"
              className="px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => window.location.href = '/dashboard'}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-8 prose prose-slate max-w-none text-black">
          <ReactMarkdown>{snapshot.markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

