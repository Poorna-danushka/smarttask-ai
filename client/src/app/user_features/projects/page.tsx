'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FolderKanban, Calendar, CheckSquare, Loader2, Trash2, Pencil, X, Search, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import Link from 'next/link';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  _count: { tasks: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  archived: { label: 'Archived', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects?page=1&limit=50');
      // For now, load up to 50 projects as an easy "Load All" default.
      // In a more complex UI we would use the meta.totalPages to build a pagination component.
      setProjects(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openCreate = () => {
    setEditProject(null);
    setForm({ title: '', description: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEdit = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditProject(project);
    setForm({ title: project.title, description: project.description || '', status: project.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editProject) {
        await api.put(`/projects/${editProject.id}`, form);
        setProjects(prev => prev.map(p => p.id === editProject.id ? { ...p, ...form } : p));
      } else {
        const res = await api.post('/projects', form);
        setProjects(prev => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    setDeleteId(project.id);
    try {
      await api.delete(`/projects/${project.id}`);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-gray-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} · Click any project to open its Kanban board</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(120,119,198,0.3)] transition-all"
        >
          <Plus className="w-5 h-5" /> New Project
        </button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
          />
        </div>
      )}

      {/* Projects Grid */}
      {filtered.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5">
            <FolderKanban className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{search ? 'No matching projects' : 'No projects yet'}</h3>
          <p className="text-gray-500 text-sm max-w-xs text-center mb-6">
            {search ? 'Try a different search term.' : 'Create your first project to start organising tasks with a Kanban board.'}
          </p>
          {!search && (
            <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors">
              <Plus className="w-4 h-4" /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(project => (
            <Link key={project.id} href={`/user_features/projects/${project.id}`}
              className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-purple-500/20 transition-all relative overflow-hidden flex flex-col"
            >
              {/* Left accent */}
              <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => openEdit(e, project)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(project); }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">{project.title}</h3>
              <p className="text-gray-500 text-sm flex-1 line-clamp-2 min-h-[40px]">
                {project.description || 'No description. Click to open Kanban board.'}
              </p>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5" />{project._count.tasks} tasks</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium border capitalize ${STATUS_CONFIG[project.status]?.color || STATUS_CONFIG.active.color}`}>
                    {project.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-purple-400 transition-colors group-hover:translate-x-0.5 duration-150" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">{editProject ? 'Edit Project' : 'New Project'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Project Name *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-600"
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none placeholder-gray-600"
                  placeholder="What is this project about?"
                />
              </div>
              {editProject && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#111] border border-red-500/20 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Delete Project</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Delete <strong className="text-white">"{confirmDelete.title}"</strong>? All {confirmDelete._count.tasks} task{confirmDelete._count.tasks !== 1 ? 's' : ''} inside will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteId === confirmDelete.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleteId === confirmDelete.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
