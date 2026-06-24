'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  CheckCircle2, Clock, Activity, Target, AlertTriangle, FolderKanban,
  Loader2, Calendar, Plus, X, Zap, ArrowRight, TrendingUp
} from 'lucide-react';
import api from '@/lib/axios';
import Link from 'next/link';
import StatCard from '@/components/ui/StatCard';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { io } from 'socket.io-client';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  urgentTasks: number;
  overdueTasks: number;
  productivity: number;
  totalProjects: number;
  weeklyData: { name: string; tasks: number; completed: number }[];
  upcomingDeadlines: {
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    projectId: string;
    project: { title: string };
  }[];
}

interface Project { id: string; title: string; }

const PRIORITY_DOT: Record<string, string> = {
  Urgent: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]',
  High: 'bg-orange-400',
  Medium: 'bg-blue-400',
  Low: 'bg-gray-400',
};

const PRIORITY_BADGE: Record<string, string> = {
  Urgent: 'bg-red-500/15 text-red-400 border-red-500/25',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Medium: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  Low: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
};

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quickForm, setQuickForm] = useState({ title: '', projectId: '', priority: 'Medium', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:5000');
    socket.emit('joinUser', user.id);

    const handleRefresh = () => {
      api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {});
      api.get('/projects?page=1&limit=50').then(r => setProjects(r.data.data || r.data)).catch(() => {});
    };

    socket.on('projectAdded', handleRefresh);
    socket.on('projectRemoved', handleRefresh);

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, projRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/projects?page=1&limit=50'),
        ]);
        setStats(statsRes.data);
        setProjects(projRes.data.data || projRes.data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.title.trim() || !quickForm.projectId) return;
    setSubmitting(true);
    try {
      await api.post('/tasks', {
        title: quickForm.title.trim(),
        projectId: quickForm.projectId,
        priority: quickForm.priority,
        dueDate: quickForm.dueDate || null,
        status: 'Todo',
      });
      setAddSuccess(true);
      setQuickForm({ title: '', projectId: quickForm.projectId, priority: 'Medium', dueDate: '' });
      api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {});
      setTimeout(() => { setAddSuccess(false); setShowQuickAdd(false); }, 1200);
    } catch (err) {
      console.error('Quick add failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm text-gray-600">Loading your workspace...</p>
      </div>
    </div>
  );

  const statCards = [
    { title: 'Total Tasks', value: stats?.totalTasks ?? 0, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Completed', value: stats?.completedTasks ?? 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { title: 'In Progress', value: stats?.inProgressTasks ?? 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { title: 'Productivity', value: `${stats?.productivity ?? 0}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const hasUpcoming = (stats?.upcomingDeadlines?.length ?? 0) > 0;

  return (
    <div className="space-y-5 sm:space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto">

      {/* Overdue Warning Banner */}
      {(stats?.overdueTasks ?? 0) > 0 && (
        <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span className="text-xs sm:text-sm font-medium flex-1">
            You have <strong>{stats!.overdueTasks}</strong> overdue task{stats!.overdueTasks > 1 ? 's' : ''}. Consider prioritizing them today.
          </span>
          <Link
            href="/user_features/tasks"
            className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 flex-shrink-0 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-red-500/20"
          >
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Welcome back — here's your overview</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_20px_rgba(120,119,198,0.25)] transition-all text-sm w-full sm:w-auto active:scale-95"
        >
          <Plus className="w-4 h-4" /> Quick Add Task
        </button>
      </div>

      {/* Stat Cards — 2-col on mobile, 4-col on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="relative group">
            <StatCard
              label={stat.title}
              value={stat.value}
              icon={stat.icon}
              colorClass={stat.color}
              bgClass={stat.bg}
              borderClass="border-white/5 backdrop-blur-xl group-hover:border-white/10"
            />
          </div>
        ))}
      </div>

      {/* Secondary Stats Row — scrollable on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Projects', value: stats?.totalProjects ?? 0, icon: FolderKanban, href: '/user_features/projects', accent: 'group-hover:text-purple-400' },
          { label: 'Pending', value: stats?.pendingTasks ?? 0, icon: Clock, href: '/user_features/tasks', accent: 'group-hover:text-amber-400' },
          { label: 'Urgent', value: stats?.urgentTasks ?? 0, icon: AlertTriangle, href: '/user_features/tasks', accent: 'group-hover:text-red-400' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Link
              key={i}
              href={s.href}
              className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 group active:scale-[0.98]"
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-colors ${s.accent}`} />
              <div>
                <p className="text-lg sm:text-xl font-bold text-white">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 leading-none">{s.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

        {/* Weekly Activity Chart */}
        <div className="xl:col-span-2 p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Weekly Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Tasks due & completed per day</p>
            </div>
            {/* Productivity Ring */}
            <div className="flex items-center gap-3 self-start sm:self-auto bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="22" fill="none"
                    stroke="url(#dashProdGrad)" strokeWidth="5"
                    strokeDasharray={`${((stats?.productivity ?? 0) / 100) * 138} 138`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="dashProdGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-black text-white">{stats?.productivity ?? 0}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-400">Productivity</p>
                <p className="text-[10px] text-gray-600 mt-0.5">completion rate</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-500">Due</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-xs text-gray-500">Completed</span>
            </div>
          </div>

          <div className="h-[200px] sm:h-[240px] w-full">
            {(stats?.weeklyData?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats!.weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff40', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', fontSize: '13px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="tasks" name="Due" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTasks)" />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Activity className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm text-gray-500">No task activity yet.</p>
                <Link href="/user_features/projects" className="text-purple-400 text-xs mt-2 hover:underline">
                  Create your first project →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-5 flex-shrink-0">
            <h3 className="text-base sm:text-lg font-semibold text-white">Upcoming</h3>
            {(stats?.urgentTasks ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] sm:text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20 font-medium">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {stats!.urgentTasks} urgent
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[320px] sm:max-h-none">
            {hasUpcoming ? (
              stats!.upcomingDeadlines.map((task) => {
                const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
                const isOverdue = daysLeft <= 0;
                const isTomorrow = daysLeft === 1;
                return (
                  <Link
                    key={task.id}
                    href={`/user_features/projects/${task.projectId}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer group active:scale-[0.98]"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.Medium}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors truncate leading-snug">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-[10px] sm:text-xs text-gray-600 truncate max-w-[120px]">{task.project?.title}</p>
                        <span className={`text-[10px] sm:text-xs font-medium flex-shrink-0 px-1.5 py-0.5 rounded-md border ${
                          isOverdue
                            ? 'text-red-400 bg-red-500/10 border-red-500/20'
                            : isTomorrow
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-gray-500 bg-white/5 border-white/5'
                        }`}>
                          {isOverdue ? 'Overdue' : isTomorrow ? 'Tomorrow' : `${daysLeft}d left`}
                        </span>
                      </div>
                      <span className={`inline-block mt-1.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.Medium}`}>
                        {task.priority}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                <Calendar className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm text-gray-500 text-center">No upcoming deadlines<br />in the next 7 days.</p>
              </div>
            )}
          </div>

          {hasUpcoming && (
            <div className="flex-shrink-0 pt-4 mt-2 border-t border-white/[0.06]">
              <Link
                href="/user_features/tasks"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs sm:text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors rounded-xl hover:bg-purple-500/5"
              >
                View All Tasks <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Task Modal */}
      {showQuickAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQuickAdd(false); }}
        >
          <div className="w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-purple-400" />
                </div>
                Quick Add Task
              </h3>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Task Title <span className="text-red-400">*</span></label>
                <input
                  required autoFocus
                  value={quickForm.title}
                  onChange={e => setQuickForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 placeholder-gray-600 text-sm transition-all"
                  placeholder="e.g. Design login page"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Project <span className="text-red-400">*</span></label>
                <select
                  required
                  value={quickForm.projectId}
                  onChange={e => setQuickForm(p => ({ ...p, projectId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 text-sm transition-all appearance-none"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Priority</label>
                  <select
                    value={quickForm.priority}
                    onChange={e => setQuickForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 text-sm transition-all appearance-none"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={quickForm.dueDate}
                    onChange={e => setQuickForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 sm:py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || addSuccess}
                  className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 shadow-[0_0_20px_rgba(120,119,198,0.2)]"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : addSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{addSuccess ? 'Added!' : submitting ? 'Adding...' : 'Add Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
