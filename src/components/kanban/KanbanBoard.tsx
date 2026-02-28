import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { TaskStatus, Task } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { useTaskStore } from '../../stores/useTaskStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';

const COLUMNS: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'PENDING', title: 'Pendente', color: 'bg-yellow-500' },
  { status: 'IN_PROGRESS', title: 'Em Progresso', color: 'bg-blue-500' },
  { status: 'REVIEW', title: 'Revisão', color: 'bg-purple-500' },
  { status: 'DONE', title: 'Concluído', color: 'bg-green-500' },
];

export function KanbanBoard() {
  const { tasks, isLoading, fetchTasks, addTask } = useTaskStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskColor, setNewTaskColor] = useState('blue');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { updateTask } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      color: newTaskColor,
      status: 'PENDING',
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowAddModal(false);
  };

  const handleEditSave = async () => {
    if (!editingTask) return;
    await updateTask(editingTask.id, {
      title: editingTask.title,
      description: editingTask.description,
      color: editingTask.color,
    });
    setEditingTask(null);
  };

  if (isLoading) {
    return <LoadingSpinner className="h-64" text="Carregando tarefas..." />;
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-h-[500px]">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              title={col.title}
              color={col.color}
              tasks={tasks.filter((t) => t.status === col.status)}
              onAddTask={col.status === 'PENDING' ? () => setShowAddModal(true) : undefined}
              onEditTask={(task) => setEditingTask(task)}
            />
          ))}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Nova Tarefa</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="O que precisa ser feito?"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Detalhes opcionais..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cor</label>
                <div className="flex gap-2">
                  {['blue', 'red', 'green', 'yellow', 'purple', 'orange'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTaskColor(c)}
                      className={`w-7 h-7 rounded-full bg-${c}-500 transition-all ${
                        newTaskColor === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddTask}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                <Plus size={16} /> Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Editar Tarefa</h3>
              <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <button
                onClick={handleEditSave}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
