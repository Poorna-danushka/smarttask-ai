'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, FolderKanban, Calendar, CheckSquare, Loader2,
  Trash2, Pencil, X, Search, ArrowRight, Users,
  UserPlus, Shield, UserX
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import api from '@/lib/axios';
import Link from 'next/link';
import { io } from 'socket.io-client';

interface ProjectMember {
  id: string;
  userId: string;
  role: string | null;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  _count: { tasks: number };
  owner?: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
  members?: ProjectMember[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',         dot: 'bg-blue-400'    },
  archived:  { label: 'Archived',  color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',          dot: 'bg-gray-400'    },
};

/** Resolves an avatar URL – handles absolute URLs, relative server paths, and null */
function avatarSrc(avatar: string | null): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `http://localhost:5000${avatar}`;
}

/** Compact avatar with real image or initial-letter fallback */
function Avatar({
  user,
  size = 'sm',
  ring = true,
}: {
  user: { username: string; avatar: string | null } | undefined;
  size?: 'sm' | 'md';
  ring?: boolean;
}) {
  if (!user) return null;
  const dim     = size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-[10px]';
  const ringCls = ring ? 'ring-2 ring-[#0d0d14]' : '';
  const src     = avatarSrc(user.avatar);

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={user.username}
      title={user.username}
      className={`${dim} ${ringCls} rounded-full object-cover flex-shrink-0`}
    />
  ) : (
    <div
      title={user.username}
      className={`${dim} ${ringCls} rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0`}
    >
      {user.username[0].toUpperCase()}
    </div>
  );
}

