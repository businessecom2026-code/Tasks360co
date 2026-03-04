import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
  Plus,
  Flag,
} from 'lucide-react';
import type { TaskStatus, Task, TaskPriority } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { ListView } from './ListView';
import { TaskDetailModal } from './TaskDetailModal';
import { useTaskStore } from '../../stores/useTaskStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';

type ViewMode = 'kanban' | 'list';

const COLUMNS: { status: TaskStatus; title: string; color: string; accentColor: string }[] = [
  { status: 'PENDING', title: 'Pendente', color: 'bg-yellow-500', accentColor: 'bg-yellow-600/30' },
  { status: 'IN_PROGRESS', title: 'Em Progresso', color: 'bg-blue-500', accentColor: 'bg-blue-600/30' },
  { status: 'REVIEW', title: 'Revisao', color: 'bg-purple-500', accentColor: 'bg-purple-600/30' },
  { status: 'DONE', title: 'Concluido', color: 'bg-emerald-500', accentColor: 'bg-emerald-600/30' },
];

const PRIORITY_FILTERS: { value: TaskPriority | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: 'Todas', icon: '' },
  { value: 'URGENT', label: 'Urgente', icon: '🔴' },
  { value: 'HIGH', label: 'Alta', icon: '🟠' },
  { value: 'MEDIUM', label: 'Media', icon: '🟡' },
  { value: 'LOW', label: 'Baixa', icon: '🟢' },
];

const COLOR_OPTIONS = [
  { name: 'blue', bg: 'bg-blue-500' },
  { name: 'red', bg: 'bg-red-500' },
  { name: 'green', bg: 'bg-green-500' },
  { name: 'yellow', bg: 'bg-yellow-500' },
  { name: 'purple', bg: 'bg-purple-500' },
  { name: 'orange', bg: 'bg-orange-500' },
  { name: 'pink', bg: 'bg-pink-500' },
  { name: 'teal', bg: 'bg-teal-500' },
];

export function KanbanBoard() {
  const { tasks, isLoading, fetchTasks, moveTask, addTask, updateTask } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('blue');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority | ''>('');

  // DnD sensors with activation constraint to distinguish click from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchAssignee = task.assignee?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
    return true;
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const targetColumn = COLUMNS.find((c) => c.status === overId);
    if (targetColumn) {
      const currentTask = tasks.find((t) => t.id === taskId);
      if (currentTask && currentTask.status !== targetColumn.status) {
        moveTask(taskId, targetColumn.status);
      }
    }
  }, [tasks, moveTask]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      color: newTaskColor,
      priority: (newTaskPriority || undefined) as Task['priority'],
      status: 'PENDING',
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('');
    setShowAddModal(false);
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!detailTask) return;
    const success = await updateTask(detailTask.id, updates);
    if (success) {
      setDetailTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const getColumnTitle = (status: TaskStatus) => {
    return COLUMNS.find(c => c.status === status)?.title || '';
  };

  const activeFiltersCount = (searchQuery ? 1 : 0) + (priorityFilter !== 'ALL' ? 1 : 0);

  if (isLoading) {
    return <LoadingSpinner className="h-64" text="Carregando tarefas..." />;
  }

  return (
    <ErrorBoundary>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-950/50">
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-slate-800/60 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'kanban'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={14} />
              Lista
            </button>
          </div>

          {/* Task count */}
          <span className="text-xs text-slate-500">
            {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefas..."
              className="w-48 bg-slate-800/60 border border-slate-700/50 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              showFilters || activeFiltersCount > 0
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Filter size={14} />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Add task */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm shadow-emerald-500/20"
          >
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-800/40 bg-slate-900/40 animate-slide-down">
          <div className="flex items-center gap-2">
            <Flag size={12} className="text-slate-500" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">Prioridade:</span>
            {PRIORITY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setPriorityFilter(f.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                  priorityFilter === f.value
                    ? 'bg-emerald-600/20 text-emerald-400 font-medium'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {f.icon && <span>{f.icon}</span>}
                {f.label}
              </button>
            ))}
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setSearchQuery(''); setPriorityFilter('ALL'); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Board / List view */}
      {viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex gap-4 h-full min-h-[500px]">
              {COLUMNS.map((col) => (
                <KanbanColumn
                  key={col.status}
                  status={col.status}
                  title={col.title}
                  color={col.color}
                  accentColor={col.accentColor}
                  tasks={filteredTasks.filter((t) => t.status === col.status)}
                  onEditTask={(task) => setDetailTask(task)}
                />
              ))}
            </div>
          </div>

          {/* Drag overlay - floating card that follows cursor */}
          <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeTask ? (
              <div className="w-[270px]">
                <TaskCard task={activeTask} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <ListView tasks={filteredTasks} onEditTask={(task) => setDetailTask(task)} />
      )}

      {/* Task Detail Modal (Trello-style) */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          columnTitle={getColumnTitle(detailTask.status)}
          onClose={() => setDetailTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}

      {/* Quick Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 rounded-xl border border-slate-700/50 w-full max-w-md mx-4 shadow-2xl shadow-black/50 animate-modal-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-800/60">
              <h3 className="text-lg font-semibold text-white">Nova Tarefa</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Titulo</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="O que precisa ser feito?"
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Descricao</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Detalhes opcionais..."
                  rows={3}
                  className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Cor</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setNewTaskColor(c.name)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                        newTaskColor === c.name ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wider">Prioridade</label>
                <div className="flex gap-1.5">
                  {PRIORITY_FILTERS.filter(f => f.value !== 'ALL').map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setNewTaskPriority(newTaskPriority === f.value ? '' : f.value as TaskPriority)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                        newTaskPriority === f.value
                          ? 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/50'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{f.icon}</span>{f.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddTask}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors shadow-sm shadow-emerald-500/20"
              >
                <Plus size={16} /> Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
