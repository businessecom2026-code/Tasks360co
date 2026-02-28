import { Plus } from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../../stores/useTaskStore';

interface Props {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
  onAddTask?: () => void;
  onEditTask?: (task: Task) => void;
}

export function KanbanColumn({ status, title, tasks, color, onAddTask, onEditTask }: Props) {
  const { moveTask } = useTaskStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-gray-800/50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-gray-800/50');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-800/50');
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      moveTask(taskId, status);
    }
  };

  return (
    <div
      className="flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-xl bg-gray-900 border border-gray-800 transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="text-gray-500 hover:text-white transition-colors"
            title="Adicionar tarefa"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} />
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-xs text-gray-600 py-8">
            Arraste tarefas para cá
          </p>
        )}
      </div>
    </div>
  );
}
