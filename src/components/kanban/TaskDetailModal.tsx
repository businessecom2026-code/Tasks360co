import { useState, useRef, useEffect } from 'react';
import {
  X,
  Calendar,
  Flag,
  Tag,
  AlignLeft,
  Trash2,
  Clock,
  CheckCircle2,
  Image,
  CheckSquare,
  Square,
  Copy,
  ArrowRight,
  Activity,
  CreditCard,
  Pencil,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskLabel, ChecklistItem } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';

interface Props {
  task: Task;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'IN_PROGRESS', label: 'Em Progresso', color: 'bg-blue-500' },
  { value: 'REVIEW', label: 'Revisão', color: 'bg-purple-500' },
  { value: 'DONE', label: 'Concluído', color: 'bg-emerald-500' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string; color: string }[] = [
  { value: 'URGENT', label: 'Urgente', icon: '🔴', color: 'text-red-400' },
  { value: 'HIGH', label: 'Alta', icon: '🟠', color: 'text-orange-400' },
  { value: 'MEDIUM', label: 'Média', icon: '🟡', color: 'text-yellow-400' },
  { value: 'LOW', label: 'Baixa', icon: '🟢', color: 'text-emerald-400' },
];

const LABEL_PRESETS: { name: string; color: string }[] = [
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
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Slate', value: '#475569' },
  { name: 'Sky', value: '#0ea5e9' },
];

