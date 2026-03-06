import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Calendar,
  Loader2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  CheckSquare,
  Clock,
  Flag,
  GripVertical,
  Paperclip,
} from 'lucide-react';
import type { Task, TaskLabel, TaskPriority } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';

interface Props {
  task: Task;
  onEdit?: (task: Task) => void;
  isDone?: boolean;
  isOverlay?: boolean;
}

const LABEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  red: { bg: 'bg-red-500/20', text: 'text-red-300', dot: 'bg-red-500' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-500' },
  green: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-500' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-500' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-300', dot: 'bg-pink-500' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-300', dot: 'bg-teal-500' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { icon: string; color: string; label: string }> = {
  URGENT: { icon: '🔴', color: 'text-red-400', label: 'Urgente' },
  HIGH: { icon: '🟠', color: 'text-orange-400', label: 'Alta' },
  MEDIUM: { icon: '🟡', color: 'text-yellow-400', label: 'Média' },
  LOW: { icon: '🟢', color: 'text-emerald-400', label: 'Baixa' },
};

function getDueDateStatus(dueDate: string): 'overdue' | 'soon' | 'normal' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'soon';
  return 'normal';
}

const DUE_DATE_STYLES = {
  overdue: 'bg-red-500/20 text-red-400',
  soon: 'bg-yellow-500/20 text-yellow-400',
  normal: 'bg-slate-700/50 text-slate-400',
};

function LabelPill({ label }: { label: TaskLabel }) {
  const colors = LABEL_COLORS[label.color] || LABEL_COLORS.blue;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {label.name}
    </span>
  );
}

export const TaskCard = memo(function TaskCard({ task, onEdit, isDone, isOverlay }: Props) {
  const { deleteTask, syncingTaskIds } = useTaskStore();
  const isSyncing = syncingTaskIds.has(task.id);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isOverlay,
  });

  const dueDateStatus = task.dueDate ? getDueDateStatus(task.dueDate) : null;
  const labels = (task.labels || []) as TaskLabel[];
  const priority = task.priority as TaskPriority | undefined;
  const checklist = task.checklist || [];
  const checkDone = checklist.filter(i => i.checked).length;
  const checkTotal = checklist.length;
  const attachmentCount = task.attachments?.length ?? 0;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      className={`
        group relative rounded-lg border transition-all duration-200 cursor-pointer
        ${isOverlay
          ? 'bg-slate-800 border-emerald-500/50 shadow-2xl shadow-emerald-500/20 rotate-2 scale-105'
          : isDragging
            ? 'opacity-30 border-dashed border-slate-600 bg-slate-900'
            : isDone
              ? 'animate-task-done bg-slate-800/80 border-emerald-700/30 hover:border-emerald-600/50'
              : 'bg-slate-800 border-slate-700/50 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/50'
        }
        ${isSyncing ? 'opacity-60 pointer-events-none' : ''}
      `}
      onClick={() => !isDragging && onEdit?.(task)}
    >
      {/* Cover color */}
      {task.coverColor && (
        <div
          className="h-8 rounded-t-lg"
          style={{ backgroundColor: task.coverColor }}
        />
      )}

      {/* Drag handle + card content wrapper */}
      <div className="flex">
        {/* Drag handle */}
        {!isOverlay && (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 w-6 flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          >
            <GripVertical size={14} className="text-slate-400" />
          </div>
        )}

        <div className="flex-1 p-3 min-w-0">
          {/* Cover image */}
          {task.image && (
            <div className="mb-2 -mt-1 -mx-1 rounded-md overflow-hidden">
              <img src={task.image} alt="" className="w-full h-32 object-cover" />
            </div>
          )}

          {/* Labels row */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {labels.map((label, i) => (
                <LabelPill key={i} label={label} />
              ))}
            </div>
          )}

          {/* Title */}
          <h4 className={`text-sm font-medium leading-snug mb-1 ${isDone ? 'text-emerald-100 line-through decoration-emerald-500/40' : 'text-white'}`}>
            {task.title}
          </h4>

          {/* Description preview */}
          {task.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">{task.description}</p>
          )}

          {/* Badges row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Priority badge */}
              {priority && PRIORITY_CONFIG[priority] && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${PRIORITY_CONFIG[priority].color}`} title={PRIORITY_CONFIG[priority].label}>
                  <Flag size={10} />
                  {PRIORITY_CONFIG[priority].label}
                </span>
              )}

              {/* Due date badge */}
              {task.dueDate && dueDateStatus && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${DUE_DATE_STYLES[dueDateStatus]}`}>
                  {dueDateStatus === 'overdue' ? <Clock size={10} /> : <Calendar size={10} />}
                  {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
              )}

              {/* Checklist progress badge */}
              {checkTotal > 0 && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  checkDone === checkTotal ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  <CheckSquare size={10} />
                  {checkDone}/{checkTotal}
                </span>
              )}

              {/* Attachment count badge */}
              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-400">
                  <Paperclip size={10} />
                  {attachmentCount}
                </span>
              )}

              {/* Google sync indicator */}
              {task.googleTaskId && (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-500" title="Sincronizado com Google Tasks">
                  <RefreshCw size={10} />
                </span>
              )}

              {/* Done checkmark */}
              {isDone && !task.googleTaskId && (
                <CheckCircle2 size={14} className="text-emerald-500" />
              )}
            </div>

            {/* Right side: avatar + actions */}
            <div className="flex items-center gap-1.5">
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-all rounded"
                title="Excluir"
              >
                <Trash2 size={12} />
              </button>

              {/* Assignee avatar */}
              {task.assignee && (
                <div
                  className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-slate-800"
                  title={task.assignee.name}
                >
                  {task.assignee.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sync spinner overlay */}
      {isSyncing && (
        <div className="absolute inset-0 bg-slate-900/60 rounded-lg flex items-center justify-center z-10 backdrop-blur-sm">
          <Loader2 size={20} className="animate-spin text-emerald-400" />
        </div>
      )}

      {/* Color accent bar */}
      {task.color && (
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg bg-${task.color}-500`} />
      )}
    </div>
  );
});
