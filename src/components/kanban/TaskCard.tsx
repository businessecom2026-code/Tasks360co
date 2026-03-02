import { Calendar, Loader2, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { Task } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';

interface Props {
  task: Task;
  onEdit?: (task: Task) => void;
  isDone?: boolean;
}

export function TaskCard({ task, onEdit, isDone }: Props) {
  const { deleteTask, syncingTaskIds } = useTaskStore();
  const isSyncing = syncingTaskIds.has(task.id);

  const colorMap: Record<string, string> = {
    red: 'border-l-red-500',
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500',
  };

  const borderColor = task.color ? (colorMap[task.color] || 'border-l-gray-600') : 'border-l-blue-500';

  return (
    <div
      className={`group relative bg-gray-800 rounded-lg border border-l-4 ${borderColor} p-3 cursor-pointer hover:bg-gray-750 transition-all ${
        isSyncing ? 'opacity-60 pointer-events-none' : ''
      } ${isDone ? 'animate-task-done border-green-700/50' : 'border-gray-700'}`}
      onClick={() => onEdit?.(task)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
      }}
    >
      {/* Sync indicator */}
      {isSyncing && (
        <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center z-10">
          <Loader2 size={20} className="animate-spin text-blue-400" />
        </div>
      )}

      {/* Google sync badge */}
      {task.googleTaskId && (
        <div className="absolute top-2 right-2">
          <RefreshCw size={12} className="text-green-500" />
        </div>
      )}

      {/* Done checkmark */}
      {isDone && !task.googleTaskId && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 size={14} className="text-green-500" />
        </div>
      )}

      <h4 className={`text-sm font-medium pr-6 mb-1 ${isDone ? 'text-green-100' : 'text-white'}`}>{task.title}</h4>

      {task.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={10} />
              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
            </span>
          )}

          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white font-bold"
              title={task.assignee.name}
            >
              {task.assignee.name.charAt(0)}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteTask(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Version indicator for sync */}
      {task.version > 1 && (
        <span className="text-[10px] text-gray-600 mt-1 block">v{task.version}</span>
      )}
    </div>
  );
}
