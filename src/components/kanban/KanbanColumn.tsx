import { useState, useEffect, useRef } from 'react';
import { Plus, PartyPopper } from 'lucide-react';
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

// ─── Confetti particle component ────────────────────────────────
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#22c55e', '#facc15', '#3b82f6', '#f472b6', '#a78bfa', '#fb923c', '#34d399'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const duration = 1.2 + Math.random() * 0.8;
  const size = 4 + Math.random() * 4;
  const rotation = Math.random() * 360;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-4px',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
        transform: `rotate(${rotation}deg)`,
        opacity: 0,
      }}
    />
  );
}

export function KanbanColumn({ status, title, tasks, color, onAddTask, onEditTask }: Props) {
  const { moveTask } = useTaskStore();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCountRef = useRef(tasks.length);

  // Detect when a new task arrives in the DONE column
  useEffect(() => {
    if (status === 'DONE' && tasks.length > prevCountRef.current) {
      setShowConfetti(true);
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        setShowCelebration(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = tasks.length;
  }, [tasks.length, status]);

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
      className={`flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-xl bg-gray-900 border transition-all duration-300 relative overflow-hidden ${
        showCelebration ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-gray-800'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color} ${showCelebration ? 'animate-ping' : ''}`} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <span className={`text-xs px-1.5 py-0.5 rounded-full transition-colors ${
            showCelebration ? 'bg-green-500/20 text-green-400' : 'text-gray-500 bg-gray-800'
          }`}>
            {tasks.length}
          </span>
          {showCelebration && (
            <PartyPopper size={14} className="text-yellow-400 animate-bounce" />
          )}
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="group/add relative flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-blue-500/25 hover:shadow-md"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="absolute -inset-1 rounded-xl bg-blue-500/20 animate-pulse group-hover/add:bg-transparent" />
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} isDone={status === 'DONE'} />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <p className="text-center text-xs text-gray-600">
              Arraste tarefas para cá
            </p>
            {onAddTask && (
              <button
                onClick={onAddTask}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus size={12} /> Nova tarefa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
