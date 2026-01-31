'use client';

import React from 'react';

export interface FileChanges {
  added: string[];
  removed: string[];
  modified: string[];
}

interface FileChangesListProps {
  changes: FileChanges;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

export function FileChangesList({ changes }: FileChangesListProps) {
  const totalChanges = changes.added.length + changes.removed.length + changes.modified.length;

  if (totalChanges === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No file changes detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {changes.added.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PlusIcon className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Added Files ({changes.added.length})
            </h3>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <ul className="space-y-1">
              {changes.added.map((file) => (
                <li key={file} className="text-sm text-gray-700 font-mono">
                  <span className="text-green-600 mr-2">+</span>
                  {file}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {changes.removed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MinusIcon className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Removed Files ({changes.removed.length})
            </h3>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <ul className="space-y-1">
              {changes.removed.map((file) => (
                <li key={file} className="text-sm text-gray-700 font-mono">
                  <span className="text-red-600 mr-2">-</span>
                  {file}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {changes.modified.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <EditIcon className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Modified Files ({changes.modified.length})
            </h3>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="space-y-1">
              {changes.modified.map((file) => (
                <li key={file} className="text-sm text-gray-700 font-mono">
                  <span className="text-yellow-600 mr-2">~</span>
                  {file}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
