import { useState, useRef, useEffect } from 'react';
import {
  X, CreditCard, Tag, Calendar, CheckSquare, AlignLeft,
  Activity, Plus, Trash2,
  Copy, ArrowRight, Clock, Pencil, Flag,
  Check, Square, CheckCircle2, Users,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskLabel, ChecklistItem } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface Props {
  task: Task;
  columnTitle: string;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

// ─── Preset label colors ─────────────────────────────────
const LABEL_COLOR_PRESETS: { name: string; color: string }[] = [
  { name: 'Bug', color: 'red' },
  { name: 'Feature', color: 'blue' },
  { name: 'Melhoria', color: 'green' },
  { name: 'Urgente', color: 'orange' },
  { name: 'Design', color: 'purple' },
  { name: 'Backend', color: 'teal' },
  { name: 'Frontend', color: 'pink' },
  { name: 'Docs', color: 'yellow' },
];

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

const COVER_COLORS = [
  '#10b981', '#eab308', '#f97316', '#ef4444', '#a855f7',
  '#3b82f6', '#06b6d4', '#ec4899', '#84cc16', '#6b7280',
];

const STATUS_MAP: Record<TaskStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Progresso',
  REVIEW: 'Revisão',
  DONE: 'Concluído',
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string; color: string }[] = [
  { value: 'URGENT', label: 'Urgente', icon: '🔴', color: 'text-red-400' },
  { value: 'HIGH', label: 'Alta', icon: '🟠', color: 'text-orange-400' },
  { value: 'MEDIUM', label: 'Média', icon: '🟡', color: 'text-yellow-400' },
  { value: 'LOW', label: 'Baixa', icon: '🟢', color: 'text-emerald-400' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function TaskDetailModal({ task, columnTitle, onClose, onUpdate }: Props) {
  const { deleteTask, moveTask } = useTaskStore();
  const { members, fetchMembers } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();

  // ─── Local state ───────────────────────────────────────
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [labels, setLabels] = useState<TaskLabel[]>(task.labels || []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist || []);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [priority, setPriority] = useState<TaskPriority | ''>(task.priority || '');
  const [coverColor, setCoverColor] = useState(task.coverColor || '');
  const [assigneeId, setAssigneeId] = useState<string | undefined>(task.assigneeId);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showAddCheck, setShowAddCheck] = useState(false);

  // ─── Popover states ────────────────────────────────────
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Fetch members once for assignee picker
  useEffect(() => {
    if (members.length === 0) fetchMembers();
  }, [fetchMembers, members.length]);

  // Accepted members with a linked user
  const assignableMembers = members.filter((m) => m.inviteAccepted && m.user);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ─── Activity log (local) ─────────────────────────────
  const [activities] = useState([
    {
      id: '1',
      user: 'Sistema',
      action: `adicionou este cartão a ${columnTitle}`,
      date: new Date(task.createdAt).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
    },
  ]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ─── Save helpers ──────────────────────────────────────
  const saveTitle = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== task.title) {
      onUpdate({ title: title.trim() });
    }
  };

  const saveDescription = () => {
    setIsEditingDesc(false);
    if (description !== (task.description || '')) {
      onUpdate({ description: description || undefined });
    }
  };

  const toggleLabel = (preset: { name: string; color: string }) => {
    const exists = labels.find(l => l.name === preset.name && l.color === preset.color);
    let next: TaskLabel[];
    if (exists) {
      next = labels.filter(l => !(l.name === preset.name && l.color === preset.color));
    } else {
      next = [...labels, { name: preset.name, color: preset.color }];
    }
    setLabels(next);
    onUpdate({ labels: next });
  };

  const hasLabel = (preset: { name: string; color: string }) => {
    return labels.some(l => l.name === preset.name && l.color === preset.color);
  };

  const saveDueDate = (date: string) => {
    setDueDate(date);
    onUpdate({ dueDate: date || undefined });
    setShowDatePicker(false);
  };

  const savePriority = (p: TaskPriority | '') => {
    setPriority(p);
    onUpdate({ priority: (p || undefined) as Task['priority'] });
    setShowPriorityPicker(false);
  };

  const saveCover = (color: string) => {
    setCoverColor(color);
    onUpdate({ coverColor: color || undefined });
  };

  const saveAssignee = (id: string | undefined) => {
    setAssigneeId(id);
    onUpdate({ assigneeId: id });
    setShowAssigneePicker(false);
  };

  const currentAssignee = assignableMembers.find((m) => m.userId === assigneeId)?.user;

  const toggleCheckItem = (id: string) => {
    const next = checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(next);
    onUpdate({ checklist: next });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const next = [...checklist, { id: generateId(), text: newCheckItem.trim(), checked: false }];
    setChecklist(next);
    onUpdate({ checklist: next });
    setNewCheckItem('');
  };

  const removeCheckItem = (id: string) => {
    const next = checklist.filter(item => item.id !== id);
    setChecklist(next);
    onUpdate({ checklist: next });
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const handleMove = (status: TaskStatus) => {
    moveTask(task.id, status);
    setShowMovePicker(false);
    onClose();
  };

  const checklistDone = checklist.filter(i => i.checked).length;
  const checklistTotal = checklist.length;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const currentPriorityOpt = priority ? PRIORITY_OPTIONS.find(o => o.value === priority) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-12 px-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 rounded-xl w-full max-w-[768px] shadow-2xl border border-slate-700/50 relative animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cover ─────────────────────────────────────── */}
        {coverColor && (
          <div
            className="h-32 rounded-t-xl relative group cursor-pointer"
            style={{ backgroundColor: coverColor }}
            onClick={() => setShowCoverPicker(!showCoverPicker)}
          >
            <button
              className="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/40 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setShowCoverPicker(!showCoverPicker); }}
            >
              <CreditCard size={12} /> Capa
            </button>
          </div>
        )}

        {/* Cover picker popover */}
        {showCoverPicker && (
          <div className="absolute top-2 right-2 z-30 bg-slate-800 rounded-lg border border-slate-700/50 p-3 shadow-xl w-64">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Capa</span>
              <button onClick={() => setShowCoverPicker(false)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COVER_COLORS.map(c => (
                <button
                  key={c}
                  className={`h-8 rounded-md transition-all ${coverColor === c ? 'ring-2 ring-white scale-105' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => saveCover(c)}
                />
              ))}
            </div>
            {coverColor && (
              <button
                onClick={() => saveCover('')}
                className="mt-2 w-full text-xs text-slate-400 hover:text-white py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                Remover capa
              </button>
            )}
          </div>
        )}

        {/* ── Close button ──────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* ── Main content ──────────────────────────────── */}
        <div className={`p-6 ${coverColor ? '' : 'pt-6'}`}>
          {/* Column indicator */}
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">em <span className="text-slate-300 underline decoration-dotted">{columnTitle}</span></span>
          </div>

          {/* ── Title ─────────────────────────────────── */}
          {isEditingTitle ? (
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } }}
              className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg px-3 py-2 text-xl font-bold text-white resize-none focus:outline-none mb-4"
              rows={1}
              autoFocus
            />
          ) : (
            <h2
              className="text-xl font-bold text-white mb-4 cursor-pointer hover:bg-slate-800/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h2>
          )}

          {/* ── Action chips row ──────────────────────── */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Tag size={14} /> Etiquetas
            </button>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Calendar size={14} /> Datas
            </button>
            <button
              onClick={() => {
                if (checklist.length === 0) {
                  const next: ChecklistItem[] = [{ id: generateId(), text: '', checked: false }];
                  setChecklist(next);
                  onUpdate({ checklist: next });
                }
                setShowAddCheck(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <CheckSquare size={14} /> Checklist
            </button>
            <button
              onClick={() => setShowPriorityPicker(!showPriorityPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Flag size={14} /> Prioridade
            </button>
            <button
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <CreditCard size={14} /> Capa
            </button>
            <button
              onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <Users size={14} /> Membro
            </button>
          </div>

          {/* ── Label picker popover ──────────────────── */}
          {showLabelPicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Etiquetas</span>
                <button onClick={() => setShowLabelPicker(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              {/* Preset labels */}
              <div className="space-y-1.5 mb-3">
                {LABEL_COLOR_PRESETS.map((preset) => {
                  const isActive = hasLabel(preset);
                  const colors = LABEL_COLORS[preset.color] || LABEL_COLORS.blue;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => toggleLabel(preset)}
                      className="w-full flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-700/50 transition-colors"
                    >
                      <div
                        className={`flex-1 h-8 rounded-md flex items-center px-3 text-sm font-medium text-white ${colors.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${colors.dot} mr-2`} />
                        {preset.name}
                      </div>
                      {isActive && <Check size={16} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Date picker popover ───────────────────── */}
          {showDatePicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Data de Entrega</span>
                <button onClick={() => setShowDatePicker(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <input
                type="date"
                value={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => saveDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
              {dueDate && (
                <button
                  onClick={() => saveDueDate('')}
                  className="mt-2 text-xs text-red-400 hover:text-red-300"
                >
                  Remover data
                </button>
              )}
            </div>
          )}

          {/* ── Priority picker popover ───────────────── */}
          {showPriorityPicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Prioridade</span>
                <button onClick={() => setShowPriorityPicker(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-1.5">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => savePriority(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      priority === opt.value ? 'bg-slate-700 ring-1 ring-emerald-500/50' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-sm">{opt.icon}</span>
                    <span className={`${opt.color} font-medium`}>{opt.label}</span>
                  </button>
                ))}
                {priority && (
                  <button
                    onClick={() => savePriority('')}
                    className="w-full text-xs text-slate-400 hover:text-white py-1 mt-1"
                  >
                    Remover prioridade
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Assignee picker popover ───────────────── */}
          {showAssigneePicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Atribuir a</span>
                <button onClick={() => setShowAssigneePicker(false)} className="text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {assignableMembers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 text-center">Nenhum membro no workspace</p>
                ) : (
                  assignableMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => saveAssignee(assigneeId === m.userId ? undefined : m.userId ?? undefined)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[11px] text-white font-bold shrink-0">
                        {m.user!.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm text-white truncate">{m.user!.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{m.user!.email}</p>
                      </div>
                      {assigneeId === m.userId && (
                        <Check size={14} className="text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
              {assigneeId && (
                <button
                  onClick={() => saveAssignee(undefined)}
                  className="mt-2 w-full text-xs text-slate-400 hover:text-white py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  Remover atribuição
                </button>
              )}
            </div>
          )}

          {/* ── Active labels display ─────────────────── */}
          {labels.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Etiquetas</span>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label, i) => {
                  const colors = LABEL_COLORS[label.color] || LABEL_COLORS.blue;
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer hover:opacity-80 ${colors.bg} ${colors.text}`}
                      onClick={() => setShowLabelPicker(true)}
                    >
                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                      {label.name}
                    </span>
                  );
                })}
                <button
                  onClick={() => setShowLabelPicker(true)}
                  className="w-7 h-6 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}

          {/* ── Due date & priority display ────────────── */}
          {(dueDate || currentPriorityOpt) && (
            <div className="flex gap-4 mb-4">
              {dueDate && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1 block">Data de Entrega</span>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      new Date(dueDate) < new Date()
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    <Clock size={14} />
                    {new Date(dueDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  </button>
                </div>
              )}
              {currentPriorityOpt && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1 block">Prioridade</span>
                  <button
                    onClick={() => setShowPriorityPicker(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${currentPriorityOpt.color} bg-slate-800 hover:bg-slate-700 transition-colors`}
                  >
                    <span>{currentPriorityOpt.icon}</span>
                    {currentPriorityOpt.label}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Assignee display ──────────────────────── */}
          {currentAssignee && (
            <div className="mb-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1 block">Responsável</span>
              <button
                onClick={() => setShowAssigneePicker(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold">
                  {currentAssignee.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-white">{currentAssignee.name}</span>
              </button>
            </div>
          )}

          {/* ─── Two column layout ────────────────────── */}
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* ── Left: Description + Checklist ─────── */}
            <div className="flex-1 min-w-0">
              {/* Description */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">Descrição</span>
                  {description && !isEditingDesc && (
                    <button
                      onClick={() => setIsEditingDesc(true)}
                      className="text-slate-400 hover:text-white ml-auto"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
                {isEditingDesc ? (
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Adicione uma descrição mais detalhada..."
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-y"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={saveDescription}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setIsEditingDesc(false); setDescription(task.description || ''); }}
                        className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className={`min-h-[56px] rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      description
                        ? 'text-slate-300 hover:bg-slate-800/50'
                        : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {description || 'Adicione uma descrição mais detalhada...'}
                  </div>
                )}
              </div>

              {/* Checklist */}
              {(checklist.length > 0 || showAddCheck) && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold text-white">Checklist</span>
                    <span className="text-xs text-slate-500 ml-auto">{checklistPercent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        checklistPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {checklist.filter(i => i.text).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group/item px-1 py-1 rounded hover:bg-slate-800/30">
                        <button
                          onClick={() => toggleCheckItem(item.id)}
                          className="shrink-0 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {item.checked
                            ? <CheckCircle2 size={18} className="text-emerald-500" />
                            : <Square size={18} />
                          }
                        </button>
                        <span className={`flex-1 text-sm ${item.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeCheckItem(item.id)}
                          className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add checklist item */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      placeholder="Adicionar item..."
                      className="flex-1 bg-slate-800 border border-slate-700/50 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem(); }}
                    />
                    <button
                      onClick={addCheckItem}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Activity + Sidebar actions ──── */}
            <div className="w-full lg:w-64 shrink-0">
              {/* Sidebar actions */}
              <div className="mb-6">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Ações</span>
                <div className="space-y-1">
                  <button
                    onClick={() => setShowMovePicker(!showMovePicker)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors text-left"
                  >
                    <ArrowRight size={14} /> Mover
                  </button>
                  {showMovePicker && (
                    <div className="ml-2 space-y-1 py-1">
                      {(Object.entries(STATUS_MAP) as [TaskStatus, string][]).map(([s, label]) => (
                        <button
                          key={s}
                          onClick={() => handleMove(s)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                            task.status === s ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${title}\n${description}`);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors text-left"
                  >
                    <Copy size={14} /> Copiar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-sm text-red-400 hover:text-red-300 transition-colors text-left"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>

              {/* Comments & Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">Atividade</span>
                </div>

                {/* Comment input */}
                <div className="flex items-start gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">
                    {currentUser?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Escreva um comentário..."
                      className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                {/* Activity log */}
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-300 font-bold shrink-0 mt-0.5">
                        {a.user.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">{a.user}</span>{' '}
                          {a.action}
                        </p>
                        <p className="text-[10px] text-slate-500">{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
