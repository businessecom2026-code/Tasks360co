import { useState, useEffect, useRef, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, PartyPopper, X } from 'lucide-react';
import type { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../../stores/useTaskStore';
import { useLocaleStore } from '../../stores/useLocaleStore';

interface Props {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
  accentColor: string;
  onEditTask?: (task: Task) => void;
}

// ─── Confetti particle component ────────────────────────────────
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#10b981', '#facc15', '#3b82f6', '#f472b6', '#a78bfa', '#fb923c', '#34d399'];
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

export const KanbanColumn = memo(function KanbanColumn({ status, title, tasks, color, accentColor, onEditTask }: Props) {
  const { addTask } = useTaskStore();
  const { t } = useLocaleStore();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(tasks.length);

  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

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

  // Auto-focus the input when adding card
  useEffect(() => {
    if (isAddingCard && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingCard]);

  const handleQuickAdd = async () => {
    if (!newCardTitle.trim()) return;
    await addTask({
      title: newCardTitle.trim(),
      status,
    });
    setNewCardTitle('');
    setIsAddingCard(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-[290px] w-[290px] shrink-0 rounded-xl transition-all duration-300 relative
        ${isOver
          ? 'bg-gray-100 dark:bg-slate-800/80 border-2 border-dashed border-emerald-500/60 shadow-lg shadow-emerald-500/10 scale-[1.02]'
          : showCelebration
            ? 'bg-white dark:bg-slate-900/90 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : 'bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800/80'
        }
      `}
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color} ${showCelebration ? 'animate-ping' : ''}`} />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 tracking-wide">{title}</h3>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
            showCelebration
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-800/80'
          }`}>
            {tasks.length}
          </span>
          {showCelebration && (
            <PartyPopper size={14} className="text-yellow-400 animate-bounce" />
          )}
        </div>
        <button
          onClick={() => setIsAddingCard(true)}
          className={`flex items-center justify-center w-6 h-6 rounded-md ${accentColor} text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200`}
          title={t('kanban.column.addTask')}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Cards area - scrollable */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px] max-h-[calc(100vh-260px)] kanban-scroll">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEditTask} isDone={status === 'DONE'} />
        ))}

        {/* Inline quick add card */}
        {isAddingCard && (
          <div className="rounded-lg border border-emerald-500/30 bg-gray-50 dark:bg-slate-800/80 p-2 space-y-2 animate-slide-up">
            <input
              ref={inputRef}
              type="text"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickAdd();
                if (e.key === 'Escape') { setIsAddingCard(false); setNewCardTitle(''); }
              }}
              placeholder={t('kanban.column.quickAddPlaceholder')}
              className="w-full bg-transparent border-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickAdd}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors"
              >
                {t('kanban.column.addTaskTitle')}
              </button>
              <button
                onClick={() => { setIsAddingCard(false); setNewCardTitle(''); }}
                className="p-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {tasks.length === 0 && !isAddingCard && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className={`w-10 h-10 rounded-full ${color}/10 flex items-center justify-center mb-1`}>
              <Plus size={18} className="text-gray-400 dark:text-slate-500" />
            </div>
            <p className="text-center text-xs text-gray-400 dark:text-slate-600">
              {t('kanban.column.emptyDrop')}
            </p>
            <button
              onClick={() => setIsAddingCard(true)}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus size={12} /> {t('kanban.column.emptyAdd')}
            </button>
          </div>
        )}
      </div>

      {/* Bottom add card button (Trello-style) */}
      {!isAddingCard && tasks.length > 0 && (
        <button
          onClick={() => setIsAddingCard(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all border-t border-gray-200 dark:border-slate-800/40 rounded-b-xl"
        >
          <Plus size={14} /> {t('kanban.column.addTask')}
        </button>
      )}

      {/* Drop indicator overlay */}
      {isOver && (
        <div className="absolute inset-0 z-10 pointer-events-none rounded-xl border-2 border-emerald-400/40 bg-emerald-500/5" />
      )}
    </div>
  );
});
