/**
 * TaskModal — modal unificado para CRIAR e EDITAR tarefas.
 *
 * modo "create" → task é null/undefined, initialStatus define a coluna padrão.
 * modo "edit"   → task é um objeto Task existente, alterações são emitidas
 *                  via onUpdate() campo a campo (auto-save on blur).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, CreditCard, Tag, Calendar, CheckSquare, AlignLeft,
  Activity, Plus, Trash2, Copy, ArrowRight, Clock, Pencil,
  Flag, Check, Square, CheckCircle2, Users, ChevronDown, Loader2,
  Paperclip, Upload, FileText, Film, Image as ImageIcon,
  ChevronRight, Eye, Download,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskLabel, ChecklistItem, Attachment } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { api } from '../../lib/api';

// ─── Helpers: Attachments ────────────────────────────────────────────────────

function getFileCategory(mimeType: string): 'image' | 'document' | 'video' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'document';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  const cat = getFileCategory(mimeType);
  if (cat === 'image') return <ImageIcon size={16} className="text-blue-400" />;
  if (cat === 'video') return <Film size={16} className="text-purple-400" />;
  return <FileText size={16} className="text-orange-400" />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  task?: Task | null;               // null/undefined → modo criação
  initialStatus?: TaskStatus;       // coluna pré-selecionada no modo criação
  onClose: () => void;
  onSave?: (created: Task) => void; // chamado após criação bem-sucedida
  onUpdate?: (updates: Partial<Task>) => void; // chamado a cada campo editado
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const LABEL_PRESETS: { name: string; color: string }[] = [
  { name: 'Bug',      color: 'red'    },
  { name: 'Feature',  color: 'blue'   },
  { name: 'Melhoria', color: 'green'  },
  { name: 'Urgente',  color: 'orange' },
  { name: 'Design',   color: 'purple' },
  { name: 'Backend',  color: 'teal'   },
  { name: 'Frontend', color: 'pink'   },
  { name: 'Docs',     color: 'yellow' },
];

const LABEL_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  red:    { bg: 'bg-red-500/20',     text: 'text-red-300',     dot: 'bg-red-500'     },
  blue:   { bg: 'bg-blue-500/20',    text: 'text-blue-300',    dot: 'bg-blue-500'    },
  green:  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  yellow: { bg: 'bg-yellow-500/20',  text: 'text-yellow-300',  dot: 'bg-yellow-500'  },
  purple: { bg: 'bg-purple-500/20',  text: 'text-purple-300',  dot: 'bg-purple-500'  },
  orange: { bg: 'bg-orange-500/20',  text: 'text-orange-300',  dot: 'bg-orange-500'  },
  pink:   { bg: 'bg-pink-500/20',    text: 'text-pink-300',    dot: 'bg-pink-500'    },
  teal:   { bg: 'bg-teal-500/20',    text: 'text-teal-300',    dot: 'bg-teal-500'    },
};

const COVER_COLORS = [
  '#10b981', '#eab308', '#f97316', '#ef4444', '#a855f7',
  '#3b82f6', '#06b6d4', '#ec4899', '#84cc16', '#6b7280',
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string; dot: string }[] = [
  { value: 'PENDING',     label: 'Pendente',     color: 'text-yellow-400',  dot: 'bg-yellow-400'  },
  { value: 'IN_PROGRESS', label: 'Em Progresso', color: 'text-blue-400',    dot: 'bg-blue-400'    },
  { value: 'REVIEW',      label: 'Revisão',      color: 'text-purple-400',  dot: 'bg-purple-400'  },
  { value: 'DONE',        label: 'Concluído',    color: 'text-emerald-400', dot: 'bg-emerald-400' },
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pendente', IN_PROGRESS: 'Em Progresso', REVIEW: 'Revisão', DONE: 'Concluído',
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string; color: string }[] = [
  { value: 'URGENT', label: 'Urgente', icon: '🔴', color: 'text-red-400'     },
  { value: 'HIGH',   label: 'Alta',    icon: '🟠', color: 'text-orange-400'  },
  { value: 'MEDIUM', label: 'Média',   icon: '🟡', color: 'text-yellow-400'  },
  { value: 'LOW',    label: 'Baixa',   icon: '🟢', color: 'text-emerald-400' },
];

const CARD_COLORS = [
  { name: 'blue',   bg: 'bg-blue-500'   },
  { name: 'red',    bg: 'bg-red-500'    },
  { name: 'green',  bg: 'bg-green-500'  },
  { name: 'yellow', bg: 'bg-yellow-500' },
  { name: 'purple', bg: 'bg-purple-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'pink',   bg: 'bg-pink-500'   },
  { name: 'teal',   bg: 'bg-teal-500'   },
];

function uid() { return Math.random().toString(36).substring(2, 9); }

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskModal({ task, initialStatus, onClose, onSave, onUpdate }: Props) {
  const isNew = !task?.id;

  const { addTask, deleteTask, moveTask } = useTaskStore();
  const { members, fetchMembers }         = useWorkspaceStore();
  const { user: currentUser }             = useAuthStore();

  // ── campo: conteúdo ──────────────────────────────────────────
  const [title,       setTitle]       = useState(task?.title       ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [labels,      setLabels]      = useState<TaskLabel[]>(task?.labels      ?? []);
  const [checklist,   setChecklist]   = useState<ChecklistItem[]>(task?.checklist ?? []);
  const [dueDate,     setDueDate]     = useState(task?.dueDate     ?? '');
  const [priority,    setPriority]    = useState<TaskPriority | ''>(task?.priority ?? '');
  const [coverColor,  setCoverColor]  = useState(task?.coverColor  ?? '');
  const [cardColor,   setCardColor]   = useState(task?.color       ?? 'blue');
  const [assigneeId,  setAssigneeId]  = useState<string | undefined>(task?.assigneeId);
  const [status,      setStatus]      = useState<TaskStatus>(task?.status ?? initialStatus ?? 'PENDING');
  const [commentText, setCommentText] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newSubItemParent, setNewSubItemParent] = useState<string | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');

  // ── modo edição ──────────────────────────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc,  setIsEditingDesc]  = useState(false);

  // ── validação / loading ──────────────────────────────────────
  const [titleError, setTitleError] = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);

  // ── checklist toggle ────────────────────────────────────────
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);

  // ── anexos ──────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── popovers ─────────────────────────────────────────────────
  const [showLabelPicker,    setShowLabelPicker]    = useState(false);
  const [showDatePicker,     setShowDatePicker]     = useState(false);
  const [showCoverPicker,    setShowCoverPicker]    = useState(false);
  const [showMovePicker,     setShowMovePicker]     = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showStatusPicker,   setShowStatusPicker]   = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Carregar membros para o picker de responsável
  useEffect(() => {
    if (members.length === 0) fetchMembers();
  }, [fetchMembers, members.length]);

  const assignableMembers = members.filter((m) => m.inviteAccepted && m.user);
  const currentAssignee   = assignableMembers.find((m) => m.userId === assigneeId)?.user;
  const currentStatusOpt  = STATUS_OPTIONS.find((s) => s.value === status)!;
  const currentPriorityOpt = priority ? PRIORITY_OPTIONS.find((o) => o.value === priority) : null;

  // Log de atividade (apenas modo edição)
  const activities = isNew ? [] : [
    {
      id: '1',
      user: 'Sistema',
      action: `adicionou este cartão a ${STATUS_LABEL[task!.status]}`,
      date: new Date(task!.createdAt).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    },
  ];

  // Fechar com Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  // ── helpers: emite update no modo edição ─────────────────────
  const emit = (updates: Partial<Task>) => {
    if (!isNew) onUpdate?.(updates);
  };

  const saveTitle = () => {
    setIsEditingTitle(false);
    if (title.trim() && task && title !== task.title) emit({ title: title.trim() });
  };

  const saveDescription = () => {
    setIsEditingDesc(false);
    if (!isNew && description !== (task?.description ?? '')) {
      emit({ description: description || undefined });
    }
  };

  const toggleLabel = (preset: { name: string; color: string }) => {
    const exists = labels.some((l) => l.name === preset.name && l.color === preset.color);
    const next = exists
      ? labels.filter((l) => !(l.name === preset.name && l.color === preset.color))
      : [...labels, { name: preset.name, color: preset.color }];
    setLabels(next);
    emit({ labels: next });
  };

  const saveDueDate = (date: string) => {
    setDueDate(date);
    emit({ dueDate: date || undefined });
    setShowDatePicker(false);
  };

  const savePriority = (p: TaskPriority | '') => {
    setPriority(p);
    emit({ priority: (p || undefined) as Task['priority'] });
    setShowPriorityPicker(false);
  };

  const saveCover = (color: string) => {
    setCoverColor(color);
    emit({ coverColor: color || undefined });
    setShowCoverPicker(false);
  };

  const saveAssignee = (id: string | undefined) => {
    setAssigneeId(id);
    emit({ assigneeId: id });
    setShowAssigneePicker(false);
  };

  const toggleCheckItem = (id: string) => {
    const next = checklist.map((i) => i.id === id ? { ...i, checked: !i.checked } : i);
    setChecklist(next);
    emit({ checklist: next });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const next = [...checklist, { id: uid(), text: newCheckItem.trim(), checked: false }];
    setChecklist(next);
    emit({ checklist: next });
    setNewCheckItem('');
  };

  const removeCheckItem = (id: string) => {
    // Also remove sub-items of this item
    const next = checklist.filter((i) => i.id !== id && i.parentId !== id);
    setChecklist(next);
    emit({ checklist: next });
  };

  const toggleExpandItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSubItem = (parentId: string) => {
    if (!newSubItemText.trim()) return;
    const next = [...checklist, { id: uid(), text: newSubItemText.trim(), checked: false, parentId }];
    setChecklist(next);
    emit({ checklist: next });
    setNewSubItemText('');
    setNewSubItemParent(null);
  };

  // ── helpers: checklist grouping ──────────────────────────────
  const rootItems = checklist.filter((i) => i.text && !i.parentId);
  const getSubItems = (parentId: string) => checklist.filter((i) => i.parentId === parentId);

  // ── handlers: file upload ──────────────────────────────────
  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    if (!task?.id || files.length === 0) return;
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    try {
      const res = await api.upload<Attachment[]>(`/tasks/${task.id}/attachments`, formData);
      if (res.success && res.data) {
        setAttachments((prev) => [...res.data!, ...prev]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [task?.id]);

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task?.id) return;
    const res = await api.delete(`/tasks/${task.id}/attachments/${attachmentId}`);
    if (res.success) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDelete = () => { if (!isNew && task) { deleteTask(task.id); onClose(); } };

  const handleMove = (s: TaskStatus) => {
    if (!isNew && task) { moveTask(task.id, s); setShowMovePicker(false); onClose(); }
  };

  // ── criação ──────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) {
      setTitleError(true);
      titleRef.current?.focus();
      return;
    }
    setIsSaving(true);
    const result = await addTask({
      title:       title.trim(),
      description: description || undefined,
      status,
      priority:    (priority || undefined) as Task['priority'],
      labels,
      checklist:   checklist.filter((i) => i.text.trim()),
      dueDate:     dueDate || undefined,
      assigneeId,
      coverColor:  coverColor || undefined,
      color:       cardColor,
    });
    setIsSaving(false);
    if (result) { onSave?.(result); onClose(); }
  };

  const checkDone    = checklist.filter((i) => i.checked).length;
  const checkTotal   = checklist.length;
  const checkPercent = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

  // ── render ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-slate-900 rounded-xl w-full max-w-[768px] shadow-2xl border border-slate-700/50 relative animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Capa colorida */}
        {coverColor && (
          <div
            className="h-28 rounded-t-xl relative group cursor-pointer"
            style={{ backgroundColor: coverColor }}
            onClick={() => setShowCoverPicker(true)}
          >
            <span className="absolute top-2 right-10 px-3 py-1.5 rounded-md bg-black/40 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <CreditCard size={12} /> Alterar capa
            </span>
          </div>
        )}

        {/* Cover picker (posicionado absolutamente) */}
        {showCoverPicker && (
          <div className="absolute top-2 right-12 z-40 bg-slate-800 rounded-lg border border-slate-700/50 p-3 shadow-2xl w-64 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Capa</span>
              <button onClick={() => setShowCoverPicker(false)} className="text-slate-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COVER_COLORS.map((c) => (
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

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* ── Conteúdo principal ─────────────────────────────── */}
        <div className={`p-6 ${coverColor ? '' : 'pt-6'}`}>

          {/* Seletor de status (criar) ou indicador de coluna (editar) */}
          {isNew ? (
            <div className="relative mb-4">
              <button
                onClick={() => setShowStatusPicker(!showStatusPicker)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors ${currentStatusOpt.color} text-sm font-medium`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusOpt.dot}`} />
                {currentStatusOpt.label}
                <ChevronDown size={13} className="text-slate-400 ml-0.5" />
              </button>
              {showStatusPicker && (
                <div className="absolute top-full mt-1 left-0 z-30 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl py-1 min-w-[170px] animate-fade-in">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setStatus(opt.value); setShowStatusPicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-700/50 ${opt.color} ${status === opt.value ? 'bg-slate-700/30' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${opt.dot} flex-shrink-0`} />
                      {opt.label}
                      {status === opt.value && <Check size={13} className="ml-auto text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={13} className="text-slate-500" />
              <span className="text-xs text-slate-400">
                em <span className="text-slate-300 underline decoration-dotted">{STATUS_LABEL[task!.status]}</span>
              </span>
            </div>
          )}

          {/* Título */}
          {isNew || isEditingTitle ? (
            <>
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(false); }}
                onBlur={!isNew ? saveTitle : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (!isNew) saveTitle(); }
                }}
                placeholder="Título da tarefa..."
                rows={1}
                autoFocus
                className={`w-full bg-slate-800/60 border rounded-lg px-3 py-2.5 text-xl font-bold text-white resize-none focus:outline-none mb-1 transition-colors ${
                  titleError
                    ? 'border-red-500/60 placeholder-red-400/50'
                    : 'border-slate-700/50 focus:border-emerald-500/50 placeholder-slate-600'
                }`}
              />
              {titleError && (
                <p className="text-xs text-red-400 mb-3">Título é obrigatório</p>
              )}
              {!titleError && <div className="mb-4" />}
            </>
          ) : (
            <h2
              className="text-xl font-bold text-white mb-4 cursor-pointer hover:bg-slate-800/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h2>
          )}

          {/* Chips de ação */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: 'Etiquetas',  icon: <Tag size={14} />,         fn: () => { setShowLabelPicker(v => !v); setShowDatePicker(false); setShowPriorityPicker(false); setShowAssigneePicker(false); } },
              { label: 'Datas',      icon: <Calendar size={14} />,    fn: () => { setShowDatePicker(v => !v); setShowLabelPicker(false); setShowPriorityPicker(false); setShowAssigneePicker(false); } },
              { label: 'Checklist',  icon: <CheckSquare size={14} />, fn: () => setNewCheckItem('') },
              { label: 'Prioridade', icon: <Flag size={14} />,        fn: () => { setShowPriorityPicker(v => !v); setShowLabelPicker(false); setShowDatePicker(false); setShowAssigneePicker(false); } },
              { label: 'Capa',       icon: <CreditCard size={14} />,  fn: () => setShowCoverPicker(v => !v) },
              { label: 'Membro',     icon: <Users size={14} />,       fn: () => { setShowAssigneePicker(v => !v); setShowLabelPicker(false); setShowDatePicker(false); setShowPriorityPicker(false); } },
              ...(!isNew ? [{ label: 'Anexos', icon: <Paperclip size={14} />, fn: () => fileInputRef.current?.click() }] : []),
            ].map(({ label, icon, fn }) => (
              <button
                key={label}
                onClick={fn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors"
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* ── Popover: Etiquetas ─────────────────────────── */}
          {showLabelPicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Etiquetas</span>
                <button onClick={() => setShowLabelPicker(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-1.5">
                {LABEL_PRESETS.map((preset) => {
                  const active  = labels.some((l) => l.name === preset.name && l.color === preset.color);
                  const colors  = LABEL_COLORS[preset.color] ?? LABEL_COLORS.blue;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => toggleLabel(preset)}
                      className="w-full flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className={`flex-1 h-8 rounded-md flex items-center px-3 text-sm font-medium text-white ${colors.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${colors.dot} mr-2`} />{preset.name}
                      </div>
                      {active && <Check size={16} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Popover: Data ──────────────────────────────── */}
          {showDatePicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Data de Entrega</span>
                <button onClick={() => setShowDatePicker(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
              </div>
              <input
                type="date"
                value={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => saveDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
              />
              {dueDate && (
                <button onClick={() => saveDueDate('')} className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                  Remover data
                </button>
              )}
            </div>
          )}

          {/* ── Popover: Prioridade ────────────────────────── */}
          {showPriorityPicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Prioridade</span>
                <button onClick={() => setShowPriorityPicker(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-1.5">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => savePriority(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${priority === opt.value ? 'bg-slate-700 ring-1 ring-emerald-500/50' : 'hover:bg-slate-700/50'}`}
                  >
                    <span>{opt.icon}</span>
                    <span className={`${opt.color} font-medium`}>{opt.label}</span>
                  </button>
                ))}
                {priority && (
                  <button onClick={() => savePriority('')} className="w-full text-xs text-slate-400 hover:text-white py-1 mt-1 transition-colors">
                    Remover prioridade
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Popover: Membro ────────────────────────────── */}
          {showAssigneePicker && (
            <div className="mb-4 bg-slate-800 rounded-lg border border-slate-700/50 p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white">Atribuir a</span>
                <button onClick={() => setShowAssigneePicker(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {assignableMembers.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">Nenhum membro no workspace</p>
                ) : (
                  assignableMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => saveAssignee(assigneeId === m.userId ? undefined : (m.userId ?? undefined))}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[11px] text-white font-bold shrink-0">
                        {m.user!.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm text-white truncate">{m.user!.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{m.user!.email}</p>
                      </div>
                      {assigneeId === m.userId && <Check size={14} className="text-emerald-400 shrink-0" />}
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

          {/* ── Badges ativos: Etiquetas ───────────────────── */}
          {labels.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Etiquetas</span>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label, i) => {
                  const c = LABEL_COLORS[label.color] ?? LABEL_COLORS.blue;
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer hover:opacity-80 ${c.bg} ${c.text}`}
                      onClick={() => setShowLabelPicker(true)}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />{label.name}
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

          {/* ── Badges ativos: Data + Prioridade ──────────── */}
          {(dueDate || currentPriorityOpt) && (
            <div className="flex flex-wrap gap-4 mb-4">
              {dueDate && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1 block">Data de Entrega</span>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      new Date(dueDate) < new Date() ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    <Clock size={13} />
                    {new Date(dueDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  </button>
                </div>
              )}
              {currentPriorityOpt && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1 block">Prioridade</span>
                  <button
                    onClick={() => setShowPriorityPicker(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-800 hover:bg-slate-700 transition-colors ${currentPriorityOpt.color}`}
                  >
                    <span>{currentPriorityOpt.icon}</span>{currentPriorityOpt.label}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Badge ativo: Responsável ───────────────────── */}
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

          {/* ── Layout de duas colunas ─────────────────────── */}
          <div className="flex gap-6 flex-col lg:flex-row">

            {/* Coluna esquerda: Descrição + Checklist */}
            <div className="flex-1 min-w-0">

              {/* Descrição */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">Descrição</span>
                  {!isNew && description && !isEditingDesc && (
                    <button onClick={() => setIsEditingDesc(true)} className="text-slate-400 hover:text-white ml-auto">
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
                {isEditingDesc || isNew ? (
                  <div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Adicione uma descrição mais detalhada..."
                      rows={isNew ? 3 : 4}
                      autoFocus={!isNew && isEditingDesc}
                      className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-y transition-colors"
                    />
                    {!isNew && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={saveDescription} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md transition-colors">Salvar</button>
                        <button onClick={() => { setIsEditingDesc(false); setDescription(task?.description ?? ''); }} className="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className={`min-h-[52px] rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      description ? 'text-slate-300 hover:bg-slate-800/50' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    {description || 'Adicione uma descrição mais detalhada...'}
                  </div>
                )}
              </div>

              {/* Checklist com collapse/expand */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">Checklist</span>
                  {checkTotal > 0 && (
                    <>
                      <span className="text-xs text-slate-500 ml-auto">{checkPercent}%</span>
                      <button
                        onClick={() => setHideCompleted((v) => !v)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 ml-2 transition-colors"
                      >
                        {hideCompleted ? 'Mostrar concluídos' : 'Ocultar concluídos'}
                      </button>
                    </>
                  )}
                </div>
                {checkTotal > 0 && (
                  <>
                    <div className="h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${checkPercent === 100 ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                        style={{ width: `${checkPercent}%` }}
                      />
                    </div>
                    <div className="space-y-0.5 mb-3">
                      {rootItems
                        .filter((item) => !(hideCompleted && item.checked))
                        .map((item) => {
                          const subs = getSubItems(item.id);
                          const hasSubs = subs.length > 0;
                          const isExpanded = expandedItems.has(item.id);
                          const subsDone = subs.filter((s) => s.checked).length;

                          return (
                            <div key={item.id}>
                              {/* Root item */}
                              <div className="flex items-center gap-1.5 group/ci px-1 py-1 rounded hover:bg-slate-800/30">
                                {/* Expand toggle */}
                                <button
                                  onClick={() => hasSubs && toggleExpandItem(item.id)}
                                  className={`shrink-0 w-4 h-4 flex items-center justify-center transition-transform ${hasSubs ? 'text-slate-500 hover:text-slate-300 cursor-pointer' : 'text-transparent cursor-default'}`}
                                >
                                  <ChevronRight
                                    size={12}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                  />
                                </button>
                                <button onClick={() => toggleCheckItem(item.id)} className="shrink-0 text-slate-400 hover:text-emerald-400 transition-colors">
                                  {item.checked
                                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                                    : <Square size={18} />
                                  }
                                </button>
                                <span className={`flex-1 text-sm ${item.checked ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                  {item.text}
                                  {hasSubs && (
                                    <span className="text-[10px] text-slate-500 ml-1.5">({subsDone}/{subs.length})</span>
                                  )}
                                </span>
                                {/* Add sub-item button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNewSubItemParent(item.id); setExpandedItems((prev) => new Set(prev).add(item.id)); }}
                                  className="opacity-0 group-hover/ci:opacity-100 text-slate-500 hover:text-emerald-400 transition-all"
                                  title="Adicionar sub-item"
                                >
                                  <Plus size={13} />
                                </button>
                                <button onClick={() => removeCheckItem(item.id)} className="opacity-0 group-hover/ci:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                                  <X size={14} />
                                </button>
                              </div>

                              {/* Sub-items (collapsible) */}
                              <div
                                className="overflow-hidden transition-all duration-200"
                                style={{
                                  maxHeight: isExpanded ? `${(subs.length + (newSubItemParent === item.id ? 1 : 0)) * 40 + 8}px` : '0px',
                                  opacity: isExpanded ? 1 : 0,
                                }}
                              >
                                <div className="ml-6 border-l border-slate-700/50 pl-2 space-y-0.5 py-0.5">
                                  {subs
                                    .filter((sub) => !(hideCompleted && sub.checked))
                                    .map((sub) => (
                                    <div key={sub.id} className="flex items-center gap-2 group/sub px-1 py-1 rounded hover:bg-slate-800/30">
                                      <button onClick={() => toggleCheckItem(sub.id)} className="shrink-0 text-slate-400 hover:text-emerald-400 transition-colors">
                                        {sub.checked
                                          ? <CheckCircle2 size={15} className="text-emerald-500" />
                                          : <Square size={15} />
                                        }
                                      </button>
                                      <span className={`flex-1 text-xs ${sub.checked ? 'text-slate-500 line-through' : 'text-slate-400'}`}>{sub.text}</span>
                                      <button onClick={() => removeCheckItem(sub.id)} className="opacity-0 group-hover/sub:opacity-100 text-slate-500 hover:text-red-400 transition-all">
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                  {/* Inline sub-item input */}
                                  {newSubItemParent === item.id && (
                                    <div className="flex items-center gap-1.5 py-1">
                                      <input
                                        type="text"
                                        value={newSubItemText}
                                        onChange={(e) => setNewSubItemText(e.target.value)}
                                        placeholder="Sub-item..."
                                        autoFocus
                                        className="flex-1 bg-slate-800 border border-slate-700/50 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') addSubItem(item.id);
                                          if (e.key === 'Escape') { setNewSubItemParent(null); setNewSubItemText(''); }
                                        }}
                                        onBlur={() => { if (!newSubItemText.trim()) { setNewSubItemParent(null); setNewSubItemText(''); } }}
                                      />
                                      <button onClick={() => addSubItem(item.id)} className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 text-white text-[10px] rounded transition-colors">
                                        <Plus size={11} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder={checkTotal === 0 ? 'Adicionar primeiro item...' : 'Adicionar item...'}
                    className="flex-1 bg-slate-800 border border-slate-700/50 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem(); }}
                  />
                  <button
                    onClick={addCheckItem}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-emerald-600 text-white text-xs rounded-md transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* ── Anexos: Drop zone + Thumbnails ──────────── */}
              {!isNew && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip size={16} className="text-slate-400" />
                    <span className="text-sm font-semibold text-white">Anexos</span>
                    {attachments.length > 0 && (
                      <span className="text-xs text-slate-500 ml-auto">{attachments.length} arquivo{attachments.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200 mb-3 ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                        : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 size={18} className="animate-spin text-emerald-400" />
                        <span className="text-sm text-emerald-400">Enviando...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <Upload size={20} className={isDragOver ? 'text-emerald-400' : 'text-slate-500'} />
                        <p className="text-xs text-slate-400">
                          {isDragOver ? 'Solte aqui!' : 'Arraste arquivos ou clique para enviar'}
                        </p>
                        <p className="text-[10px] text-slate-600">Imagens, PDFs, Docs, Videos (max 50MB)</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) handleFileUpload(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Thumbnails / Preview grid */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {attachments.map((att) => {
                        const cat = getFileCategory(att.fileType);
                        return (
                          <div
                            key={att.id}
                            className="group/att relative bg-slate-800 rounded-lg border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-colors"
                          >
                            {/* Preview area */}
                            {cat === 'image' ? (
                              <div
                                className="h-24 bg-slate-900 cursor-pointer relative"
                                onClick={() => { setLightboxUrl(att.fileUrl); setLightboxType('image'); }}
                              >
                                <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <Eye size={18} className="text-white opacity-0 group-hover/att:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : cat === 'video' ? (
                              <div
                                className="h-24 bg-slate-900 cursor-pointer relative flex items-center justify-center"
                                onClick={() => { setLightboxUrl(att.fileUrl); setLightboxType('video'); }}
                              >
                                <Film size={28} className="text-purple-400/60" />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                                  <Eye size={18} className="text-white opacity-0 group-hover/att:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-24 bg-slate-900 flex items-center justify-center">
                                <FileText size={28} className="text-orange-400/60" />
                              </div>
                            )}

                            {/* File info */}
                            <div className="px-2 py-1.5 flex items-center gap-1.5 min-w-0">
                              {getFileIcon(att.fileType)}
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-slate-300 truncate leading-tight">{att.fileName}</p>
                                <p className="text-[9px] text-slate-500">{formatFileSize(att.fileSize)}</p>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/att:opacity-100 transition-opacity">
                                <a
                                  href={att.fileUrl}
                                  download={att.fileName}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 text-slate-500 hover:text-emerald-400 transition-colors rounded"
                                  title="Download"
                                >
                                  <Download size={11} />
                                </a>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }}
                                  className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded"
                                  title="Excluir"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coluna direita: Sidebar */}
            <div className="w-full lg:w-60 shrink-0 space-y-6">

              {/* Ações (apenas modo edição) */}
              {!isNew && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Ações</span>
                  <div className="space-y-1">
                    <button
                      onClick={() => setShowMovePicker(!showMovePicker)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 hover:text-white transition-colors text-left"
                    >
                      <ArrowRight size={14} /> Mover
                    </button>
                    {showMovePicker && (
                      <div className="ml-2 space-y-0.5 py-1">
                        {(Object.entries(STATUS_LABEL) as [TaskStatus, string][]).map(([s, lbl]) => (
                          <button
                            key={s}
                            onClick={() => handleMove(s)}
                            className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                              task?.status === s ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(`${title}\n${description}`)}
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
              )}

              {/* Cor do cartão (modo criação) */}
              {isNew && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">Cor do Cartão</span>
                  <div className="flex flex-wrap gap-2">
                    {CARD_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setCardColor(c.name)}
                        className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                          cardColor === c.name ? 'ring-2 ring-white scale-110' : 'opacity-40 hover:opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Comentários / Atividade */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-white">
                    {isNew ? 'Nota Inicial' : 'Atividade'}
                  </span>
                </div>
                <div className="flex items-start gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0 mt-0.5">
                    {currentUser?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={isNew ? 'Adicionar nota inicial...' : 'Escreva um comentário...'}
                    className="flex-1 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                {!isNew && activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-300 font-bold shrink-0 mt-0.5">
                      {a.user.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">{a.user}</span> {a.action}
                      </p>
                      <p className="text-[10px] text-slate-500">{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer CTA (apenas modo criação) ──────────── */}
          {isNew && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800/60">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20 min-w-[130px] justify-center"
              >
                {isSaving ? (
                  <><Loader2 size={15} className="animate-spin" /> Criando...</>
                ) : (
                  <><Plus size={15} /> Criar Tarefa</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox overlay ───────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 animate-fade-in"
          onClick={() => { setLightboxUrl(null); setLightboxType(null); }}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => { setLightboxUrl(null); setLightboxType(null); }}
          >
            <X size={20} />
          </button>
          {lightboxType === 'image' ? (
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : lightboxType === 'video' ? (
            <video
              src={lightboxUrl}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
