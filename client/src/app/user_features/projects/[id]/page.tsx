'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Loader2, ArrowLeft, Calendar, X, Trash2, Paperclip, Download, UploadCloud,
  Users, UserPlus, FileText, Shield, UserX
} from 'lucide-react';
import api from '@/lib/axios';
import { io, Socket } from 'socket.io-client';
import TaskCard, { Task, PRIORITY_COLORS } from '@/components/kanban/TaskCard';
import KanbanColumn, { COLUMNS } from '@/components/kanban/KanbanColumn';

interface ProjectMember {
  id: string;
  projectId: string;
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
  ownerId: string;
  owner: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
  members: ProjectMember[];
  tasks: Task[];
}

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('Todo');
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'Todo', assignedTo: '' });
  const [creating, setCreating] = useState(false);

  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Team management states
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    // Initialize WebSockets
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    if (id) {
      socket.emit('joinProject', id);
      
      socket.on('taskChanged', (data: { taskId: string, status: string }) => {
        setTasks(prev => prev.map(t => t.id === data.taskId ? { ...t, status: data.status } : t));
      });
      
      fetchProject();
    }

    return () => {
      socket.disconnect();
    };
  }, [id]);

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

  const fetchProject = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks/project/${id}`),
      ]);
      setProject(projRes.data);
      
      // Fetch attachments for all tasks concurrently to display counts
      const tasksWithAttachments = await Promise.all(taskRes.data.map(async (t: any) => {
        try {
          const attRes = await api.get(`/uploads/task/${t.id}`);
          return { ...t, attachments: attRes.data };
        } catch {
          return { ...t, attachments: [] };
        }
      }));
      setTasks(tasksWithAttachments);
      
    } catch (error) {
      console.error('Error fetching project', error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = COLUMNS.find(col => col === over.id) || tasks.find(t => t.id === over.id)?.status;

    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        // Optimistic UI update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        
        // Notify others via socket
        socketRef.current?.emit('taskUpdated', { projectId: id, taskId, status: newStatus });
        
        // Persist
        await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      }
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await api.delete(`/tasks/${taskId}`);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/tasks', { 
        ...newTask, 
        projectId: id, 
        status: newTask.status || defaultStatus,
        assignedTo: newTask.assignedTo || null
      });
      setTasks(prev => [...prev, { ...res.data, attachments: [] }]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'Todo', assignedTo: '' });
    } catch (err) {
      console.error('Create task failed', err);
    } finally {
      setCreating(false);
    }
  };

  const handleAssigneeChange = async (assignedToId: string) => {
    if (!viewingTask) return;
    try {
      const res = await api.put(`/tasks/${viewingTask.id}`, {
        title: viewingTask.title,
        description: viewingTask.description,
        status: viewingTask.status,
        priority: viewingTask.priority,
        dueDate: viewingTask.dueDate,
        assignedTo: assignedToId || null
      });
      const updatedTask = res.data;
      
      // Update state
      setTasks(prev => prev.map(t => t.id === viewingTask.id ? { ...t, assignee: updatedTask.assignee, assignedTo: updatedTask.assignedTo } : t));
      setViewingTask(prev => prev ? { ...prev, assignee: updatedTask.assignee, assignedTo: updatedTask.assignedTo } : null);
    } catch (err) {
      console.error('Failed to update task assignee', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !viewingTask) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      const res = await api.post(`/uploads/task/${viewingTask.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newAttachment = res.data;
      
      // Update local state
      setTasks(prev => prev.map(t => {
        if (t.id === viewingTask.id) {
          const updated = { ...t, attachments: [...(t.attachments || []), newAttachment] };
          setViewingTask(updated);
          return updated;
        }
        return t;
      }));
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleAddMember = async (targetUserId: string) => {
    try {
      await api.post(`/projects/${id}/members`, { userId: targetUserId, role: 'member' });
      await fetchProject();
      setSearchQuery('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    try {
      await api.delete(`/projects/${id}/members/${memberUserId}`);
      await fetchProject();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const isImage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) : false;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (ext === 'txt') return <FileText className="w-4 h-4 text-blue-400" />;
    return <Paperclip className="w-4 h-4 text-purple-400" />;
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  if (!project) return <div className="h-full flex items-center justify-center text-gray-400">Project not found.</div>;

  const isOwner = project.ownerId === user?.id;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/projects')} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{project.title}</h2>
            {project.description && <p className="text-gray-400 text-sm mt-1">{project.description}</p>}
          </div>
        </div>
        
        {/* Team Collaboration section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 px-3">
            <span className="text-xs text-gray-500 font-medium mr-3 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Team:
            </span>
            <div className="flex items-center">
              {/* Owner Avatar */}
              <div 
                className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 flex items-center justify-center text-[10px] font-black text-white ring-2 ring-black cursor-help" 
                title={`Project Owner: ${project.owner?.username}`}
              >
                {project.owner?.username?.[0]?.toUpperCase() || 'O'}
              </div>
              
              {/* Members Avatars */}
              {project.members?.map((m) => (
                <div 
                  key={m.id} 
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-black -ml-1.5 cursor-help" 
                  title={`Team Member: ${m.user.username}`}
                >
                  {m.user.username[0].toUpperCase()}
                </div>
              ))}

              {/* Manage team button */}
              {isOwner && (
                <button 
                  onClick={() => setIsTeamModalOpen(true)} 
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-dashed border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all -ml-1.5"
                  title="Manage Team Members"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={() => { setDefaultStatus('Todo'); setNewTask(p => ({ ...p, status: 'Todo', assignedTo: '' })); setIsModalOpen(true); }}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(120,119,198,0.3)] transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full min-h-[500px]">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col}
                status={col}
                tasks={getTasksByStatus(col)}
                onDelete={handleDeleteTask}
                onAddTask={(s) => { setDefaultStatus(s); setNewTask(p => ({ ...p, status: s, assignedTo: '' })); setIsModalOpen(true); }}
                onTaskClick={(t) => setViewingTask(t)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="p-4 rounded-xl bg-[#1a1a2e] border border-purple-500/30 shadow-2xl rotate-2 opacity-90">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Team Management Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsTeamModalOpen(false)}>
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                      const isAlreadyMember = project.members.some(m => m.userId === u.id);
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                              {u.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate text-white">{u.username}</p>
                              <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          {isAlreadyMember ? (
                            <span className="text-[10px] px-2.5 py-1 bg-white/10 rounded-lg text-gray-400 font-medium">Member</span>
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-500 flex items-center justify-center text-xs font-black text-white">
                        {project.owner?.username?.[0]?.toUpperCase() || 'O'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                          {project.owner?.username} <Shield className="w-3.5 h-3.5 text-yellow-500" />
                        </p>
                        <p className="text-[11px] text-gray-400">{project.owner?.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-md font-semibold">Owner</span>
                  </div>

                  {/* Members */}
                  {project.members?.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500 border border-dashed border-white/5 rounded-xl">
                      No other team members added yet.
                    </div>
                  ) : (
                    project.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                            {m.user.username[0].toUpperCase()}
                          </div>
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

      {/* Task Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Task Title *</label>
                <input required value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" placeholder="e.g. Fix login bug" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" placeholder="Task details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Status</label>
                  <select value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                    {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Due Date</label>
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Assignee</label>
                  <select value={newTask.assignedTo} onChange={e => setNewTask(p => ({ ...p, assignedTo: e.target.value }))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                    <option value="">Unassigned</option>
                    {project.owner && <option value={project.owner.id}>{project.owner.username} (Owner)</option>}
                    {project.members?.map(m => (
                      <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task View/Upload Modal */}
      {viewingTask && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingTask(null)}>
          <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{viewingTask.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${PRIORITY_COLORS[viewingTask.priority] || PRIORITY_COLORS.Medium}`}>
                  {viewingTask.priority}
                </span>
              </div>
              <button onClick={() => setViewingTask(null)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {viewingTask.description && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Description</h4>
                  <p className="text-sm text-gray-300 bg-white/5 p-4 rounded-xl">{viewingTask.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block font-medium text-gray-500 mb-1">Status</span>
                  <div className="px-3 py-2 bg-white/5 rounded-lg text-gray-300 font-semibold">{viewingTask.status}</div>
                </div>
                <div>
                  <span className="block font-medium text-gray-500 mb-1">Due Date</span>
                  <div className="px-3 py-2 bg-white/5 rounded-lg text-gray-300 font-semibold">
                    {viewingTask.dueDate ? new Date(viewingTask.dueDate).toLocaleDateString() : 'No due date'}
                  </div>
                </div>
                <div>
                  <span className="block font-medium text-gray-500 mb-1">Assignee</span>
                  <select 
                    value={viewingTask.assignedTo || ''} 
                    onChange={e => handleAssigneeChange(e.target.value)} 
                    className="w-full px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  >
                    <option value="">Unassigned</option>
                    {project.owner && <option value={project.owner.id}>{project.owner.username} (Owner)</option>}
                    {project.members?.map(m => (
                      <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2"><Paperclip className="w-4 h-4 text-purple-400" /> Attachments</h4>
                  <div>
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                    <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      Upload File
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {(!viewingTask.attachments || viewingTask.attachments.length === 0) ? (
                    <div className="col-span-full text-center py-6 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                      No attachments yet. Upload a file above.
                    </div>
                  ) : (
                    viewingTask.attachments.map(att => {
                      const image = isImage(att.fileName);
                      return (
                        <div key={att.id} className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5 overflow-hidden hover:bg-white/10 transition-colors group">
                          {image && (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40 border border-white/5">
                              <img src={`http://localhost:5000${att.fileUrl}`} alt={att.fileName} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div className="p-1.5 bg-white/5 rounded-lg flex-shrink-0">
                                {getFileIcon(att.fileName)}
                              </div>
                              <span className="text-xs font-medium truncate text-gray-300" title={att.fileName}>{att.fileName}</span>
                            </div>
                            <a href={`http://localhost:5000${att.fileUrl}`} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })
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
