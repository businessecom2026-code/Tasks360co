import { useEffect, useState, useCallback, useRef } from 'react';
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
import { TaskModal } from './TaskModal';
import { useTaskStore } from '../../stores/useTaskStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';

type ViewMode = 'kanban' | 'list';

const COLUMNS: { status: TaskStatus; title: string; color: string; accentColor: string }[] = [
  { status: 'PENDING',     title: 'Pendente',     color: 'bg-yellow-500',  accentColor: 'bg-yellow-600/30'  },
  { status: 'IN_PROGRESS', title: 'Em Progresso', color: 'bg-blue-500',    accentColor: 'bg-blue-600/30'    },
  { status: 'REVIEW',      title: 'Revisao',      color: 'bg-purple-500',  accentColor: 'bg-purple-600/30'  },
  { status: 'DONE',        title: 'Concluido',    color: 'bg-emerald-500', accentColor: 'bg-emerald-600/30' },
];

const PRIORITY_FILTERS: { value: TaskPriority | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL',    label: 'Todas',   icon: ''   },
  { value: 'URGENT', label: 'Urgente', icon: '🔴' },
  { value: 'HIGH',   label: 'Alta',    icon: '🟠' },
  { value: 'MEDIUM', label: 'Media',   icon: '🟡' },
  { value: 'LOW',    label: 'Baixa',   icon: '🟢' },
];

export function KanbanBoard() {
  const { tasks, isLoading, fetchTasks, moveTask, updateTask } = useTaskStore();
  const [viewMode, setViewMode]           = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [showFilters, setShowFilters]     = useState(false);
  const [activeTask, setActiveTask]       = useState<Task | null>(null);

  // Modal state: null = closed, undefined = open in create mode, Task = open in edit mode
  const [modalTask, setModalTask]             = useState<Task | null | undefined>(undefined);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskStatus>('PENDING');

  const isModalOpen   = modalTask !== undefined;
  const isCreateMode  = isModalOpen && modalTask === null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filteredTasks = tasks.filter((task) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle    = task.title.toLowerCase().includes(q);
      const matchDesc     = task.description?.toLowerCase().includes(q);
      const matchAssignee = task.assignee?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
    return true;
  });

  const openCreate = (status: TaskStatus = 'PENDING') => {
    setCreateInitialStatus(status);
    setModalTask(null);
  };

  const openEdit = (task: Task) => setModalTask(task);

  const closeModal = () => setModalTask(undefined);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    setActiveTask(task ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    const targetColumn = COLUMNS.find((c) => c.status === overId);
    if (targetColumn) {
      const currentTask = tasks.find((t) => t.id === taskId);
      if (currentTask && currentTask.status !== targetColumn.status) {
        moveTask(taskId, targetColumn.status);
      }
    }
  }, [tasks, moveTask]);

  // Ref sempre aponta para o modalTask mais recente — sem stale closure
  const modalTaskRef = useRef<Task | null | undefined>(undefined);
  modalTaskRef.current = modalTask;

  const handleTaskUpdate = useCallback(async (updates: Partial<Task>) => {
    const current = modalTaskRef.current;
    if (!current?.id) return;
    // Atualização local imediata para UI responsiva (otimista)
    setModalTask((prev) => prev ? { ...prev, ...updates } : prev);
    // Dispara patch na API (rollback automático no updateTask se falhar)
    await updateTask(current.id, updates);
  }, [updateTask]);

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
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={14} /> Lista
            </button>
          </div>

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
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
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
            <Filter size={14} /> Filtros
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Nova Tarefa → abre TaskModal no modo criação */}
          <button
            onClick={() => openCreate()}
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

      {/* Board / List */}
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
                  onEditTask={openEdit}
                />
              ))}
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeTask ? (
              <div className="w-[270px]">
                <TaskCard task={activeTask} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <ListView tasks={filteredTasks} onEditTask={openEdit} />
      )}

      {/* Modal unificado: criação (task=null) ou edição (task=Task) */}
      {isModalOpen && (
        isCreateMode ? (
          <TaskModal
            task={null}
            initialStatus={createInitialStatus}
            onClose={closeModal}
          />
        ) : (
          <TaskModal
            task={modalTask!}
            onClose={closeModal}
            onUpdate={handleTaskUpdate}
          />
        )
      )}
    </ErrorBoundary>
  );
}
