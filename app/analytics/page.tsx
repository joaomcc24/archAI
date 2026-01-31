'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { supabase } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface Stats {
  totalProjects: number;
  totalSnapshots: number;
  totalTasks: number;
  snapshotsThisMonth: number;
  tasksThisMonth: number;
  projectsChange: number;
  snapshotsChange: number;
  tasksChange: number;
}

interface ActivityData {
  date: string;
  snapshots: number;
  tasks: number;
}

interface RecentActivity {
  id: string;
  type: 'snapshot' | 'task' | 'project';
  title: string;
  timestamp: string;
  projectName?: string;
}

// Icons
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function AnalyticsContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      if (projectsError) throw projectsError;

      const projectIds = projects?.map(p => p.id) || [];

      // Fetch all snapshots
      const { data: snapshots, error: snapshotsError } = await supabase
        .from('snapshots')
        .select('*')
        .in('project_id', projectIds.length > 0 ? projectIds : ['']);

      if (snapshotsError) throw snapshotsError;

      // Fetch all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds.length > 0 ? projectIds : ['']);

      if (tasksError) throw tasksError;

      // Calculate this month's stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const startOfLastMonth = new Date(startOfMonth);
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

      const snapshotsThisMonth = snapshots?.filter(s => 
        new Date(s.created_at) >= startOfMonth
      ).length || 0;

      const snapshotsLastMonth = snapshots?.filter(s => 
        new Date(s.created_at) >= startOfLastMonth && new Date(s.created_at) < startOfMonth
      ).length || 0;

      const tasksThisMonth = tasks?.filter(t => 
        new Date(t.created_at) >= startOfMonth
      ).length || 0;

      const tasksLastMonth = tasks?.filter(t => 
        new Date(t.created_at) >= startOfLastMonth && new Date(t.created_at) < startOfMonth
      ).length || 0;

      // Calculate changes
      const snapshotsChange = snapshotsLastMonth > 0 
        ? Math.round(((snapshotsThisMonth - snapshotsLastMonth) / snapshotsLastMonth) * 100)
        : snapshotsThisMonth > 0 ? 100 : 0;

      const tasksChange = tasksLastMonth > 0
        ? Math.round(((tasksThisMonth - tasksLastMonth) / tasksLastMonth) * 100)
        : tasksThisMonth > 0 ? 100 : 0;

      setStats({
        totalProjects: projects?.length || 0,
        totalSnapshots: snapshots?.length || 0,
        totalTasks: tasks?.length || 0,
        snapshotsThisMonth,
        tasksThisMonth,
        projectsChange: 0,
        snapshotsChange,
        tasksChange,
      });

      // Generate activity data for chart
      const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365;
      const activityMap: { [key: string]: { snapshots: number; tasks: number } } = {};
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        activityMap[dateKey] = { snapshots: 0, tasks: 0 };
      }

      snapshots?.forEach(s => {
        const dateKey = new Date(s.created_at).toISOString().split('T')[0];
        if (activityMap[dateKey]) {
          activityMap[dateKey].snapshots++;
        }
      });

      tasks?.forEach(t => {
        const dateKey = new Date(t.created_at).toISOString().split('T')[0];
        if (activityMap[dateKey]) {
          activityMap[dateKey].tasks++;
        }
      });

      const chartData = Object.entries(activityMap).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        ...data,
      }));

      // For week/month, show all days. For year, aggregate by week
      if (selectedPeriod === 'year') {
        const weeklyData: ActivityData[] = [];
        for (let i = 0; i < chartData.length; i += 7) {
          const week = chartData.slice(i, i + 7);
          weeklyData.push({
            date: week[0].date,
            snapshots: week.reduce((sum, d) => sum + d.snapshots, 0),
            tasks: week.reduce((sum, d) => sum + d.tasks, 0),
          });
        }
        setActivityData(weeklyData);
      } else {
        setActivityData(chartData);
      }

      // Recent activity
      const allActivity: RecentActivity[] = [
        ...(snapshots?.map(s => ({
          id: s.id,
          type: 'snapshot' as const,
          title: 'Architecture snapshot generated',
          timestamp: s.created_at,
          projectName: projects?.find(p => p.id === s.project_id)?.repo_name,
        })) || []),
        ...(tasks?.map(t => ({
          id: t.id,
          type: 'task' as const,
          title: t.title || 'Task generated',
          timestamp: t.created_at,
          projectName: projects?.find(p => p.id === t.project_id)?.repo_name,
        })) || []),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      setRecentActivity(allActivity);

    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 mb-4 transition-colors font-medium text-sm"
          >
            <BackIcon className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-1">Track your usage and activity</p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Projects */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-300 text-sm font-medium">Total Projects</span>
              <div className="p-2 bg-white/10 rounded-lg">
                <FolderIcon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">{stats?.totalProjects || 0}</div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm">
              <TrendUpIcon className="w-4 h-4" />
              <span>Active repositories</span>
            </div>
          </div>

          {/* Total Snapshots */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Total Snapshots</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <CameraIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats?.totalSnapshots || 0}</div>
            <div className="flex items-center gap-1 text-sm">
              {stats?.snapshotsChange !== undefined && stats.snapshotsChange >= 0 ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <TrendUpIcon className="w-4 h-4" />
                  +{stats.snapshotsChange}% from last month
                </span>
              ) : (
                <span className="text-gray-500">{stats?.snapshotsThisMonth || 0} this month</span>
              )}
            </div>
          </div>

          {/* Total Tasks */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Tasks Generated</span>
              <div className="p-2 bg-green-50 rounded-lg">
                <TaskIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">{stats?.totalTasks || 0}</div>
            <div className="flex items-center gap-1 text-sm">
              {stats?.tasksChange !== undefined && stats.tasksChange >= 0 ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <TrendUpIcon className="w-4 h-4" />
                  +{stats.tasksChange}% from last month
                </span>
              ) : (
                <span className="text-gray-500">{stats?.tasksThisMonth || 0} this month</span>
              )}
            </div>
          </div>

          {/* Usage This Month */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">Usage This Month</span>
              <div className="p-2 bg-purple-50 rounded-lg">
                <ChartIcon className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {(stats?.snapshotsThisMonth || 0) + (stats?.tasksThisMonth || 0)}
            </div>
            <div className="text-sm text-gray-500">
              {stats?.snapshotsThisMonth || 0} snapshots, {stats?.tasksThisMonth || 0} tasks
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Activity Overview</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="snapshotGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="snapshots" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#snapshotGradient)" 
                    name="Snapshots"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#taskGradient)" 
                    name="Tasks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">Snapshots</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-sm text-gray-600">Tasks</span>
              </div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Weekly Breakdown</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="snapshots" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Snapshots" />
                  <Bar dataKey="tasks" fill="#10b981" radius={[4, 4, 0, 0]} name="Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ChartIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No activity yet</p>
                <p className="text-sm">Generate your first snapshot to see activity here</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    href={activity.type === 'snapshot' ? `/snapshot/${activity.id}` : `/task/${activity.id}`}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'snapshot' ? 'bg-blue-50' : 'bg-green-50'
                    }`}>
                      {activity.type === 'snapshot' ? (
                        <CameraIcon className="w-5 h-5 text-blue-600" />
                      ) : (
                        <TaskIcon className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      {activity.projectName && (
                        <p className="text-sm text-gray-500 truncate">
                          {activity.projectName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(activity.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team Collaboration - Coming Soon */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-slate-800 text-white text-xs font-medium rounded-full">
                Coming Soon
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <UsersIcon className="w-6 h-6 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Team Collaboration</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Invite team members, share architecture snapshots, and collaborate on implementation tasks.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-100 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-28 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-100 rounded w-20 animate-pulse"></div>
                </div>
              </div>
              <button 
                disabled
                className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm font-medium cursor-not-allowed"
              >
                + Add Member
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
