'use client';

import React from 'react';

interface DriftScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function DriftScore({ score, size = 'md' }: DriftScoreProps) {
  const getColor = () => {
    if (score < 20) return 'text-green-600 bg-green-50 border-green-200';
    if (score < 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-lg px-4 py-2';
      default:
        return 'text-sm px-3 py-1.5';
    }
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border font-semibold ${getColor()} ${getSizeClasses()}`}
    >
      <span className="mr-1">Drift:</span>
      <span>{score}/100</span>
    </div>
  );
}
