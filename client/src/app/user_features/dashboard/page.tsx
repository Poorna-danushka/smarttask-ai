'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  CheckCircle2, Clock, Activity, Target, AlertTriangle, FolderKanban,
  Loader2, Calendar, Plus, X, Zap, ArrowRight
} from 'lucide-react';
import api from '@/lib/axios';
import Link from 'next/link';
import StatCard from '@/components/ui/StatCard';

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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quickForm, setQuickForm] = useState({ title: '', projectId: '', priority: 'Medium', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

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
      // refresh stats quietly
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
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  const statCards = [
    { title: 'Total Tasks', value: stats?.totalTasks ?? 0, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Completed', value: stats?.completedTasks ?? 0, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
    { title: 'In Progress', value: stats?.inProgressTasks ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { title: 'Productivity', value: `${stats?.productivity ?? 0}%`, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const hasUpcoming = (stats?.upcomingDeadlines?.length ?? 0) > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Overdue Warning Banner */}
      {(stats?.overdueTasks ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm font-medium flex-1">
            You have <strong>{stats!.overdueTasks}</strong> overdue task{stats!.overdueTasks > 1 ? 's' : ''}. Consider prioritizing them today.
          </span>
          <Link href="/user_features/tasks" className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 flex-shrink-0">
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Header row with Quick Add */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back — here's your overview</p>
        </div>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(120,119,198,0.3)] transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Quick Add Task
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors z-[-1]" />
          </div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Projects', value: stats?.totalProjects ?? 0, icon: FolderKanban, href: '/user_features/projects' },
          { label: 'Pending (Todo)', value: stats?.pendingTasks ?? 0, icon: Clock, href: '/user_features/tasks' },
          { label: 'Urgent Tasks', value: stats?.urgentTasks ?? 0, icon: AlertTriangle, href: '/user_features/tasks' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Link key={i} href={s.href} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all flex items-center gap-3 group">
              <Icon className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
              <div>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Productivity Ring + Chart + Deadlines Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weekly Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-semibold">Weekly Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Tasks due & completed per day</p>
            </div>
            {/* Productivity Ring (compact) */}
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
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
                  <span className="text-xs font-black text-white">{stats?.productivity ?? 0}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-400">Productivity</p>
                <p className="text-[10px] text-gray-600">completion rate</p>
              </div>
            </div>
          </div>
          <div className="h-[240px] w-full">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff' }} />
                  <Area type="monotone" dataKey="tasks" name="Due" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600">
                <Activity className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No task activity yet.</p>
                <Link href="/user_features/projects" className="text-purple-400 text-xs mt-2 hover:underline">Create your first project →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Upcoming Deadlines</h3>
            {(stats?.urgentTasks ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
                <Zap className="w-3 h-3" /> {stats!.urgentTasks} urgent
              </span>
            )}
          </div>
          <div className="space-y-3">
            {hasUpcoming ? (
              stats!.upcomingDeadlines.map((task) => {
                const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
                return (
                  <Link
                    key={task.id}
                    href={`/user_features/projects/${task.projectId}`}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.Medium}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium group-hover:text-purple-300 transition-colors truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500 truncate">{task.project?.title}</p>
                        <span className={`text-xs font-medium flex-shrink-0 ${daysLeft <= 0 ? 'text-red-400' : daysLeft === 1 ? 'text-orange-400' : 'text-gray-500'}`}>
                          {daysLeft <= 0 ? '• Overdue' : daysLeft === 1 ? '• Due Tomorrow' : `• ${daysLeft}d left`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                <Calendar className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm text-center">No upcoming deadlines in the next 7 days.</p>
              </div>
            )}
          </div>
          {hasUpcoming && (
            <Link href="/user_features/tasks" className="block w-full mt-4 py-2.5 text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors text-center">
              View All Tasks →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Add Task Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Quick Add Task
              </h3>
              <button onClick={() => setShowQuickAdd(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Task Title *</label>
                <input
                  required autoFocus
                  value={quickForm.title}
                  onChange={e => setQuickForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-600 text-sm"
                  placeholder="e.g. Design login page"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Project *</label>
                <select
                  required
                  value={quickForm.projectId}
                  onChange={e => setQuickForm(p => ({ ...p, projectId: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Priority</label>
                  <select
                    value={quickForm.priority}
                    onChange={e => setQuickForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={quickForm.dueDate}
                    onChange={e => setQuickForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowQuickAdd(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting || addSuccess}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-80"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : addSuccess ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Plus className="w-4 h-4" />}
                  {addSuccess ? 'Added!' : submitting ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
