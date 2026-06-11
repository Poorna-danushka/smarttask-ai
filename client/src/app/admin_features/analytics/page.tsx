'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, FolderKanban, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import adminApi from '@/lib/adminAxios';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
    </div>
  );

  const productivity = stats?.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  const taskStatusData = [
    { name: 'Completed', value: stats?.completedTasks || 0 },
    { name: 'Overdue', value: stats?.overdueTasks || 0 },
    { name: 'Active', value: Math.max(0, (stats?.totalTasks || 0) - (stats?.completedTasks || 0) - (stats?.overdueTasks || 0)) },
  ].filter(d => d.value > 0);

  const userGrowthData = stats?.userGrowth || [];

  const summaryCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', delta: `+${stats?.newUsersToday || 0} today` },
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: FolderKanban, color: 'text-purple-400', bg: 'bg-purple-500/10', delta: 'across platform' },
    { label: 'Tasks Completed', value: stats?.completedTasks || 0, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', delta: `${productivity}% completion rate` },
    { label: 'Overdue Tasks', value: stats?.overdueTasks || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', delta: 'need attention' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Analytics</h2>
          <p className="text-gray-500 text-sm mt-1">Full overview of platform performance and growth</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-white font-medium mt-1">{s.label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{s.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-base font-semibold mb-1">User Growth</h3>
          <p className="text-xs text-gray-600 mb-6">New registrations per day — last 7 days</p>
          {userGrowthData.some((d: any) => d.users > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="users" name="New Users" stroke="#ef4444" strokeWidth={2.5} fill="url(#analyticsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No registrations in the last 7 days</p>
              </div>
            </div>
          )}
        </div>

        {/* Task Status Breakdown */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-base font-semibold mb-1">Task Status</h3>
          <p className="text-xs text-gray-600 mb-6">Platform-wide task breakdown</p>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {taskStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Legend formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-600 text-sm">No task data yet</div>
          )}
        </div>
      </div>

      {/* Productivity & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Meter */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-base font-semibold mb-6">Platform Productivity</h3>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
                <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle
                  cx="72" cy="72" r="60" fill="none"
                  stroke="url(#prodGrad)" strokeWidth="12"
                  strokeDasharray={`${(productivity / 100) * 377} 377`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="prodGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white">{productivity}%</span>
                <span className="text-xs text-gray-500">completion</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Tasks Completed', value: stats?.completedTasks || 0, total: stats?.totalTasks || 0, color: 'bg-green-500' },
              { label: 'Overdue', value: stats?.overdueTasks || 0, total: stats?.totalTasks || 0, color: 'bg-red-500' },
              { label: 'Total Notifications', value: stats?.notifications || 0, total: stats?.notifications || 0, color: 'bg-blue-500' },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${m.color} flex-shrink-0`} />
                <span className="text-xs text-gray-400 flex-1">{m.label}</span>
                <span className="text-sm font-bold text-white">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Table */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-base font-semibold mb-6">Platform Summary</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Users', value: stats?.totalUsers || 0 },
              { label: 'Total Projects', value: stats?.totalProjects || 0 },
              { label: 'Total Tasks', value: stats?.totalTasks || 0 },
              { label: 'Completed Tasks', value: stats?.completedTasks || 0 },
              { label: 'Overdue Tasks', value: stats?.overdueTasks || 0 },
              { label: 'Total Notifications', value: stats?.notifications || 0 },
              { label: 'New Users Today', value: stats?.newUsersToday || 0 },
              { label: 'Tasks Completed Today', value: stats?.tasksCompletedToday || 0 },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-sm text-gray-400">{row.label}</span>
                <span className="text-sm font-bold text-white">{row.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
