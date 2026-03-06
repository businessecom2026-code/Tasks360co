import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Calendar,
  Flag,
  ArrowUpDown,
  Plus,
} from 'lucide-react';
import type { Task, TaskStatus, TaskLabel } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';

interface Props {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; order: number }> = {
  PENDING: { label: 'Pendente', color: 'text-yellow-400', bg: 'bg-yellow-500/15', order: 0 },
  IN_PROGRESS: { label: 'Em Progresso', color: 'text-blue-400', bg: 'bg-blue-500/15', order: 1 },
  REVIEW: { label: 'Revisao', color: 'text-purple-400', bg: 'bg-purple-500/15', order: 2 },
  DONE: { label: 'Concluido', color: 'text-emerald-400', bg: 'bg-emerald-500/15', order: 3 },
};

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  URGENT: { icon: '🔴', color: 'text-red-400', label: 'Urgente' },
  HIGH: { icon: '🟠', color: 'text-orange-400', label: 'Alta' },
  MEDIUM: { icon: '🟡', color: 'text-yellow-400', label: 'Media' },
  LOW: { icon: '🟢', color: 'text-emerald-400', label: 'Baixa' },
};

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

function getDueDateDisplay(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d atrasado`, color: 'text-red-400 bg-red-500/10' };
  if (diffDays === 0) return { text: 'Hoje', color: 'text-orange-400 bg-orange-500/10' };
  if (diffDays === 1) return { text: 'Amanha', color: 'text-yellow-400 bg-yellow-500/10' };
  if (diffDays <= 7) return { text: `${diffDays}d`, color: 'text-slate-300 bg-slate-700/50' };
  return { text: new Date(dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), color: 'text-slate-400 bg-slate-800/50' };
}

export function ListView({ tasks, onEditTask }: Props) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE']));
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'none'>('status');
  const { addTask } = useTaskStore();
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'status':
          return dir * (STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order);
        case 'priority': {
          const pa = PRIORITY_ORDER[a.priority || 'LOW'] ?? 4;
          const pb = PRIORITY_ORDER[b.priority || 'LOW'] ?? 4;
          return dir * (pa - pb);
        }
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dir * (da - db);
        }
        case 'assignee':
          return dir * (a.assignee?.name || '').localeCompare(b.assignee?.name || '');
        case 'createdAt':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        default:
          return 0;
      }
    });
  }, [tasks, sortField, sortDir]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: 'Todas as tarefas', tasks: sortedTasks }];

    if (groupBy === 'status') {
      return (['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[]).map((status) => ({
        key: status,
        label: STATUS_CONFIG[status].label,
        color: STATUS_CONFIG[status].color,
        tasks: sortedTasks.filter((t) => t.status === status),
      }));
    }

    // Group by priority
    return (['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as string[]).map((p) => ({
      key: p,
      label: p === 'NONE' ? 'Sem prioridade' : PRIORITY_CONFIG[p]?.label || p,
      tasks: sortedTasks.filter((t) => (p === 'NONE' ? !t.priority : t.priority === p)),
    }));
  }, [sortedTasks, groupBy]);

  const toggleGroup = (key: string) => {
    const next = new Set(expandedGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedGroups(next);
  };

  const handleQuickAdd = async (status: TaskStatus) => {
    if (!quickAddTitle.trim()) return;
    await addTask({ title: quickAddTitle.trim(), status });
    setQuickAddTitle('');
    setQuickAddStatus(null);
  };

  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium text-slate-500 hover:text-slate-300 transition-colors ${className}`}
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ArrowUpDown size={10} className="opacity-30" />
      )}
    </button>
  );

  return (
    <div className="flex-1 overflow-auto p-4">
      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-slate-500">Agrupar por:</span>
        {(['status', 'priority', 'none'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGroupBy(g)}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              groupBy === g ? 'bg-emerald-600/20 text-emerald-400 font-medium' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {g === 'status' ? 'Status' : g === 'priority' ? 'Prioridade' : 'Nenhum'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800/80 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_100px_120px_100px_80px] gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-slate-800/60 bg-gray-50 dark:bg-slate-900/80">
          <SortHeader field="title" label="Titulo" />
          <SortHeader field="status" label="Status" />
          <SortHeader field="priority" label="Prioridade" />
          <SortHeader field="assignee" label="Responsavel" />
          <SortHeader field="dueDate" label="Data" />
          <span className="text-[11px] uppercase tracking-wider font-medium text-slate-500">Labels</span>
        </div>

        {/* Groups */}
        {groupedTasks.map((group) => (
          <div key={group.key}>
            {/* Group header */}
            {groupBy !== 'none' && (
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800/40 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors border-b border-gray-200 dark:border-slate-800/40"
              >
                {expandedGroups.has(group.key) ? (
                  <ChevronDown size={14} className="text-slate-500" />
                ) : (
                  <ChevronRight size={14} className="text-slate-500" />
                )}
                <span className={`text-xs font-semibold ${'color' in group ? group.color : 'text-slate-300'}`}>
                  {group.label}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-600 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {group.tasks.length}
                </span>
              </button>
            )}

            {/* Rows */}
            {expandedGroups.has(group.key) && group.tasks.map((task) => {
              const labels = (task.labels || []) as TaskLabel[];
              const dueDateInfo = task.dueDate ? getDueDateDisplay(task.dueDate) : null;
              const priorityInfo = task.priority ? PRIORITY_CONFIG[task.priority] : null;

              return (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="grid grid-cols-[1fr_120px_100px_120px_100px_80px] gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-slate-800/30 hover:bg-gray-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group"
                >
                  {/* Title */}
                  <div className="flex items-center gap-2 min-w-0">
                    {task.color && (
                      <div className={`w-1 h-6 rounded-full bg-${task.color}-500 flex-shrink-0`} />
                    )}
                    <span className={`text-sm truncate ${task.status === 'DONE' ? 'text-gray-400 dark:text-slate-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {task.title}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CONFIG[task.status].bg} ${STATUS_CONFIG[task.status].color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[task.status].color.replace('text-', 'bg-')}`} />
                      {STATUS_CONFIG[task.status].label}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center">
                    {priorityInfo ? (
                      <span className={`flex items-center gap-1 text-xs ${priorityInfo.color}`}>
                        <span>{priorityInfo.icon}</span>
                        {priorityInfo.label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-300 truncate">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>

                  {/* Due date */}
                  <div className="flex items-center">
                    {dueDateInfo ? (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${dueDateInfo.color}`}>
                        <Calendar size={10} />
                        {dueDateInfo.text}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </div>

                  {/* Labels */}
                  <div className="flex items-center gap-1 overflow-hidden">
                    {labels.slice(0, 2).map((label, i) => {
                      const colors = LABEL_COLORS[label.color] || LABEL_COLORS.blue;
                      return (
                        <span key={i} className={`w-3 h-3 rounded-sm ${colors.dot}`} title={label.name} />
                      );
                    })}
                    {labels.length > 2 && (
                      <span className="text-[9px] text-slate-500">+{labels.length - 2}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Quick add row for status groups */}
            {groupBy === 'status' && expandedGroups.has(group.key) && (
              <>
                {quickAddStatus === group.key ? (
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-slate-800/30 bg-gray-50 dark:bg-slate-800/20">
                    <input
                      type="text"
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd(group.key as TaskStatus);
                        if (e.key === 'Escape') { setQuickAddStatus(null); setQuickAddTitle(''); }
                      }}
                      placeholder="Titulo da nova tarefa..."
                      className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 border-none focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleQuickAdd(group.key as TaskStatus)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => { setQuickAddStatus(null); setQuickAddTitle(''); }}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setQuickAddStatus(group.key as TaskStatus)}
                    className="w-full flex items-center gap-1.5 px-4 py-1.5 text-xs text-gray-500 dark:text-slate-500 hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-all border-b border-gray-100 dark:border-slate-800/30"
                  >
                    <Plus size={12} /> Nova tarefa
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              <Flag size={20} className="text-gray-400 dark:text-slate-600" />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-500">Nenhuma tarefa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