/** Stacked avatar row with +N overflow badge */
function AvatarStack({
  members,
  max = 5,
}: {
  members: Array<{ id: string; username: string; avatar: string | null }>;
  max?: number;
}) {
  if (members.length === 0) {
    return (
      <span className="text-[11px] text-gray-600 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> No members yet
      </span>
    );
  }
  const shown    = members.slice(0, max);
  const overflow = members.length - max;
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <div key={u.id} className={i > 0 ? '-ml-2' : ''}>
          <Avatar user={u} size="sm" ring />
        </div>
      ))}
      {overflow > 0 && (
        <div className="-ml-2 w-7 h-7 rounded-full bg-white/10 ring-2 ring-[#0d0d14] flex items-center justify-center text-[9px] font-bold text-gray-400">
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [projects, setProjects]           = useState<Project[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editProject, setEditProject]     = useState<Project | null>(null);
  const [form, setForm]                   = useState({ title: '', description: '', status: 'active' });
  const [submitting, setSubmitting]       = useState(false);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = io('http://localhost:5000');
    socket.emit('joinUser', user.id);

    socket.on('projectAdded', () => {
      fetchProjects();
    });

    socket.on('projectRemoved', (data: { projectId: string }) => {
      fetchProjects();
      setSelectedTeamProject(prev => {
        if (prev && prev.id === data.projectId) {
          setIsTeamModalOpen(false);
          return null;
        }
        return prev;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Team management states
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeamProject, setSelectedTeamProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Handle user search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/user/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleAddMember = async (targetUserId: string) => {
    if (!selectedTeamProject) return;
    try {
      await api.post(`/projects/${selectedTeamProject.id}/members`, { userId: targetUserId, role: 'member' });
      const res = await api.get('/projects?page=1&limit=50');
      const updatedProjects = res.data.data || res.data;
      setProjects(updatedProjects);
      const updatedProj = updatedProjects.find((p: Project) => p.id === selectedTeamProject.id);
      if (updatedProj) setSelectedTeamProject(updatedProj);
      setSearchQuery('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!selectedTeamProject) return;
    try {
      await api.delete(`/projects/${selectedTeamProject.id}/members/${memberUserId}`);
      const res = await api.get('/projects?page=1&limit=50');
      const updatedProjects = res.data.data || res.data;
      setProjects(updatedProjects);
      const updatedProj = updatedProjects.find((p: Project) => p.id === selectedTeamProject.id);
      if (updatedProj) setSelectedTeamProject(updatedProj);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects?page=1&limit=50');
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
    e.preventDefault(); e.stopPropagation();
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

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-gray-500 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} · Click any card to open its Kanban board
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(120,119,198,0.3)] transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* ── Search ── */}
      {projects.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm"
          />
        </div>
      )}

      {/* ── Grid ── */}
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
          {filtered.map(project => {
            const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;

            // Build flat member list: owner first, then members
            const allMembers: Array<{ id: string; username: string; avatar: string | null }> = [
              ...(project.owner ? [project.owner] : []),
              ...(project.members?.map(m => m.user) ?? []),
            ];

            return (
              <Link
                key={project.id}
                href={`/user_features/projects/${project.id}`}
                className="group relative flex flex-col rounded-2xl bg-[#0d0d14] border border-white/[0.07] hover:border-purple-500/30 transition-all duration-300 overflow-hidden shadow-md hover:shadow-purple-500/10 hover:shadow-xl"
              >
                {/* Gradient accent bar on hover */}
                <div className="h-[2px] w-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* ── Card body ── */}
                <div className="flex flex-col flex-1 p-5 pb-4">

                  {/* Top row: folder icon + status + edit/delete */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/15 transition-colors">
                        <FolderKanban className="w-5 h-5 text-purple-400" />
                      </div>
                      {/* Status badge */}
                      <span className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold border capitalize flex items-center gap-1.5 ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Edit / Delete / Manage Team – reveal on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {project.owner?.id === user?.id && (
                        <button
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedTeamProject(project);
                            setIsTeamModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                          title="Manage team"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={e => openEdit(e, project)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        title="Edit project"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(project); }}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-sm line-clamp-3 flex-1 leading-relaxed min-h-[3.75rem]">
                    {project.description || 'No description. Click to open Kanban board.'}
                  </p>
                </div>

                {/* ── Card footer ── */}
                <div className="px-5 py-3.5 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  {/* Left: member avatars */}
                  <div className="flex items-center gap-2">
                    <AvatarStack members={allMembers} max={5} />
                    {project.owner?.id === user?.id && (
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedTeamProject(project);
                          setIsTeamModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-purple-500/20 border border-dashed border-white/20 flex items-center justify-center text-gray-400 hover:text-purple-400 transition-all"
                        title="Manage Team"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Right: task count + date + arrow */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 flex-shrink-0">
                    <span className="flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5" />
                      {project._count.tasks}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-gray-700 group-hover:text-purple-400 transition-colors group-hover:translate-x-0.5 duration-150 inline-flex">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
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

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#111] border border-red-500/20 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Delete Project</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Delete <strong className="text-white">&quot;{confirmDelete.title}&quot;</strong>? All {confirmDelete._count.tasks} task{confirmDelete._count.tasks !== 1 ? 's' : ''} inside will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
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

      {/* Team Management Modal */}
      {isTeamModalOpen && selectedTeamProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsTeamModalOpen(false)}>
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" /> Manage Team
              </h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Search input */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Search Users by Username or Email</label>
                <input 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  placeholder="Type username or email..." 
                />
              </div>

              {/* Search Results */}
              {searchQuery.trim().length > 0 && (
                <div className="bg-white/5 rounded-2xl p-2 border border-white/5 max-h-40 overflow-y-auto">
                  {searching ? (
                    <div className="flex items-center justify-center py-4 text-xs text-gray-400 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500">No users found.</div>
                  ) : (
                    searchResults.map(u => {
                      const isAlreadyMember = selectedTeamProject.members?.some(m => m.userId === u.id) || selectedTeamProject.owner?.id === u.id;
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={u.avatar.startsWith('http') ? u.avatar : `http://localhost:5000${u.avatar}`}
                                alt={u.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                                {u.username[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate text-white">{u.username}</p>
                              <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          {isAlreadyMember ? (
                            <span className="text-[10px] px-2.5 py-1 bg-white/10 rounded-lg text-gray-400 font-medium">
                              {selectedTeamProject.owner?.id === u.id ? 'Owner' : 'Member'}
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleAddMember(u.id)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Active Members list */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Project Roster</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      {selectedTeamProject.owner?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={selectedTeamProject.owner.avatar.startsWith('http') ? selectedTeamProject.owner.avatar : `http://localhost:5000${selectedTeamProject.owner.avatar}`}
                          alt={selectedTeamProject.owner.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 flex items-center justify-center text-xs font-black text-white">
                          {selectedTeamProject.owner?.username?.[0]?.toUpperCase() || 'O'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                          {selectedTeamProject.owner?.username} <Shield className="w-3.5 h-3.5 text-yellow-500" />
                        </p>
                        <p className="text-[11px] text-gray-400">{selectedTeamProject.owner?.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md font-semibold">Owner</span>
                  </div>

                  {/* Members */}
                  {(!selectedTeamProject.members || selectedTeamProject.members.length === 0) ? (
                    <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
                      No other team members added yet.
                    </div>
                  ) : (
                    selectedTeamProject.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          {m.user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={m.user.avatar.startsWith('http') ? m.user.avatar : `http://localhost:5000${m.user.avatar}`}
                              alt={m.user.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                              {m.user.username[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">{m.user.username}</p>
                            <p className="text-[11px] text-gray-400">{m.user.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveMember(m.user.id)}
                          className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Remove Member"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}