const COLOR_SWATCHES = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function TaskDetailModal({ task: initialTask, onClose }: Props) {
  const { updateTask, deleteTask, moveTask } = useTaskStore();
  const [task, setTask] = useState({ ...initialTask });
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showAddCheck, setShowAddCheck] = useState(false);
  const [commentText, setCommentText] = useState('');

  const descRef = useRef<HTMLTextAreaElement>(null);

  const labels = (task.labels || []) as TaskLabel[];
  const checklist = (task.checklist || []) as ChecklistItem[];
  const checklistDone = checklist.filter(i => i.checked).length;
  const checklistTotal = checklist.length;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  // Column name from status
  const columnTitle = STATUS_OPTIONS.find(s => s.value === task.status)?.label || '';

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateTask(task.id, {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      labels: task.labels,
      checklist: task.checklist,
      coverColor: task.coverColor,
      dueDate: task.dueDate,
      color: task.color,
    });
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  const handleMove = (status: TaskStatus) => {
    moveTask(task.id, status);
    setShowMovePicker(false);
    onClose();
  };

  const toggleLabel = (preset: { name: string; color: string }) => {
    const existing = labels.find((l) => l.name === preset.name && l.color === preset.color);
    if (existing) {
      setTask({ ...task, labels: labels.filter((l) => !(l.name === preset.name && l.color === preset.color)) });
    } else {
      setTask({ ...task, labels: [...labels, preset] });
    }
  };

  const hasLabel = (preset: { name: string; color: string }) => {
    return labels.some((l) => l.name === preset.name && l.color === preset.color);
  };

  const setCoverColor = (color: string) => {
    setTask({ ...task, coverColor: color || undefined });
  };

  // ─── Checklist helpers ─────────────────────────────────
  const toggleCheckItem = (id: string) => {
    const next = checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setTask({ ...task, checklist: next });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const next = [...checklist, { id: generateId(), text: newCheckItem.trim(), checked: false }];
    setTask({ ...task, checklist: next });
    setNewCheckItem('');
  };

  const removeCheckItem = (id: string) => {
    const next = checklist.filter(item => item.id !== id);
    setTask({ ...task, checklist: next });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-xl border border-slate-700/50 w-full max-w-[768px] mx-4 shadow-2xl shadow-black/50 animate-modal-enter relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cover color ──────────────────────────────── */}
        {task.coverColor && (
          <div
            className="h-28 rounded-t-xl relative group cursor-pointer"
            style={{ backgroundColor: task.coverColor }}
            onClick={() => setShowCoverPicker(!showCoverPicker)}
          >
            <button
              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black/40 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setShowCoverPicker(!showCoverPicker); }}
            >
              <CreditCard size={11} /> Capa
            </button>
          </div>
        )}

        {/* Header bar with color accent (when no cover) */}
        {!task.coverColor && task.color && (
          <div className={`h-2 rounded-t-xl bg-${task.color}-500`} />
        )}

        {/* Cover image */}
        {task.image && !task.coverColor && (
          <div className="relative">
            <img src={task.image} alt="" className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          </div>
        )}

        {/* Cover picker popover */}
        {showCoverPicker && (
          <div className="absolute top-2 right-2 z-30 bg-slate-800 rounded-lg border border-slate-700/50 p-3 shadow-xl w-64 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Capa</span>
              <button onClick={() => setShowCoverPicker(false)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COVER_COLORS.map(c => (
                <button
                  key={c.value}
                  className={`h-7 rounded-md transition-all ${task.coverColor === c.value ? 'ring-2 ring-white scale-105' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setCoverColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
            {task.coverColor && (
              <button
                onClick={() => setCoverColor('')}
                className="mt-2 w-full text-[11px] text-slate-400 hover:text-white py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                Remover capa
              </button>
            )}
          </div>
        )}

        {/* ── Close button ─────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-10"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          {/* Column indicator */}
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={12} className="text-slate-500" />
            <span className="text-[11px] text-slate-500">
              em <span className="text-slate-300 underline decoration-dotted">{columnTitle}</span>
            </span>
          </div>

          {/* Title */}
          <div className="mb-5">
            <input
              type="text"
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              className="w-full text-xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder-slate-500"
              placeholder="Título da tarefa"
            />
          </div>

          {/* ── Action chips row (Trello-style) ────────── */}
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <Tag size={13} /> Etiquetas
            </button>
            <button
              onClick={() => {
                if (checklist.length === 0) {
                  setTask({ ...task, checklist: [] });
                }
                setShowAddCheck(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <CheckSquare size={13} /> Checklist
            </button>
            <button
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <CreditCard size={13} /> Capa
            </button>
          </div>

          {/* ── Two column layout ─────────────────────── */}
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* ── Left: Main content ──────────────────── */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Status + Priority row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Status</span>
                  <div className="flex gap-1">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTask({ ...task, status: opt.value })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          task.status === opt.value
                            ? `${opt.color} text-white shadow-sm`
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${task.status === opt.value ? 'bg-white/60' : opt.color}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Labels section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Etiquetas</span>
                </div>
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {labels.map((label, i) => {
                      const colors = LABEL_COLORS[label.color] || LABEL_COLORS.blue;
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium cursor-pointer hover:opacity-80 ${colors.bg} ${colors.text}`}
                          onClick={() => toggleLabel(label)}
                          title="Clique para remover"
                        >
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          {label.name}
                          <X size={10} className="ml-0.5" />
                        </span>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={() => setShowLabelPicker(!showLabelPicker)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {showLabelPicker ? 'Fechar' : '+ Adicionar etiqueta'}
                </button>
                {showLabelPicker && (
                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-800/60 rounded-lg border border-slate-700/50 animate-slide-up">
                    {LABEL_PRESETS.map((preset) => {
                      const colors = LABEL_COLORS[preset.color] || LABEL_COLORS.blue;
                      const isSelected = hasLabel(preset);
                      return (
                        <button
                          key={preset.name}
                          onClick={() => toggleLabel(preset)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.text} ring-1 ring-current`
                              : `bg-slate-800 text-slate-400 hover:${colors.bg} hover:${colors.text}`
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          {preset.name}
                          {isSelected && <CheckCircle2 size={10} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Priority + Due date + Color row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Flag size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Prioridade</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTask({ ...task, priority: task.priority === opt.value ? undefined : opt.value })}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                          task.priority === opt.value
                            ? `bg-slate-700 ${opt.color} font-medium`
                            : 'bg-slate-800/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-xs">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Data</span>
                  </div>
                  <input
                    type="date"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setTask({ ...task, dueDate: e.target.value || undefined })}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Image size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Cor</span>
                  </div>
                  <div className="flex gap-1.5">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setTask({ ...task, color: task.color === c ? undefined : c })}
                        className={`w-6 h-6 rounded-full bg-${c}-500 transition-all ${
                          task.color === c ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlignLeft size={14} className="text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Descrição</span>
                  {task.description && !isEditingDesc && (
                    <button onClick={() => setIsEditingDesc(true)} className="text-slate-500 hover:text-white ml-auto">
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
                {isEditingDesc || !task.description ? (
                  <div>
                    <textarea
                      ref={descRef}
                      value={task.description || ''}
                      onChange={(e) => setTask({ ...task, description: e.target.value })}
                      placeholder="Adicione uma descrição mais detalhada..."
                      rows={4}
                      className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors leading-relaxed"
                      autoFocus={isEditingDesc}
                    />
                    {isEditingDesc && (
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => setIsEditingDesc(false)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md transition-colors"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => { setIsEditingDesc(false); setTask({ ...task, description: initialTask.description }); }}
                          className="px-3 py-1 text-slate-400 hover:text-white text-xs transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-[56px] rounded-lg px-3 py-2.5 text-sm text-slate-300 cursor-pointer hover:bg-slate-800/40 transition-colors leading-relaxed whitespace-pre-wrap"
                  >
                    {task.description}
                  </div>
                )}
              </div>

              {/* ── Checklist ─────────────────────────── */}
              {(checklistTotal > 0 || showAddCheck) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} className="text-slate-500" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Checklist</span>
                    <span className="text-[10px] text-slate-600 ml-auto">{checklistPercent}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        checklistPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>

                  {/* Items */}
                  <div className="space-y-0.5">
                    {checklist.filter(i => i.text).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group/item px-1 py-1 rounded hover:bg-slate-800/40">
                        <button
                          onClick={() => toggleCheckItem(item.id)}
                          className="shrink-0 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          {item.checked
                            ? <CheckCircle2 size={16} className="text-emerald-500" />
                            : <Square size={16} />
                          }
                        </button>
                        <span className={`flex-1 text-sm ${item.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                          {item.text}
                        </span>
                        <button
                          onClick={() => removeCheckItem(item.id)}
                          className="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add checklist item */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      placeholder="Adicionar item..."
                      className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-md px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                      onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem(); }}
                    />
                    <button
                      onClick={addCheckItem}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] rounded-md transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Actions + Activity ────────────── */}
            <div className="w-full lg:w-56 shrink-0 space-y-5">
              {/* Actions sidebar */}
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Ações</span>
                <div className="space-y-1">
                  <button
                    onClick={() => setShowMovePicker(!showMovePicker)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors text-left"
                  >
                    <ArrowRight size={13} /> Mover
                  </button>
                  {showMovePicker && (
                    <div className="ml-2 space-y-0.5 py-1 animate-slide-up">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleMove(opt.value)}
                          className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                            task.status === opt.value ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(`${task.title}\n${task.description || ''}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors text-left"
                  >
                    <Copy size={13} /> Copiar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 hover:text-red-300 transition-colors text-left"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>

              {/* Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={13} className="text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Atividade</span>
                </div>

                {/* Comment input */}
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0 mt-0.5">
                    U
                  </div>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Activity log */}
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-slate-400 font-bold shrink-0 mt-0.5">
                      S
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">Sistema</span>{' '}
                        adicionou este cartão a {columnTitle}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {new Date(task.createdAt).toLocaleDateString('pt-BR', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-[10px] text-slate-600 pt-3 mt-5 border-t border-slate-800/60">
            <span>Criado: {new Date(task.createdAt).toLocaleDateString('pt-BR')}</span>
            <span>Atualizado: {new Date(task.updatedAt).toLocaleDateString('pt-BR')}</span>
            {task.version > 1 && <span>v{task.version}</span>}
            {task.googleTaskId && (
              <span className="flex items-center gap-0.5 text-emerald-600">
                <Clock size={9} /> Google Tasks
              </span>
            )}
          </div>

          {/* Actions bar */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all shadow-sm shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
