'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Loader2, ArrowLeft, Calendar, X, Trash2, Paperclip, Download, UploadCloud
} from 'lucide-react';
import api from '@/lib/axios';
import { io, Socket } from 'socket.io-client';
import TaskCard, { Task, PRIORITY_COLORS } from '@/components/kanban/TaskCard';
import KanbanColumn, { COLUMNS } from '@/components/kanban/KanbanColumn';

interface Project {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
}

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('Todo');
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'Todo' });
  const [creating, setCreating] = useState(false);

  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [uploading, setUploading] = useState(false);
  
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
      const res = await api.post('/tasks', { ...newTask, projectId: id, status: newTask.status || defaultStatus });
      setTasks(prev => [...prev, { ...res.data, attachments: [] }]);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', priority: 'Medium', dueDate: '', status: 'Todo' });
    } catch (err) {
      console.error('Create task failed', err);
    } finally {
      setCreating(false);
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

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  if (!project) return <div className="h-full flex items-center justify-center text-gray-400">Project not found.</div>;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
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
          onClick={() => { setDefaultStatus('Todo'); setNewTask(p => ({ ...p, status: 'Todo' })); setIsModalOpen(true); }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-[0_0_15px_rgba(120,119,198,0.3)] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Task
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
                onAddTask={(s) => { setDefaultStatus(s); setNewTask(p => ({ ...p, status: s })); setIsModalOpen(true); }}
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
                <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" placeholder="Task details..." />
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
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Due Date</label>
                <input type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingTask(null)}>
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
              
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div><span className="font-medium text-gray-500">Status:</span> {viewingTask.status}</div>
                {viewingTask.dueDate && <div><span className="font-medium text-gray-500">Due:</span> {new Date(viewingTask.dueDate).toLocaleDateString()}</div>}
              </div>

              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2"><Paperclip className="w-4 h-4" /> Attachments</h4>
                  <div>
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                    <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      Upload File
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  {(!viewingTask.attachments || viewingTask.attachments.length === 0) ? (
                    <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                      No attachments yet. Upload a file above.
                    </div>
                  ) : (
                    viewingTask.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium truncate">{att.fileName}</span>
                        </div>
                        <a href={`http://localhost:5000${att.fileUrl}`} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                        </a>
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
