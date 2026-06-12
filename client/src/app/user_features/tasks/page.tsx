'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Clock, AlertTriangle, Circle, Calendar, Loader2, ArrowRight, X, ArrowUpDown } from 'lucide-react';
import api from '@/lib/axios';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: { title: string };
  projectId: string;
}

const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  High: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
  Urgent: 'text-red-400 bg-red-400/10 border border-red-400/20 shadow-[0_0_10px_rgba(248,113,113,0.3)]',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Todo': <Circle className="w-4 h-4 text-gray-500" />,
  'In Progress': <Clock className="w-4 h-4 text-blue-400" />,
  'Review': <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  'Completed': <CheckSquare className="w-4 h-4 text-green-400" />,
};

const STATUS_OPTIONS = ['Todo', 'In Progress', 'Review', 'Completed'];

type SortKey = 'dueDate' | 'priority' | 'title' | 'status';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get('/tasks/all?page=1&limit=100');
        setTasks(res.data.data || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, taskId: string) => {
    const newStatus = e.target.value;
    setUpdatingId(taskId);
    try {
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Failed to update task status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const isOverdue = (task: Task) =>
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

  const filtered = tasks
    .filter(t => {
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.project?.title.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchPriority && matchSearch;
    })
    .sort((a, b) => {
      if (sortKey === 'priority') return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'status') return a.status.localeCompare(b.status);
      // dueDate: nulls last, overdue first
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const overdueCount = tasks.filter(t => isOverdue(t)).length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Tasks</h2>
          <p className="text-gray-400 text-sm mt-1">
            {tasks.length} total · {completedCount} completed
            {overdueCount > 0 && <span className="text-red-400 ml-2">· {overdueCount} overdue</span>}
          </p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span><strong>{overdueCount}</strong> task{overdueCount > 1 ? 's are' : ' is'} overdue — consider resolving them first.</span>
        </div>
      )}

      {/* Filters + Sort Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:w-64">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks or projects..."
            className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          {/* Status Filter */}
          <div className="flex-1 sm:flex-initial flex items-center gap-2 min-w-[120px] sm:min-w-0">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white"
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex-1 sm:flex-initial flex items-center gap-2 min-w-[120px] sm:min-w-0">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white"
            >
              <option value="all">All</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex-1 sm:flex-initial flex items-center gap-2 min-w-[120px] sm:min-w-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="w-full sm:w-auto bg-black/40 border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title A–Z</option>
              <option value="status">Status</option>
            </select>
          </div>

          {/* Clear */}
          {(statusFilter !== 'all' || priorityFilter !== 'all' || search) && (
            <button
              onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setSearch(''); }}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1 ml-auto sm:ml-0"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-600">Showing {filtered.length} of {tasks.length} tasks</p>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
            <CheckSquare className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match filters'}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs text-center mb-6">
            {tasks.length === 0
              ? 'Create a project and add some tasks to see them appear here.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {tasks.length === 0 ? (
            <Link href="/user_features/projects" className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors">
              Go to Projects <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setSearch(''); }}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(task => {
            const overdue = isOverdue(task);
            return (
              <div
                key={task.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border hover:bg-white/[0.05] transition-all group ${
                  overdue ? 'border-red-500/30 bg-red-500/[0.02]' :
                  task.status === 'Completed' ? 'opacity-60 border-white/[0.04]' : 'border-white/[0.06]'
                }`}
              >
                {/* Status + Title */}
                <div className="flex flex-1 items-start gap-3 min-w-0">
                  <div className="mt-1 flex-shrink-0">{STATUS_ICONS[task.status] || STATUS_ICONS['Todo']}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/user_features/projects/${task.projectId}`}
                        className={`text-base font-semibold group-hover:text-purple-400 transition-colors truncate ${task.status === 'Completed' ? 'line-through text-gray-500' : 'text-white'}`}
                      >
                        {task.title}
                      </Link>
                      {overdue && (
                        <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Overdue</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <Link href={`/user_features/projects/${task.projectId}`} className="hover:text-purple-400 transition-colors truncate">
                        {task.project?.title}
                      </Link>
                      {task.dueDate && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-600" />
                          <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-400' : ''}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium}`}>
                    {task.priority}
                  </span>
                  <div className="relative">
                    {updatingId === task.id ? (
                      <div className="px-3 py-1.5 border border-white/10 rounded-lg bg-black/20 flex items-center justify-center w-[120px]">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      </div>
                    ) : (
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(e, task.id)}
                        className={`w-[120px] bg-black/40 border border-white/10 rounded-lg text-xs font-medium px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none cursor-pointer transition-colors hover:border-white/20 ${
                          task.status === 'Completed' ? 'text-green-400' : 'text-gray-300'
                        }`}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
