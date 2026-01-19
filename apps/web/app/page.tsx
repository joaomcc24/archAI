'use client';

import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl">
            AI Architecture Assistant
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Automatically generate comprehensive architecture documentation for your GitHub repositories using AI.
            Understand your codebase structure, tech stack, and design patterns in minutes.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-blue-600 text-3xl mb-4">🔗</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Repository</h3>
            <p className="text-gray-600 text-sm">
              Securely connect your GitHub repository with OAuth authentication
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-blue-600 text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis</h3>
            <p className="text-gray-600 text-sm">
              Our AI analyzes your codebase structure and generates detailed documentation
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-blue-600 text-3xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Export & Share</h3>
            <p className="text-gray-600 text-sm">
              Download architecture.md files and share with your team
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          {user ? (
            <div className="space-x-4">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/connect"
                className="inline-block px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-md font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Connect Repository
              </Link>
            </div>
          ) : (
            <div className="space-x-4">
              <Link
                href="/signup"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-md font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}