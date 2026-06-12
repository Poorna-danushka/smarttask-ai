import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import TaskCard, { Task } from './TaskCard';

export const COLUMNS = ['Todo', 'In Progress', 'Review', 'Completed'];

export const COLUMN_COLORS: Record<string, string> = {
  'Todo': 'border-gray-500/30',
  'In Progress': 'border-blue-500/30',
  'Review': 'border-yellow-500/30',
  'Completed': 'border-green-500/30',
};

export const COLUMN_HEADER_COLORS: Record<string, string> = {
  'Todo': 'text-gray-400',
  'In Progress': 'text-blue-400',
  'Review': 'text-yellow-400',
  'Completed': 'text-green-400',
};

interface KanbanColumnProps {
  status: string;
  tasks: Task[];
  onDelete: (id: string, e: React.MouseEvent) => void;
  onAddTask: (status: string) => void;
  onTaskClick: (task: Task) => void;
  onMoveForward?: (taskId: string, nextStatus: string, e: React.MouseEvent) => void;
}

export default function KanbanColumn({ status, tasks, onDelete, onAddTask, onTaskClick, onMoveForward }: KanbanColumnProps) {
  const taskIds = tasks.map(t => t.id);
  
  return (
    <div className={`flex flex-col min-w-[280px] max-w-[280px] bg-white/3 border rounded-2xl p-4 ${COLUMN_COLORS[status]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${COLUMN_HEADER_COLORS[status]}`}>{status}</span>
          <span className="text-xs bg-white/10 text-gray-400 rounded-full px-2 py-0.5">{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 min-h-[100px]">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onDelete={onDelete} onClick={onTaskClick} onMoveForward={onMoveForward} />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-8 border-2 border-dashed border-white/5 rounded-xl">
              <p className="text-xs text-gray-600">No tasks here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
