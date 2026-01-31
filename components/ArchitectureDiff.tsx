'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ArchitectureDiffProps {
  diff: string;
}

export function ArchitectureDiff({ diff }: ArchitectureDiffProps) {
  const [viewMode, setViewMode] = useState<'markdown' | 'raw'>('markdown');

  if (!diff || diff.trim() === '') {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No architecture changes detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Architecture Documentation Changes</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('markdown')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'markdown'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 overflow-auto max-h-96">
        {viewMode === 'markdown' ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mb-4 text-gray-900">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold mb-3 text-gray-900 mt-6">{children}</h2>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-4">{children}</ul>
                ),
                li: ({ children }) => {
                  const text = String(children);
                  if (text.startsWith('+')) {
                    return (
                      <li className="text-green-700 bg-green-50 px-2 py-1 rounded">
                        {children}
                      </li>
                    );
                  }
                  if (text.startsWith('-')) {
                    return (
                      <li className="text-red-700 bg-red-50 px-2 py-1 rounded">
                        {children}
                      </li>
                    );
                  }
                  return <li className="text-gray-700">{children}</li>;
                },
                p: ({ children }) => <p className="mb-2 text-gray-700">{children}</p>,
                code: ({ children }) => (
                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {diff}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {diff}
          </pre>
        )}
      </div>
    </div>
  );
}
