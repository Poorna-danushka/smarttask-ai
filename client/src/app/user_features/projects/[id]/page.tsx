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
  FileText
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
  /** Error message shown below the Upload button — cleared on next upload attempt */
  const [uploadError, setUploadError] = useState<string | null>(null);


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

      socket.on('memberAdded', (newMember: ProjectMember) => {
        setProject(prev => {
          if (!prev) return null;
          if (prev.members.some(m => m.id === newMember.id)) return prev;
          return {
            ...prev,
            members: [...prev.members, newMember]
          };
        });
      });

      socket.on('memberRemoved', (data: { projectId: string, userId: string }) => {
        setProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            members: prev.members.filter(m => m.userId !== data.userId)
          };
        });
        setTasks(prev => prev.map(t => t.assignedTo === data.userId ? { ...t, assignedTo: null, assignee: null } : t));
        setViewingTask(prev => {
          if (prev && prev.assignedTo === data.userId) {
            return { ...prev, assignedTo: null, assignee: null };
          }
          return prev;
        });
      });
      
      fetchProject();
    }

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Keyboard shortcut to open New Task modal when pressing 'N'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.tagName === 'SELECT' || 
         activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setDefaultStatus('Todo');
        setNewTask(p => ({ ...p, status: 'Todo', assignedTo: '' }));
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleMoveTaskStatus = async (taskId: string, nextStatus: string) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    
    // Notify others via socket
    socketRef.current?.emit('taskUpdated', { projectId: id, taskId, status: nextStatus });
    
    try {
      // Persist
      await api.patch(`/tasks/${taskId}/status`, { status: nextStatus });
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!viewingTask) return;
    try {
      // Optimistic UI update
      setTasks(prev => prev.map(t => t.id === viewingTask.id ? { ...t, status: newStatus } : t));
      setViewingTask(prev => prev ? { ...prev, status: newStatus } : null);
      
      // Notify others via socket
      socketRef.current?.emit('taskUpdated', { projectId: id, taskId: viewingTask.id, status: newStatus });
      
      // Persist
      await api.patch(`/tasks/${viewingTask.id}/status`, { status: newStatus });
    } catch (err: any) {
      console.error('Failed to update task status', err?.response?.data || err);
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
      // Send only the assignedTo field — backend uses partial update
      const res = await api.put(`/tasks/${viewingTask.id}`, {
        assignedTo: assignedToId || null,
      });
      const updatedTask = res.data;
      
      // Update state
      setTasks(prev => prev.map(t => t.id === viewingTask.id ? { ...t, assignee: updatedTask.assignee, assignedTo: updatedTask.assignedTo } : t));
      setViewingTask(prev => prev ? { ...prev, assignee: updatedTask.assignee, assignedTo: updatedTask.assignedTo } : null);
    } catch (err: any) {
      console.error('Failed to update task assignee', err?.response?.data || err);
    }
  };

  // Allowed MIME types and their friendly label — must match server allowlist
  const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
    'image/jpeg': 'JPEG image',
    'image/png': 'PNG image',
    'image/gif': 'GIF image',
    'image/webp': 'WebP image',
    'application/pdf': 'PDF document',
    'text/plain': 'Plain text file',
    'application/msword': 'Word document (.doc)',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word document (.docx)',
    'application/vnd.ms-excel': 'Excel spreadsheet (.xls)',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel spreadsheet (.xlsx)',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !viewingTask) return;
    const file = e.target.files[0];
    setUploadError(null);

    // ── Client-side validation ─────────────────────────────────────────────────
    if (!ALLOWED_UPLOAD_TYPES[file.type]) {
      const allowed = 'JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX, XLS, XLSX';
      setUploadError(`"${file.name}" is not an allowed file type. Accepted: ${allowed}`);
      e.target.value = '';
      return;
    }
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`"${file.name}" exceeds the ${MAX_MB} MB size limit.`);
      e.target.value = '';
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      const res = await api.post(`/uploads/task/${viewingTask.id}`, formData);
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
    } catch (err: any) {
      // Surface the server's message (e.g. invalid file type, size limit)
      const serverMsg = err?.response?.data?.message;
      setUploadError(serverMsg || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/projects')} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">{project.title}</h2>
            {project.description && <p className="text-gray-400 text-sm mt-1">{project.description}</p>}
          </div>
        </div>
        
        <button
          onClick={() => { setDefaultStatus('Todo'); setNewTask(p => ({ ...p, status: 'Todo', assignedTo: '' })); setIsModalOpen(true); }}
          className="group relative flex items-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white rounded-xl font-semibold shadow-[0_0_15px_rgba(120,119,198,0.25)] hover:shadow-[0_0_22px_rgba(120,119,198,0.45)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 overflow-hidden"
          title="Create a new task (HotKey: N)"
        >
          {/* Sheen effect overlay */}
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <Plus className="w-4.5 h-4.5 text-white/90 group-hover:rotate-90 transition-transform duration-300 ease-out" />
          <span className="text-sm tracking-wide">New Task</span>
          <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 ml-1.5 text-[9px] font-bold text-white/50 bg-white/10 border border-white/10 rounded-md">
            N
          </kbd>
        </button>
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
                onMoveForward={handleMoveTaskStatus}
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
                    {project.members?.filter(m => m.userId !== project.ownerId).map(m => (
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
                  <select
                    value={viewingTask.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    className="w-full px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50 font-semibold"
                  >
                    {COLUMNS.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
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
                    {project.members?.filter(m => m.userId !== project.ownerId).map(m => (
                      <option key={m.user.id} value={m.user.id}>{m.user.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold flex items-center gap-2"><Paperclip className="w-4 h-4 text-purple-400" /> Attachments</h4>
                  <div>
                    {/* accept restricts the OS file picker to allowed types */}
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      disabled={uploading}
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleFileUpload}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors ${
                        uploading ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      {uploading ? 'Uploading…' : 'Upload File'}
                    </label>
                  </div>
                </div>

                {/* Upload error banner */}
                {uploadError && (
                  <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
                    <X
                      className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 cursor-pointer hover:text-red-200"
                      onClick={() => setUploadError(null)}
                    />
                    <span>{uploadError}</span>
                  </div>
                )}
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
