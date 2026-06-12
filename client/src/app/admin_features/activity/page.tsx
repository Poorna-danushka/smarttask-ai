'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, UserPlus, FolderPlus, CheckCircle2,
  LogIn, Shield, Clock, Loader2, RefreshCw, Bell, Download, Wifi, WifiOff
} from 'lucide-react';
import adminApi from '@/lib/adminAxios';

interface ActivityItem {
  type: string;
  label: string;
  user: string;
  time: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  login: { icon: LogIn, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  register: { icon: UserPlus, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  project_create: { icon: FolderPlus, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  task_complete: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  role_change: { icon: Shield, color: 'text-red-400', bg: 'bg-red-400/10' },
  notification: { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-400/10' },
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const groupByDay = (activities: ActivityItem[]) => {
  const groups: Record<string, ActivityItem[]> = {};
  activities.forEach(a => {
    const key = formatDate(a.time);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return groups;
};

export default function AdminActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<any>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/activity');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to fetch activity', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchActivity, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchActivity]);

  // Export log as CSV
  const exportCSV = () => {
    const header = 'Type,Label,User,Time';
    const rows = activities.map(a =>
      `${a.type},"${a.label.replace(/"/g, '""')}",${a.user},${new Date(a.time).toISOString()}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'activity-log.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Registrations', value: 'register' },
    { label: 'Projects', value: 'project_create' },
    { label: 'Tasks Done', value: 'task_complete' },
    { label: 'Admin Changes', value: 'role_change' },
  ];

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);
  const grouped = groupByDay(filtered);
  const today = activities.filter(a => new Date(a.time) > new Date(Date.now() - 86400000)).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Activity Log</h2>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Loading...' : `${activities.length} total events · ${today} today`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh (30s)'}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              autoRefresh
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-white/[0.03] border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {autoRefresh ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{autoRefresh ? 'Live' : 'Live Off'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            disabled={activities.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all text-sm disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>

          <button
            onClick={fetchActivity}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Events Today', value: today },
          { label: 'New Users', value: activities.filter(a => a.type === 'register').length },
          { label: 'Projects Created', value: activities.filter(a => a.type === 'project_create').length },
          { label: 'Tasks Completed', value: activities.filter(a => a.type === 'task_complete').length },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f.value
              ? 'bg-red-500/15 text-red-400 border border-red-500/25'
              : 'bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl">
          <Activity className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-600">No activity recorded yet</p>
          <p className="text-gray-700 text-sm mt-1">Activity will appear as users register, create projects, and complete tasks.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, events]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-2">{date}</span>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>
              <div className="space-y-2">
                {events.map((event, i) => {
                  const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.notification;
                  const Icon = config.icon;
                  return (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium leading-snug">{event.label}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {event.user && event.user !== 'unknown' && (
                            <span className="text-xs text-gray-600">
                              by <span className="text-gray-400 font-medium">{event.user}</span>
                            </span>
                          )}
                          <span className="text-gray-700">·</span>
                          <span className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="w-3 h-3" />
                            {timeAgo(event.time)}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-700 flex-shrink-0 hidden sm:block">
                        {new Date(event.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
