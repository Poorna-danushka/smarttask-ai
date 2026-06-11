'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Search, Trash2, Loader2, RefreshCw, CheckSquare, Calendar, User } from 'lucide-react';
import adminApi from '@/lib/adminAxios';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  owner: { username: string; email: string };
  _count: { tasks: number };
}

type StatusFilter = 'all' | 'active' | 'completed' | 'archived';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/projects');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (project: Project) => {
    setDeleteId(project.id);
    try {
      await adminApi.delete(`/admin/projects/${project.id}`);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.owner?.username?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalTasks = projects.reduce((sum, p) => sum + p._count.tasks, 0);

  const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'Archived', value: 'archived' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Project Management</h2>
          <p className="text-gray-500 text-sm mt-1">{projects.length} projects · {totalTasks} total tasks</p>
        </div>
        <button onClick={fetchProjects} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: projects.length, color: 'text-white' },
          { label: 'Active', value: projects.filter(p => p.status === 'active').length, color: 'text-green-400' },
          { label: 'Completed', value: projects.filter(p => p.status === 'completed').length, color: 'text-blue-400' },
          { label: 'Total Tasks', value: totalTasks, color: 'text-purple-400' },
        ].map((s, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl w-fit border border-white/5">
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setStatusFilter(t.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === t.value
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by project name or owner..."
          className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-sm"
        />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl">
          <FolderKanban className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-500">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const taskPct = Math.min(100, (project._count.tasks / Math.max(1, totalTasks / projects.length)) * 100);
            return (
              <div key={project.id} className="group p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-purple-400" />
                  </div>
                  <button
                    onClick={() => setConfirmDelete(project)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-semibold text-white mb-1 truncate">{project.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4 min-h-[32px]">
                  {project.description || 'No description'}
                </p>

                {/* Task progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                    <span>{project._count.tasks} tasks</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${Math.min(100, taskPct)}%` }} />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3.5 h-3.5" />
                      <span>{project.owner?.username || 'Unknown'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium border capitalize ${STATUS_COLORS[project.status] || STATUS_COLORS.active}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0d0f14] border border-red-500/20 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Delete Project</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Delete <strong className="text-white">"{confirmDelete.title}"</strong>? This will permanently delete all {confirmDelete._count.tasks} tasks inside it.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleteId === confirmDelete.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
