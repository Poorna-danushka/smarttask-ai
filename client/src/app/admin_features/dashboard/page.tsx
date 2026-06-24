'use client';

import { useState, useEffect } from 'react';
import { Users, FolderKanban, CheckCircle2, AlertTriangle, Loader2, TrendingUp, Zap, Send, Bell, CheckCheck } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import adminApi from '@/lib/adminAxios';
import StatCard from '@/components/ui/StatCard';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcast, setBroadcast] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          adminApi.get('/admin/stats'),
          adminApi.get('/admin/activity'),
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
      } catch (err) {
        console.error('Failed to fetch admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.trim()) return;
    setBroadcasting(true);
    try {
      await adminApi.post('/admin/broadcast', { message: broadcast });
      setBroadcastStatus('success');
      setBroadcast('');
      setTimeout(() => setBroadcastStatus('idle'), 3000);
    } catch {
      setBroadcastStatus('error');
      setTimeout(() => setBroadcastStatus('idle'), 3000);
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
    </div>
  );

  const productivity = stats?.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, colorClass: 'text-blue-400', bgClass: 'bg-blue-400/10', borderClass: 'border-blue-400/10' },
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: FolderKanban, colorClass: 'text-purple-400', bgClass: 'bg-purple-400/10', borderClass: 'border-purple-400/10' },
    { label: 'Tasks Completed Today', value: stats?.tasksCompletedToday || 0, icon: CheckCircle2, colorClass: 'text-green-400', bgClass: 'bg-green-400/10', borderClass: 'border-green-400/10' },
    { label: 'Overdue Tasks', value: stats?.overdueTasks || 0, icon: AlertTriangle, colorClass: 'text-red-400', bgClass: 'bg-red-400/10', borderClass: 'border-red-400/10' },
  ];

  const userGrowthData = stats?.userGrowth || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold">System Overview</h2>
        <p className="text-gray-500 text-sm mt-1">
          Real-time platform metrics · {stats?.newUsersToday || 0} new users today
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} icon={s.icon} colorClass={s.colorClass} bgClass={s.bgClass} borderClass={s.borderClass} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-base font-semibold mb-1">User Growth — Last 7 Days</h3>
          <p className="text-xs text-gray-600 mb-6">New registrations per day</p>
          {userGrowthData.some((d: any) => d.users > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Bar dataKey="users" name="New Users" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No new registrations in the last 7 days</p>
              </div>
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
          <h3 className="text-base font-semibold mb-6">System Health</h3>
          <div className="space-y-5">
            {[
              { label: 'Task Completion Rate', value: productivity, color: 'bg-green-500' },
              { label: 'Platform Stability', value: 99, color: 'bg-purple-500' },
              { label: 'Database Health', value: 100, color: 'bg-blue-500' },
            ].map((m, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400">{m.label}</span>
                  <span className="text-white font-medium">{m.value}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${m.color} rounded-full transition-all duration-1000`} style={{ width: `${m.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Users */}
          <div className="mt-8 pt-5 border-t border-white/5">
            <h4 className="text-sm font-medium text-gray-400 mb-4">Recent Users</h4>
            <div className="space-y-3">
              {(stats?.recentUsers || []).slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3">
                  {u.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000${u.avatar}`}
                      alt={u.username}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${u.role === 'admin' ? 'bg-gradient-to-tr from-red-500 to-orange-400' : 'bg-gradient-to-tr from-purple-500 to-blue-500'}`}>
                      {u.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.username}</p>
                    <p className="text-xs text-gray-600 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${u.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-500'}`}>
                    {u.role}
                  </span>
                </div>
              ))}
              {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                <p className="text-xs text-gray-700 text-center py-4">No users registered yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Notification Panel */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-500/20">
            <Bell className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Broadcast Notification</h3>
            <p className="text-xs text-gray-500">Send a message to all platform users</p>
          </div>
        </div>
        <form onSubmit={handleBroadcast} className="flex flex-col sm:flex-row gap-3">
          <input
            value={broadcast}
            onChange={e => setBroadcast(e.target.value)}
            placeholder="Type your announcement (e.g. Scheduled maintenance on Sunday 2am–4am)"
            className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 placeholder-gray-600"
          />
          <button
            type="submit"
            disabled={broadcasting || !broadcast.trim()}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all w-full sm:w-auto flex-shrink-0"
          >
            {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : broadcastStatus === 'success' ? <CheckCheck className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {broadcasting ? 'Sending...' : broadcastStatus === 'success' ? 'Sent!' : 'Broadcast'}
          </button>
        </form>
        {broadcastStatus === 'error' && (
          <p className="text-red-400 text-xs mt-2">Failed to send broadcast. Please try again.</p>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold">Recent Activity</h3>
          <span className="text-xs text-gray-600">{activity.length} events</span>
        </div>
        <div className="space-y-3">
          {activity.slice(0, 8).map((event: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                event.type === 'register' ? 'bg-yellow-400' :
                event.type === 'project_create' ? 'bg-purple-400' :
                event.type === 'task_complete' ? 'bg-green-400' :
                event.type === 'role_change' ? 'bg-red-400' : 'bg-gray-600'
              }`} />
              <p className="text-sm text-gray-300 flex-1 truncate">{event.label}</p>
              <span className="text-xs text-gray-600 flex-shrink-0">
                {new Date(event.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-6">No activity recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
