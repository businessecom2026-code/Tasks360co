import React, { useState, useEffect, useRef } from 'react';
import { Task, UserRole, Language, Column, User } from '../types';
import { Plus, MoreHorizontal, Calendar, List, Layout, Trash2, Edit2, ArrowLeft, ArrowRight, Clock, AlignLeft, Image as ImageIcon, X, ChevronDown, UserCircle } from 'lucide-react';
import { translations } from '../i18n';

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  role: UserRole;
  language: Language;
  users?: User[]; 
  currentCompany: string;
}

// Trello-like vibrant colors
const COLORS = [
  '#4bce97', // Green
  '#e2b203', // Yellow
  '#faa53d', // Orange
  '#f87168', // Red
  '#9f8fef', // Purple
  '#579dff', // Blue
  '#94c748', // Lime
  '#6cc3e0', // Sky
  '#8590a2', // Gray
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, setTasks, role, language, users = [], currentCompany }) => {
  const t = translations[language].kanban;
  
  // View State
  const [viewMode, setViewMode] = useState<'BOARD' | 'LIST'>('BOARD');
  
  // Edit Modal State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flexible Columns State
  const [columns, setColumns] = useState<Column[]>([
    { id: 'PENDING', title: t.pending },
    { id: 'IN_PROGRESS', title: t.inProgress },
    { id: 'DONE', title: t.done }
  ]);

  // Sync Data Helper
  const syncTask = async (task: Task) => {
      try {
          await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(task)
          });
      } catch (e) {
          console.error("Failed to sync task", e);
      }
  };

  const removeTask = async (id: string) => {
      try {
          await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      } catch (e) {
          console.error("Failed to delete task", e);
      }
  };

  useEffect(() => {
    setColumns(prev => prev.map(col => {
      if (col.id === 'PENDING') return { ...col, title: t.pending };
      if (col.id === 'IN_PROGRESS') return { ...col, title: t.inProgress };
      if (col.id === 'DONE') return { ...col, title: t.done };
      return col;
    }));
  }, [language, t.pending, t.inProgress, t.done]);

  // Actions
  const addColumn = () => {
    const title = prompt(t.enterColumnTitle);
    if (!title) return;
    const newId = title.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now();
    setColumns([...columns, { id: newId, title }]);
  };

  const deleteColumn = (columnId: string) => {
    if (confirm("Tem certeza? As tarefas desta coluna serão movidas para a primeira coluna.")) {
        const fallbackCol = columns.find(c => c.id !== columnId) || { id: 'PENDING', title: 'Pending' };
        setTasks(prev => prev.map(task => {
            if (task.status === columnId) {
                const updated = { ...task, status: fallbackCol.id };
                syncTask(updated);
                return updated;
            }
            return task;
        }));
        setColumns(columns.filter(c => c.id !== columnId));
    }
  };

  const renameColumn = (columnId: string) => {
      const col = columns.find(c => c.id === columnId);
      if (!col) return;
      const newTitle = prompt(t.rename, col.title);
      if (newTitle) {
          setColumns(columns.map(c => c.id === columnId ? { ...c, title: newTitle } : c));
      }
  };

  const moveColumn = (index: number, direction: 'left' | 'right') => {
      if (direction === 'left' && index > 0) {
          const newCols = [...columns];
          [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
          setColumns(newCols);
      } else if (direction === 'right' && index < columns.length - 1) {
          const newCols = [...columns];
          [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
          setColumns(newCols);
      }
  };

  const moveTask = (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
            const updated = { ...t, status: newStatus };
            syncTask(updated);
            return updated;
        }
        return t;
    }));
  };

  const addTask = (status: string) => {
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Nova Tarefa',
      status,
      description: '',
      dueDate: '',
      color: '',
      company: currentCompany
    };
    setEditingTask(newTask);
  };

  const saveTask = () => {
      if (!editingTask) return;
      
      setTasks(prev => {
          const exists = prev.find(t => t.id === editingTask.id);
          if (exists) {
              return prev.map(t => t.id === editingTask.id ? editingTask : t);
          } else {
              return [...prev, editingTask];
          }
      });
      syncTask(editingTask);
      setEditingTask(null);
  };

  const deleteTask = (id: string) => {
      if (confirm("Excluir esta tarefa?")) {
          setTasks(prev => prev.filter(t => t.id !== id));
          removeTask(id);
          setEditingTask(null);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editingTask) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingTask({ ...editingTask, image: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  if (role === 'CLIENT') {
    return <div className="p-8 text-center text-gray-600 font-medium">{t.accessDenied}</div>;
  }

  const assignableUsers = users || []; 

  return (
    <div className="flex flex-col h-full bg-[#0079bf] relative overflow-hidden font-sans">
      {/* Background Image Effect (Trello Style) */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-teal-600 opacity-90 z-0"></div>
      
      {/* Edit Modal */}
      {editingTask && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-[#f4f5f7] rounded-xl shadow-2xl w-full max-w-[700px] overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-4 relative">
                      {editingTask.image && (
                          <div className="h-32 w-full mb-4 rounded-lg overflow-hidden relative group">
                             <img src={editingTask.image} className="w-full h-full object-cover" />
                             <button onClick={() => setEditingTask({...editingTask, image: undefined})} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded">
                                <Trash2 size={14}/>
                             </button>
                          </div>
                      )}
                      <button onClick={() => setEditingTask(null)} className="absolute top-4 right-4 p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                          <X size={20} />
                      </button>
                      <div className="flex items-start gap-3 mb-4">
                          <div className="mt-1"><Layout size={20} className="text-gray-700"/></div>
                          <div className="w-full">
                              <input 
                                type="text" 
                                value={editingTask.title} 
                                onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                                className="w-full text-xl font-bold bg-transparent border-2 border-transparent focus:bg-white focus:border-blue-600 rounded px-2 py-1 text-gray-800 focus:outline-none transition-colors"
                              />
                              <p className="text-sm text-gray-500 ml-2 mt-1">na lista <span className="font-bold underline">{columns.find(c => c.id === editingTask.status)?.title}</span></p>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col md:flex-row gap-8">
                      {/* Main Content */}
                      <div className="flex-1 space-y-6">
                          
                          {/* Description */}
                          <div className="space-y-2">
                              <div className="flex items-center gap-3 font-bold text-gray-700">
                                  <AlignLeft size={20} />
                                  <h3>{t.editModal.description}</h3>
                              </div>
                              <textarea 
                                value={editingTask.description || ''} 
                                onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                                placeholder="Adicione uma descrição mais detalhada..."
                                className="w-full bg-gray-200/50 hover:bg-gray-200 focus:bg-white border border-transparent focus:border-blue-600 rounded-lg p-3 min-h-[120px] text-gray-800 placeholder:text-gray-500 transition-all resize-none outline-none"
                              />
                          </div>

                          {/* Activity / Actions (Simplified for UI) */}
                          <div className="space-y-2">
                              <div className="flex items-center gap-3 font-bold text-gray-700">
                                  <List size={20} />
                                  <h3>Atividade</h3>
                              </div>
                              <div className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs">AI</div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-600 w-full shadow-sm">
                                      <span className="font-bold text-gray-800">Task 360 AI</span> criou este cartão.
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Sidebar Actions */}
                      <div className="w-full md:w-48 space-y-4 shrink-0">
                          <h4 className="text-xs font-bold text-gray-500 uppercase">Adicionar ao cartão</h4>
                          
                          {/* Assignee */}
                          <div className="relative group">
                              <div className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded flex items-center gap-2 cursor-pointer transition-colors text-sm">
                                  <UserCircle size={16} /> Membros
                              </div>
                              <select 
                                value={editingTask.assignee || ''} 
                                onChange={(e) => setEditingTask({...editingTask, assignee: e.target.value})}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              >
                                <option value="">Nenhum</option>
                                {assignableUsers.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                          </div>

                          {/* Labels */}
                          <div>
                              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Etiquetas</div>
                              <div className="grid grid-cols-4 gap-2">
                                  {COLORS.map(color => (
                                      <button 
                                        key={color}
                                        onClick={() => setEditingTask({...editingTask, color})}
                                        className={`h-8 rounded hover:opacity-80 transition-all ${editingTask.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                        style={{ backgroundColor: color }}
                                      />
                                  ))}
                              </div>
                          </div>

                          {/* Due Date */}
                          <div>
                               <div className="text-xs font-bold text-gray-500 uppercase mb-2">Datas</div>
                               <input 
                                type="date" 
                                value={editingTask.dueDate || ''}
                                onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                                className="w-full bg-gray-200 hover:bg-gray-300 rounded px-2 py-1.5 text-sm font-medium text-gray-700 outline-none"
                              />
                          </div>

                          {/* Cover */}
                          <div>
                               <div className="text-xs font-bold text-gray-500 uppercase mb-2">Capa</div>
                               <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                accept="image/*" 
                                className="hidden" 
                               />
                               <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded flex items-center gap-2 transition-colors text-sm"
                               >
                                  <ImageIcon size={16} /> Capa
                               </button>
                          </div>

                          <div className="h-px bg-gray-300 my-2"></div>

                          {/* Actions */}
                          <h4 className="text-xs font-bold text-gray-500 uppercase">Ações</h4>
                          <button onClick={() => deleteTask(editingTask.id)} className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium px-3 py-1.5 rounded flex items-center gap-2 transition-colors text-sm">
                              <Trash2 size={16} /> Excluir
                          </button>
                      </div>
                  </div>

                  <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end gap-2">
                      <button onClick={saveTask} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow-sm transition-colors">
                          Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header Controls */}
      <div className="relative z-10 px-4 py-3 flex justify-between items-center backdrop-blur-sm bg-black/20 text-white shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2">
            <Layout className="opacity-80" size={20}/> {t.title}
        </h2>
        
        <div className="flex items-center gap-2">
             <div className="bg-white/20 p-1 rounded-lg flex">
                <button onClick={() => setViewMode('BOARD')} className={`p-1.5 rounded ${viewMode === 'BOARD' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'}`}>
                    <Layout size={18} />
                </button>
                <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white text-blue-700' : 'text-white hover:bg-white/10'}`}>
                    <List size={18} />
                </button>
             </div>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'BOARD' && (
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 relative z-0">
        <div className="flex h-full gap-4 items-start">
            {columns.map((col, index) => (
            <div key={col.id} className="w-72 shrink-0 max-h-full flex flex-col bg-[#f1f2f4] rounded-xl shadow-lg">
                {/* Column Header */}
                <div className="p-3 pl-4 pr-2 font-semibold text-sm text-[#172b4d] flex justify-between items-center shrink-0 cursor-pointer group">
                    <div className="flex items-center gap-2 w-full" onClick={() => role === 'ADMIN' && renameColumn(col.id)}>
                        <span className="truncate">{col.title}</span>
                        <span className="text-xs text-gray-500 font-normal">{tasks.filter(t => t.status === col.id).length}</span>
                    </div>
                    {role === 'ADMIN' && (
                        <div className="relative group">
                            <button className="p-1.5 hover:bg-gray-300 rounded text-gray-600 transition-colors">
                                <MoreHorizontal size={16} />
                            </button>
                            {/* Dropdown Menu Simulation */}
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded shadow-xl border border-gray-200 hidden group-hover:block z-20 py-1">
                                <button onClick={() => deleteColumn(col.id)} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm">Excluir lista</button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <div className="px-4 py-1 text-xs text-gray-400">Mover lista</div>
                                <div className="flex justify-between px-2">
                                    <button disabled={index === 0} onClick={() => moveColumn(index, 'left')} className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"><ArrowLeft size={14}/></button>
                                    <button disabled={index === columns.length - 1} onClick={() => moveColumn(index, 'right')} className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"><ArrowRight size={14}/></button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Tasks List */}
                <div className="flex-1 overflow-y-auto px-2 py-0.5 space-y-2 custom-scrollbar">
                {tasks.filter(t => t.status === col.id).map(task => (
                    <div 
                        key={task.id} 
                        onClick={() => setEditingTask(task)}
                        className="group relative bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 cursor-pointer z-0 overflow-hidden hover:shadow-md transition-all"
                    >
                        {/* Cover Image */}
                        {task.image && (
                            <div className="h-32 w-full">
                                <img src={task.image} alt="cover" className="w-full h-full object-cover" />
                            </div>
                        )}

                        <div className="p-2.5">
                            {/* Labels */}
                            {task.color && (
                                <div className="mb-1.5">
                                    <div className="h-2 w-10 rounded-full" style={{ backgroundColor: task.color }}></div>
                                </div>
                            )}

                            {/* Title */}
                            <div className="text-[#172b4d] text-sm font-medium mb-1.5 leading-snug break-words">
                                {task.title}
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-3 text-gray-500 text-[11px] items-center">
                                {task.dueDate && (
                                    <div className={`flex items-center gap-1 rounded px-1 py-0.5 ${new Date(task.dueDate) < new Date() ? 'bg-red-100 text-red-600' : 'bg-transparent'}`}>
                                        <Clock size={12} />
                                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                    </div>
                                )}
                                {task.description && <AlignLeft size={12} />}
                                {task.assignee && (
                                    <div className="ml-auto flex items-center" title={`Assigned to ${task.assignee}`}>
                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 border border-white">
                                            {task.assignee.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hover Edit Icon (Trello style) */}
                        <button className="absolute top-2 right-2 p-1.5 bg-gray-100/80 hover:bg-gray-200 rounded text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit2 size={12} />
                        </button>
                        
                        {/* Quick Move Buttons (Visible on hover for accessibility without DnD) */}
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-md shadow-sm">
                             {index > 0 && (
                                <button onClick={(e) => {e.stopPropagation(); moveTask(task.id, columns[index - 1].id)}} className="hover:text-blue-600 p-0.5"><ArrowLeft size={12}/></button>
                            )}
                            {index < columns.length - 1 && (
                                <button onClick={(e) => {e.stopPropagation(); moveTask(task.id, columns[index + 1].id)}} className="hover:text-blue-600 p-0.5"><ArrowRight size={12}/></button>
                            )}
                        </div>
                    </div>
                ))}
                </div>

                {/* Footer - Add Card */}
                <div className="p-2 pt-1">
                    <button 
                        onClick={() => addTask(col.id)}
                        className="w-full flex items-center gap-2 p-2 text-left text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors font-medium"
                    >
                        <Plus size={16} />
                        {t.addTask}
                    </button>
                </div>
            </div>
            ))}

            {/* Add Column Button (Trello Style) */}
            {role === 'ADMIN' && (
                <button 
                    onClick={addColumn} 
                    className="w-72 shrink-0 h-12 bg-white/20 hover:bg-white/30 text-white rounded-xl flex items-center px-4 font-bold text-sm backdrop-blur-sm transition-colors border border-transparent hover:border-white/20"
                >
                    <Plus size={16} className="mr-2" />
                    {t.addColumn}
                </button>
            )}
            
            {/* Spacer */}
            <div className="w-4 shrink-0"></div>
        </div>
      </div>
      )}

      {/* List View */}
      {viewMode === 'LIST' && (
          <div className="flex-1 bg-white relative z-0 overflow-y-auto m-4 rounded-xl shadow-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold tracking-wider sticky top-0">
                      <tr>
                          <th className="p-4 w-12"></th>
                          <th className="p-4">{t.columns.title}</th>
                          <th className="p-4">{t.columns.status}</th>
                          <th className="p-4">{t.columns.assignee}</th>
                          <th className="p-4">{t.columns.dueDate}</th>
                          <th className="p-4 text-right">{t.columns.actions}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {tasks.map(task => (
                          <tr key={task.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setEditingTask(task)}>
                              <td className="p-4 text-center">
                                  <div className="w-8 h-2 rounded-full mx-auto" style={{ backgroundColor: task.color || '#e2e8f0' }}></div>
                              </td>
                              <td className="p-4 font-bold text-gray-900">
                                  {task.title}
                              </td>
                              <td className="p-4">
                                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                                      {columns.find(c => c.id === task.status)?.title || task.status}
                                  </span>
                              </td>
                              <td className="p-4 text-gray-600">
                                  <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                                          {task.assignee ? task.assignee.charAt(0) : '-'}
                                      </div>
                                      {task.assignee || '—'}
                                  </div>
                              </td>
                              <td className="p-4 text-gray-600">
                                  {task.dueDate}
                              </td>
                              <td className="p-4 text-right">
                                  <button onClick={(e) => {e.stopPropagation(); deleteTask(task.id)}} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

export default KanbanBoard;