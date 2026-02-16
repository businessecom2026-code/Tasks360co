import React, { useState, useEffect, useRef } from 'react';
import { Task, UserRole, Language, Column } from '../types';
import { Plus, MoreVertical, Calendar, List, Layout, Trash2, Edit2, ArrowLeft, ArrowRight, CheckCircle2, Image as ImageIcon, X, ChevronDown } from 'lucide-react';
import { translations } from '../i18n';

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  role: UserRole;
  language: Language;
}

const COLORS = [
  '#0d9488', // Teal (Brand)
  '#ef4444', // Red (Urgent)
  '#f97316', // Orange (High)
  '#eab308', // Yellow (Medium)
  '#3b82f6', // Blue (Info)
  '#8b5cf6', // Purple (Design)
  '#64748b'  // Slate (Default)
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, setTasks, role, language }) => {
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
    if (confirm("Are you sure? Tasks in this column will be moved to the first column.")) {
        const fallbackCol = columns.find(c => c.id !== columnId) || { id: 'PENDING', title: 'Pending' };
        setTasks(prev => prev.map(task => 
            task.status === columnId ? { ...task, status: fallbackCol.id } : task
        ));
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
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const addTask = (status: string) => {
    // Directly open modal for new task
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Task',
      status,
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      color: COLORS[6]
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
      setEditingTask(null);
  };

  const deleteTask = (id: string) => {
      if (confirm("Delete this task?")) {
          setTasks(prev => prev.filter(t => t.id !== id));
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
    return <div className="p-8 text-center text-gray-500">{t.accessDenied}</div>;
  }

  const getStatusColor = (columnId: string) => {
    if (columnId === 'PENDING') return 'bg-orange-50 text-orange-700 border-orange-100';
    if (columnId === 'IN_PROGRESS') return 'bg-teal-50 text-teal-700 border-teal-100';
    if (columnId === 'DONE') return 'bg-green-50 text-green-700 border-green-100';
    return 'bg-gray-50 text-gray-700 border-gray-100';
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-hidden flex flex-col relative bg-gray-50/50">
      {/* Edit Modal */}
      {editingTask && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800">{t.editModal.title}</h3>
                      <button onClick={() => setEditingTask(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-5">
                      {/* Image Preview / Upload */}
                      <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-700">{t.editModal.coverImage}</label>
                          {editingTask.image && (
                              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group shadow-sm">
                                  <img src={editingTask.image} alt="Cover" className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => setEditingTask({...editingTask, image: undefined})}
                                    className="absolute top-2 right-2 bg-white/90 text-red-500 p-2 rounded-full shadow-md hover:bg-red-50 transition-all"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          )}
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 text-sm text-teal-700 font-medium hover:bg-teal-50 px-4 py-3 rounded-xl border-2 border-dashed border-teal-100 transition-colors w-full justify-center bg-teal-50/50"
                          >
                              <ImageIcon size={18} /> {t.editModal.upload}
                          </button>
                      </div>

                      {/* Title */}
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{t.editModal.taskTitle}</label>
                          <input 
                            type="text" 
                            value={editingTask.title} 
                            onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-shadow bg-gray-50 focus:bg-white"
                          />
                      </div>

                      {/* Description */}
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">{t.editModal.description}</label>
                          <textarea 
                            value={editingTask.description || ''} 
                            onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none h-28 resize-none transition-shadow bg-gray-50 focus:bg-white"
                          />
                      </div>

                      {/* Meta: Date & Color */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">{t.columns.dueDate}</label>
                              <input 
                                type="date" 
                                value={editingTask.dueDate || ''}
                                onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">{t.editModal.changeColor}</label>
                              <div className="flex gap-3 flex-wrap">
                                  {COLORS.map(color => (
                                      <button 
                                        key={color}
                                        onClick={() => setEditingTask({...editingTask, color})}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform shadow-sm hover:scale-110 ${editingTask.color === color ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                      />
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50 items-center">
                      <button onClick={() => deleteTask(editingTask.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                          <Trash2 size={18} /> <span className="hidden sm:inline">{t.editModal.delete}</span>
                      </button>
                      <div className="flex gap-3">
                          <button onClick={() => setEditingTask(null)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">
                              {t.editModal.cancel}
                          </button>
                          <button onClick={saveTask} className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/10">
                              {t.editModal.save}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">{t.title}</h2>
        
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="bg-white p-1.5 rounded-xl flex gap-1 shadow-sm border border-gray-200">
                <button 
                    onClick={() => setViewMode('BOARD')}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'BOARD' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                    title={t.boardView}
                >
                    <Layout size={18} />
                    <span className="text-xs font-semibold hidden md:inline">{t.boardView}</span>
                </button>
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'LIST' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                    title={t.listView}
                >
                    <List size={18} />
                    <span className="text-xs font-semibold hidden md:inline">{t.listView}</span>
                </button>
            </div>

            {role === 'ADMIN' && (
            <button onClick={addColumn} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-teal-600/20 active:scale-95">
                <Plus size={18} />
                <span className="text-sm font-semibold">{t.addColumn}</span>
            </button>
            )}
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'BOARD' && (
      <div className="flex gap-4 md:gap-6 h-full overflow-x-auto pb-6 items-start snap-x snap-mandatory scroll-smooth px-1 md:px-0">
        {columns.map((col, index) => (
          <div key={col.id} className="min-w-[85vw] md:min-w-[320px] w-full max-w-md bg-gray-100 rounded-2xl flex flex-col h-full border border-gray-200 shrink-0 snap-center shadow-sm">
            {/* Column Header */}
            <div className={`p-4 font-semibold flex flex-col border-b ${getStatusColor(col.id)} rounded-t-2xl gap-3`}>
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <span className="truncate max-w-[180px] text-lg" title={col.title}>{col.title}</span>
                      <span className="text-xs bg-white/60 px-2.5 py-0.5 rounded-full font-bold">
                          {tasks.filter(t => t.status === col.id).length}
                      </span>
                  </div>
                  {role === 'ADMIN' && (
                      <div className="flex items-center gap-1 opacity-70 hover:opacity-100">
                          <button onClick={() => renameColumn(col.id)} className="p-1.5 hover:bg-black/5 rounded-lg transition"><Edit2 size={14} /></button>
                          <button onClick={() => deleteColumn(col.id)} className="p-1.5 hover:bg-red-500 hover:text-white rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                  )}
              </div>
              {role === 'ADMIN' && (
                  <div className="flex justify-between items-center mt-1 border-t border-black/5 pt-2">
                      <button disabled={index === 0} onClick={() => moveColumn(index, 'left')} className="disabled:opacity-20 p-1.5 hover:bg-black/5 rounded-lg"><ArrowLeft size={14} /></button>
                      <button onClick={() => addTask(col.id)} className="text-xs font-semibold flex items-center gap-1 hover:underline bg-white/50 px-3 py-1 rounded-lg"><Plus size={12}/> {t.addTask}</button>
                      <button disabled={index === columns.length - 1} onClick={() => moveColumn(index, 'right')} className="disabled:opacity-20 p-1.5 hover:bg-black/5 rounded-lg"><ArrowRight size={14} /></button>
                  </div>
              )}
            </div>
            
            {/* Tasks */}
            <div className="p-3 md:p-4 flex-1 overflow-y-auto space-y-3 hide-scrollbar">
              {tasks.filter(t => t.status === col.id).map(task => (
                <div 
                    key={task.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative overflow-hidden cursor-pointer"
                >
                  {/* Color Tag Strip */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: task.color || 'transparent' }}></div>
                  
                  {/* Image Preview */}
                  {task.image && (
                      <div className="w-full h-36 overflow-hidden border-b border-gray-100 relative">
                          <img src={task.image} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                  )}

                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 break-words flex-1 pr-2 leading-tight">{task.title}</h4>
                        <button onClick={(e) => {e.stopPropagation(); setEditingTask(task);}} className="text-gray-400 hover:text-teal-600 p-1 hover:bg-teal-50 rounded">
                            <Edit2 size={16} />
                        </button>
                    </div>
                    {task.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>}
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <div className="flex items-center text-xs font-medium text-gray-400 gap-1.5" title={t.syncedGCal}>
                            <Calendar size={14} className={task.dueDate ? "text-teal-500" : ""} />
                            {task.dueDate}
                            {task.dueDate && <CheckCircle2 size={12} className="text-teal-500 ml-1" />}
                        </div>
                        
                        <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {index > 0 && (
                                <button onClick={(e) => {e.stopPropagation(); moveTask(task.id, columns[index - 1].id)}} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg" title={t.moveLeft}>←</button>
                            )}
                            {index < columns.length - 1 && (
                                <button onClick={(e) => {e.stopPropagation(); moveTask(task.id, columns[index + 1].id)}} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded-lg" title={t.moveRight}>→</button>
                            )}
                        </div>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => addTask(col.id)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-sm font-medium hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center gap-2"
              >
                  <Plus size={16} /> {t.addTask}
              </button>
            </div>
          </div>
        ))}
        {/* Spacer for horizontal scroll feel on mobile */}
        <div className="min-w-[4px] h-full"></div>
      </div>
      )}

      {/* List View */}
      {viewMode === 'LIST' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex-1 overflow-y-auto">
              {/* Desktop Table View */}
              <table className="w-full text-left text-sm hidden md:table">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider">
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
                          <tr key={task.id} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="p-4 text-center">
                                  <div className="w-3 h-3 rounded-full mx-auto shadow-sm" style={{ backgroundColor: task.color || '#e2e8f0' }}></div>
                              </td>
                              <td className="p-4 font-medium text-gray-800">
                                  <div className="flex items-center gap-3">
                                    {task.image && <img src={task.image} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm" alt="" />}
                                    <span className="text-base">{task.title}</span>
                                  </div>
                              </td>
                              <td className="p-4">
                                  <div className="relative w-fit">
                                    <select 
                                        value={task.status} 
                                        onChange={(e) => moveTask(task.id, e.target.value)}
                                        className="appearance-none bg-gray-100 border-none rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-gray-600 uppercase tracking-wide focus:ring-2 focus:ring-teal-500 cursor-pointer"
                                    >
                                        {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown size={12}/></div>
                                  </div>
                              </td>
                              <td className="p-4 text-gray-500">
                                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">@{task.assignee || 'unassigned'}</span>
                              </td>
                              <td className="p-4 text-gray-500">
                                  <div className="flex items-center gap-2 text-xs">
                                    <Calendar size={14} className={task.dueDate ? "text-teal-500" : "text-gray-300"} />
                                    {task.dueDate || '-'}
                                  </div>
                              </td>
                              <td className="p-4 text-right">
                                  <button onClick={() => setEditingTask(task)} className="text-gray-400 hover:text-teal-600 bg-transparent hover:bg-teal-50 p-2 rounded-lg transition-colors"><Edit2 size={16}/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>

              {/* Mobile Card List View */}
              <div className="md:hidden p-4 space-y-4 pb-20">
                  {tasks.length === 0 && <div className="text-center text-gray-400 py-10">No tasks found.</div>}
                  {tasks.map(task => (
                      <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 active:scale-[0.99] transition-transform">
                          {/* Header: Color + Title + Edit */}
                          <div className="flex justify-between items-start gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                  <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: task.color || '#cbd5e1' }}></div>
                                  <div>
                                    <h4 className="font-semibold text-gray-800 text-lg leading-tight">{task.title}</h4>
                                    <span className="text-xs text-slate-500 font-medium">@{task.assignee || 'unassigned'}</span>
                                  </div>
                              </div>
                              <button onClick={() => setEditingTask(task)} className="p-2 bg-gray-50 text-gray-400 hover:text-teal-600 rounded-lg">
                                  <Edit2 size={18}/>
                              </button>
                          </div>
                          
                          {/* Image */}
                          {task.image && (
                              <div className="w-full h-40 rounded-lg overflow-hidden border border-gray-100">
                                  <img src={task.image} className="w-full h-full object-cover" alt="Task cover" />
                              </div>
                          )}

                          {/* Footer: Status Select + Date */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                              <div className="relative">
                                  <select 
                                    value={task.status} 
                                    onChange={(e) => moveTask(task.id, e.target.value)}
                                    className="appearance-none bg-gray-100 pl-3 pr-8 py-2 rounded-lg text-xs font-bold text-gray-600 uppercase tracking-wide focus:ring-2 focus:ring-teal-500 outline-none border border-transparent focus:border-teal-200"
                                  >
                                      {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                  </select>
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                      <ChevronDown size={12} />
                                  </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-gray-600 text-xs font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                  <Calendar size={14} className={task.dueDate ? "text-teal-500" : "text-gray-300"} />
                                  {task.dueDate || 'No Date'}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default KanbanBoard;