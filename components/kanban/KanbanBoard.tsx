import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCorners, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { Task, User, UserRole, Language, Column as ColumnType } from '../../types';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { Plus, Search, AlignLeft, X } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  role: UserRole;
  language: Language;
  users: User[];
  currentCompany: string;
  currentUser: User;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, setTasks, role, language, users, currentCompany, currentUser }) => {
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  
  const isAdmin = currentUser.email === 'admin@ecom360.co';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, columnsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/columns')
        ]);
        
        const tasksData = await tasksRes.json();
        const columnsData = await columnsRes.json();
        
        if (Array.isArray(tasksData) && tasksData.length > 0) setTasks(tasksData);
        if (Array.isArray(columnsData) && columnsData.length > 0) {
          setColumns(columnsData);
        } else {
           // Fallback if no columns
           setColumns([
            { id: 'PENDING', title: 'Pendente', color: '#f59e0b' },
            { id: 'IN_PROGRESS', title: 'Em Curso', color: '#3b82f6' },
            { id: 'DONE', title: 'Concluído', color: '#10b981' }
           ]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback
        setColumns([
            { id: 'PENDING', title: 'Pendente', color: '#f59e0b' },
            { id: 'IN_PROGRESS', title: 'Em Curso', color: '#3b82f6' },
            { id: 'DONE', title: 'Concluído', color: '#10b981' }
        ]);
      }
    };
    fetchData();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Find containers
    const activeContainer = activeTask.status;
    const overContainer = columns.find(c => c.id === overId)?.id || tasks.find(t => t.id === overId)?.status;

    if (!overContainer) return;

    if (activeContainer !== overContainer) {
      // Movendo entre colunas
      const updatedTask = { ...activeTask, status: overContainer };
      
      // Optimistic update
      setTasks(prevTasks => {
        const newTasks = [...prevTasks];
        const taskIndex = newTasks.findIndex(t => t.id === activeId);
        if (taskIndex !== -1) {
          newTasks[taskIndex] = updatedTask;
        }
        return newTasks;
      });

      // API call
      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask)
        });
      } catch (error) {
        console.error('Error updating task status:', error);
      }

    } else {
      // Reordenando na mesma coluna
      const oldIndex = tasks.findIndex(t => t.id === activeId);
      const newIndex = tasks.findIndex(t => t.id === overId);
      setTasks(arrayMove(tasks, oldIndex, newIndex));
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(filterText.toLowerCase()) ||
    t.assignee?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleAddTask = (status: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: 'Nova Tarefa',
      status,
      company: currentCompany,
      dueDate: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      color: columns.find(c => c.id === status)?.color
    };
    setSelectedTask(newTask);
    setIsModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (updatedTask: Task) => {
    // Optimistic update
    setTasks(prev => {
      const exists = prev.find(t => t.id === updatedTask.id);
      if (exists) {
        return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
      } else {
        return [...prev, updatedTask];
      }
    });
    // Do not close modal here, as this is used for auto-save
    // setIsModalOpen(false);
    // setSelectedTask(null);

    // API Call
    try {
      const exists = tasks.some(t => t.id === updatedTask.id);
      const method = exists ? 'PUT' : 'POST';
      const url = exists ? `/api/tasks/${updatedTask.id}` : '/api/tasks';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setIsModalOpen(false);
    setSelectedTask(null);

    // API Call
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddColumnSubmit = async () => {
    if (!newColumnTitle.trim()) return;
    await createNewColumn(newColumnTitle);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const createNewColumn = async (title: string) => {
    const newColumn: ColumnType = {
      id: title.toUpperCase().replace(/\s+/g, '_'),
      title,
      color: '#64748b' // Default slate color
    };

    setColumns(prev => [...prev, newColumn]);

    // API Call
    try {
      await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newColumn)
      });
    } catch (error) {
      console.error('Error creating column:', error);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors">
      {/* Header do Kanban */}
      <div className="bg-white dark:bg-white/10 backdrop-blur-md border-b border-gray-200 dark:border-white/10 p-4 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="bg-blue-600 p-1.5 rounded-lg"><AlignLeft size={16} className="text-white" /></span>
            Tarefas
          </h1>
          <div className="h-6 w-px bg-gray-300 dark:bg-white/20"></div>
          <div className="flex -space-x-2">
             {users.slice(0, 5).map(u => (
               <div key={u.id} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-xs text-white font-bold overflow-hidden" title={u.name}>
                 {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.name.charAt(0)}
               </div>
             ))}
             {users.length > 5 && (
               <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-800 flex items-center justify-center text-xs text-white font-bold">
                 +{users.length - 5}
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar tarefas..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-600/50 text-gray-900 dark:text-white text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-blue-500 w-64 transition-all placeholder-gray-500 dark:placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={onDragStart} 
          onDragEnd={onDragEnd}
        >
          <div className="flex h-full items-start gap-3">
            {columns.map(col => (
              <Column
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={filteredTasks.filter(task => task.status === col.id)}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
              />
            ))}
            
            {/* Add Column Button */}
            {isAdmin && (
              isAddingColumn ? (
                <div className="w-80 shrink-0 bg-[#1e293b] p-3 rounded-lg border border-slate-700 shadow-xl animate-fade-in h-fit">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Nome da lista..."
                    className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 outline-none mb-2 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumnSubmit()}
                  />
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={handleAddColumnSubmit}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                      Adicionar
                    </button>
                    <button 
                      onClick={() => setIsAddingColumn(false)}
                      className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-700 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingColumn(true)}
                  className="w-80 shrink-0 h-12 bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center gap-2 px-4 text-gray-700 dark:text-white font-medium transition-colors border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none"
                >
                  <Plus size={20} />
                  Adicionar outra lista
                </button>
              )
            )}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Modal */}
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onSave={handleSaveTask}
        currentUser={currentUser}
        users={users}
        onAddStatus={createNewColumn}
        onDelete={handleDeleteTask}
      />
    </div>
  );
};
