import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Paperclip, Trash2 } from 'lucide-react';

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  attachments?: Attachment[];
}

export const PRIORITY_COLORS: Record<string, string> = {
  Low: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  High: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Urgent: 'text-red-400 bg-red-400/10 border-red-400/20',
};

interface TaskCardProps {
  task: Task;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, onDelete, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} onClick={() => onClick(task)} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8 transition-all cursor-pointer relative">
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="mt-0.5 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-snug mb-2 pr-6">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center flex-wrap gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium}`}>
              {task.priority}
            </span>
            {task.dueDate && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {task.attachments && task.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Paperclip className="w-3 h-3" /> {task.attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={(e) => onDelete(task.id, e)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
