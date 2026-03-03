import { useState } from 'react';
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
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskLabel } from '../../types';
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

const COLOR_SWATCHES = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];

export function TaskDetailModal({ task: initialTask, onClose }: Props) {
  const { updateTask, deleteTask } = useTaskStore();
  const [task, setTask] = useState({ ...initialTask });
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const labels = (task.labels || []) as TaskLabel[];

  const handleSave = async () => {
    setIsSaving(true);
    await updateTask(task.id, {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      labels: task.labels,
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8 bg-black/70 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-850 bg-slate-900 rounded-xl border border-slate-700/50 w-full max-w-2xl mx-4 shadow-2xl shadow-black/50 animate-modal-enter" onClick={(e) => e.stopPropagation()}>

        {/* Header bar with color accent */}
        {task.color && (
          <div className={`h-2 rounded-t-xl bg-${task.color}-500`} />
        )}

        {/* Cover image */}
        {task.image && (
          <div className="relative">
            <img src={task.image} alt="" className="w-full h-40 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all z-10"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <input
              type="text"
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              className="w-full text-xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder-slate-500"
              placeholder="Título da tarefa"
            />
          </div>

          {/* Status + Priority row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status selector */}
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
              <span className="text-xs text-slate-500 uppercase tracking-wider">Labels</span>
            </div>
            {/* Current labels */}
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
            {/* Label picker toggle */}
            <button
              onClick={() => setShowLabelPicker(!showLabelPicker)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {showLabelPicker ? 'Fechar' : '+ Adicionar label'}
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
            {/* Priority */}
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

            {/* Due date */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500 uppercase tracking-wider">Data</span>
              </div>
              <input
                type="date"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setTask({ ...task, dueDate: e.target.value || undefined })}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Color */}
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
              <span className="text-xs text-slate-500 uppercase tracking-wider">Descricao</span>
            </div>
            <textarea
              value={task.description || ''}
              onChange={(e) => setTask({ ...task, description: e.target.value })}
              placeholder="Adicione uma descricao mais detalhada..."
              rows={4}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors leading-relaxed"
            />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-[10px] text-slate-600 pt-1 border-t border-slate-800/60">
            <span>Criado: {new Date(task.createdAt).toLocaleDateString('pt-BR')}</span>
            <span>Atualizado: {new Date(task.updatedAt).toLocaleDateString('pt-BR')}</span>
            {task.version > 1 && <span>v{task.version}</span>}
            {task.googleTaskId && (
              <span className="flex items-center gap-0.5 text-emerald-600">
                <Clock size={9} /> Google Tasks
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 size={14} /> Excluir tarefa
            </button>
            <div className="flex items-center gap-2">
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
    </div>
  );
}
