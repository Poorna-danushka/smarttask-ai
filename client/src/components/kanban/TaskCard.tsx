import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Paperclip, Trash2 } from 'lucide-react';
import { getAvatarUrl } from '@/lib/config';

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
  assignedTo?: string | null;
  assignee?: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  } | null;
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
  onMoveForward?: (taskId: string, nextStatus: string, e: React.MouseEvent) => void;
}

export default function TaskCard({ task, onDelete, onClick, onMoveForward }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  let nextStatus = '';
  let buttonLabel = '';
  let buttonStyle = '';
  let isActionable = false;

  if (task.status === 'Todo') {
    nextStatus = 'In Progress';
    buttonLabel = 'Start Task';
    buttonStyle = 'bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 border-blue-500/20 hover:border-blue-500/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]';
    isActionable = true;
  } else if (task.status === 'In Progress') {
    nextStatus = 'Review';
    buttonLabel = 'Submit for Review';
    buttonStyle = 'bg-yellow-500/5 hover:bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:border-yellow-500/40 hover:shadow-[0_0_12px_rgba(234,179,8,0.15)]';
    isActionable = true;
  } else if (task.status === 'Review') {
    nextStatus = 'Completed';
    buttonLabel = 'Approve & Complete';
    buttonStyle = 'bg-green-500/5 hover:bg-green-500/15 text-green-400 border-green-500/20 hover:border-green-500/40 hover:shadow-[0_0_12px_rgba(34,197,94,0.2)]';
    isActionable = true;
  } else if (task.status === 'Completed') {
    buttonLabel = 'Completed ✓';
    buttonStyle = 'bg-green-500/5 text-green-500/40 border-green-500/10 cursor-default select-none pointer-events-none';
    isActionable = false;
  }

  return (
    <div ref={setNodeRef} style={style} onClick={() => onClick(task)} className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer relative shadow-lg hover:shadow-xl">
      <div className="flex items-start gap-2.5">
        <div {...attributes} {...listeners} className="mt-0.5 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white leading-snug mb-1.5 pr-6 group-hover:text-purple-300 transition-colors">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-gray-500 mb-3.5 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          
          {/* Metadata Row */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wide uppercase ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium}`}>
                {task.priority}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
              {task.attachments && task.attachments.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Paperclip className="w-3.5 h-3.5 text-gray-500" /> {task.attachments.length}
                </span>
              )}
            </div>

            {task.assignee && (
              task.assignee.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getAvatarUrl(task.assignee.avatar)}
                  alt={task.assignee.username}
                  title={`Assigned to ${task.assignee.username}`}
                  className="w-6 h-6 rounded-full object-cover shadow-md ring-1 ring-black flex-shrink-0 ml-2"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md flex-shrink-0 ml-2" title={`Assigned to ${task.assignee.username}`}>
                  {task.assignee.username[0].toUpperCase()}
                </div>
              )
            )}
          </div>

          {/* Action Row */}
          {buttonLabel && (
            isActionable && onMoveForward ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveForward(task.id, nextStatus, e);
                }}
                className={`w-full mt-3 px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${buttonStyle}`}
              >
                {buttonLabel}
              </button>
            ) : (
              <div
                className={`w-full mt-3 px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 ${buttonStyle}`}
              >
                {buttonLabel}
              </div>
            )
          )}
        </div>
      </div>
      <button
        onClick={(e) => onDelete(task.id, e)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
