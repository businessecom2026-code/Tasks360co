import React, { useState, useEffect } from 'react';
import { 
  X, 
  AlignLeft, 
  Type, 
  List, 
  Bold, 
  Italic, 
  User, 
  Tag, 
  Calendar, 
  CheckSquare, 
  Plus, 
  MessageSquare, 
  Clock,
  Send,
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Task, ChecklistItem, User as UserType } from '../../types';
import { GoogleGenAI } from "@google/genai";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (updatedTask: Task) => void;
  currentUser: UserType;
  users: UserType[];
  availableTags?: string[];
  onAddStatus?: (newStatus: string) => void;
  onDelete?: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave, currentUser, users, availableTags = ['Urgente', 'Design', 'Dev', 'Marketing'], onAddStatus, onDelete }) => {
  const isAdmin = currentUser.email === 'admin@ecom360.co';
  const isClient = currentUser.role === 'CLIENT';
  const canEdit = !isClient;

  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{user: string, text: string, time: string}[]>([]);

  // UI States
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleGenerateChecklist = async () => {
    if (!description.trim()) return;

    setIsGeneratingChecklist(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Analise a seguinte descrição de tarefa e crie um checklist com passos práticos e diretos para completá-la.
        Retorne APENAS um array JSON de strings (ex: ["Passo 1", "Passo 2"]).
        Não use markdown, não use blocos de código, apenas o array cru.
        
        Descrição: "${description}"
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const text = response.text || '[]';
      // Limpar markdown se houver
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let items: string[] = [];
      try {
        items = JSON.parse(cleanText);
      } catch (e) {
        console.error("Failed to parse JSON", e);
      }

      if (Array.isArray(items) && items.length > 0) {
        const newItems: ChecklistItem[] = items.map(text => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          text,
          isCompleted: false
        }));
        
        const updatedChecklist = [...checklist, ...newItems];
        setChecklist(updatedChecklist);
        triggerSave({ checklist: updatedChecklist });
        setShowChecklistInput(true);
      }
    } catch (error) {
      console.error("Erro ao gerar checklist:", error);
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setDueDate(task.dueDate || '');
      setSelectedMembers(task.members || []);
      setSelectedTags(task.tags || []);
      setChecklist(task.checklist || []);
      
      // Mock comments if none exist
      setComments([
        { user: 'Sistema', text: `Tarefa criada em ${task.id ? 'uma data anterior' : 'agora'}`, time: 'Há 2 dias' }
      ]);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  // Helper to construct current task object and save
  const triggerSave = async (updates: Partial<Task>) => {
    if (!canEdit || !task) return;
    
    setIsSaving(true);
    
    // Construct the updated task using current state + updates
    // We use the functional state updates in the handlers usually, but here we need the latest values.
    // Since this is called directly with the new value for the specific field being changed, 
    // we can rely on the other state variables for the rest, assuming they haven't changed in the same tick.
    
    const updatedTask: Task = {
      ...task,
      title: updates.title !== undefined ? updates.title : title,
      description: updates.description !== undefined ? updates.description : description,
      status: updates.status !== undefined ? updates.status : status,
      dueDate: updates.dueDate !== undefined ? updates.dueDate : dueDate,
      members: updates.members !== undefined ? updates.members : selectedMembers,
      tags: updates.tags !== undefined ? updates.tags : selectedTags,
      checklist: updates.checklist !== undefined ? updates.checklist : checklist,
      // Preserve other fields
      id: task.id,
      company: task.company
    };

    try {
      await onSave(updatedTask);
      // Update local state to match (in case onSave modifies it, though usually it just persists)
    } catch (error) {
      console.error("Failed to save", error);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleTitleBlur = () => {
    if (title !== task?.title) {
      triggerSave({ title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task?.description) {
      triggerSave({ description });
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem,
      isCompleted: false
    };
    const newChecklist = [...checklist, newItem];
    setChecklist(newChecklist);
    setNewChecklistItem('');
    triggerSave({ checklist: newChecklist });
  };

  const toggleChecklistItem = (id: string) => {
    const newChecklist = checklist.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    );
    setChecklist(newChecklist);
    triggerSave({ checklist: newChecklist });
  };

  const deleteChecklistItem = (id: string) => {
    const newChecklist = checklist.filter(item => item.id !== id);
    setChecklist(newChecklist);
    triggerSave({ checklist: newChecklist });
  };

  const handleMemberToggle = (userId: string) => {
    const newMembers = selectedMembers.includes(userId) 
      ? selectedMembers.filter(id => id !== userId) 
      : [...selectedMembers, userId];
    setSelectedMembers(newMembers);
    triggerSave({ members: newMembers });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    triggerSave({ tags: newTags });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDueDate(newDate);
    triggerSave({ dueDate: newDate });
  };

  const handleAddStatus = () => {
    if (newStatusName.trim() && onAddStatus) {
      const statusId = newStatusName.toUpperCase().replace(/\s+/g, '_');
      onAddStatus(newStatusName);
      setStatus(statusId);
      setIsAddingStatus(false);
      setNewStatusName('');
      triggerSave({ status: statusId });
    }
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    setComments(prev => [{
      user: currentUser.name,
      text: comment,
      time: 'Agora mesmo'
    }, ...prev]);
    setComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto py-10">
      <div className="bg-[#1a1a1a] w-full max-w-5xl min-h-[85vh] rounded-xl shadow-2xl flex flex-col text-gray-300 border border-gray-800 relative">
        
        {/* Header / Title Area */}
        <div className="p-6 pb-2 flex items-start justify-between shrink-0">
          <div className="flex-1 mr-8">
            <div className="flex items-center gap-3 mb-2 text-gray-400">
              <AlignLeft size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Título da Tarefa</span>
            </div>
            <input
              type="text"
              value={title}
              readOnly={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className={`w-full bg-transparent text-2xl font-bold text-white border-2 border-transparent ${canEdit ? 'hover:border-gray-700 focus:border-[#10b981]' : 'cursor-default'} rounded px-2 py-1 transition-all focus:outline-none`}
            />
            <div className="text-sm text-gray-500 mt-1 px-2 flex items-center gap-2">
              Na lista 
              {!isAddingStatus ? (
                <span 
                  className={`text-[#10b981] font-bold ${isAdmin ? 'underline decoration-dotted cursor-pointer hover:text-[#059669]' : ''}`}
                  onClick={() => isAdmin && setIsAddingStatus(true)}
                  title={isAdmin ? "Clique para mudar ou criar status" : "Status atual"}
                >
                  {status}
                </span>
              ) : (
                <div className="flex items-center gap-2 animate-fade-in">
                  <input 
                    type="text" 
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    placeholder="Nome do novo status..."
                    className="bg-gray-800 text-white text-xs p-1.5 rounded border border-gray-600 focus:border-[#10b981] outline-none min-w-[150px]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                  />
                  <button onClick={handleAddStatus} className="text-[#10b981] hover:text-white bg-gray-800 p-1 rounded"><CheckSquare size={14} /></button>
                  <button onClick={() => setIsAddingStatus(false)} className="text-red-500 hover:text-white bg-gray-800 p-1 rounded"><X size={14} /></button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!canEdit && (
              <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20 uppercase tracking-wider">
                Somente Leitura
              </span>
            )}
            {canEdit && onDelete && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-full transition-colors"
                title="Deletar Tarefa"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-3 flex flex-wrap gap-2 border-b border-gray-800 bg-[#1a1a1a] relative z-20">
          
          {/* Members Dropdown */}
          {isAdmin && (
          <div className="relative">
            <ActionButton 
              icon={<User size={16} />} 
              label="Membros" 
              onClick={() => setShowMemberSelect(!showMemberSelect)} 
              active={showMemberSelect}
            />
            {showMemberSelect && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#262626] border border-gray-700 rounded-lg shadow-xl p-2 z-50">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 px-2">Atribuir a</h4>
                {users.map(user => (
                  <div 
                    key={user.id} 
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-700 ${selectedMembers.includes(user.id) ? 'bg-gray-700' : ''}`}
                    onClick={() => handleMemberToggle(user.id)}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white overflow-hidden">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-200">{user.name}</span>
                    {selectedMembers.includes(user.id) && <CheckSquare size={14} className="ml-auto text-[#10b981]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Tags Dropdown */}
          {isAdmin && (
          <div className="relative">
            <ActionButton 
              icon={<Tag size={16} />} 
              label="Etiquetas" 
              onClick={() => setShowTagSelect(!showTagSelect)}
              active={showTagSelect}
            />
            {showTagSelect && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#262626] border border-gray-700 rounded-lg shadow-xl p-2 z-50">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 px-2">Etiquetas</h4>
                {availableTags.map(tag => (
                  <div 
                    key={tag} 
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-700 ${selectedTags.includes(tag) ? 'bg-gray-700' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-200">{tag}</span>
                    {selectedTags.includes(tag) && <CheckSquare size={14} className="ml-auto text-[#10b981]" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Due Date Input */}
          <div className="relative flex items-center">
             <div className="absolute left-3 pointer-events-none text-gray-400">
               <Calendar size={16} />
             </div>
             <input 
               type="date" 
               value={(() => {
                 if (!dueDate) return '';
                 const date = new Date(dueDate);
                 return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
               })()}
               onChange={handleDateChange}
               className="bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 rounded px-3 py-1.5 pl-9 text-sm font-medium focus:outline-none focus:border-[#10b981] transition-colors cursor-pointer"
             />
          </div>

          <ActionButton icon={<CheckSquare size={16} />} label="Checklist" onClick={() => setShowChecklistInput(!showChecklistInput)} active={showChecklistInput} />
          
          <div className="w-px h-6 bg-gray-700 mx-2 self-center"></div>
          
          <div className="ml-auto flex items-center gap-3">
            {isSaving && <span className="text-xs text-gray-400 animate-pulse">Salvando...</span>}
            {!isSaving && <span className="text-xs text-gray-500">Salvo</span>}
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-bold bg-gray-700 text-white hover:bg-gray-600 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Column: Description & Details */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-gray-800">
            
            {/* Metadata Section */}
            <div className="flex flex-wrap gap-6 mb-8">
              {selectedMembers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Membros</h4>
                  <div className="flex -space-x-2">
                    {users.filter(u => selectedMembers.includes(u.id)).map(user => (
                      <div key={user.id} className="w-8 h-8 rounded-full border-2 border-[#1a1a1a] bg-gray-600 flex items-center justify-center text-xs text-white font-bold overflow-hidden" title={user.name}>
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                      </div>
                    ))}
                    <button onClick={() => setShowMemberSelect(true)} className="w-8 h-8 rounded-full border-2 border-[#1a1a1a] bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {selectedTags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Etiquetas</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(tag => (
                      <span key={tag} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">
                        {tag}
                      </span>
                    ))}
                    <button onClick={() => setShowTagSelect(true)} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded text-xs font-bold transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {dueDate && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Data de Entrega</h4>
                  <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded text-sm text-gray-200">
                    <Calendar size={14} className="text-[#10b981]" />
                    <span>{new Date(dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Type size={18} className="text-[#10b981]" />
                  Descrição
                </h3>
                <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                  <FormatButton icon={<Bold size={14} />} />
                  <FormatButton icon={<Italic size={14} />} />
                  <FormatButton icon={<List size={14} />} />
                </div>
              </div>
              <textarea
                value={description}
                readOnly={!canEdit}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder={canEdit ? "Adicione uma descrição mais detalhada..." : "Sem descrição."}
                className={`w-full h-32 bg-[#262626] text-gray-300 p-4 rounded-lg border border-gray-700 ${canEdit ? 'focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]' : 'cursor-default'} transition-all resize-none focus:outline-none leading-relaxed`}
              />
            </div>

            {/* Checklist Section */}
            {(checklist.length > 0 || showChecklistInput) && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CheckSquare size={18} className="text-[#10b981]" />
                      Checklist
                    </h3>
                    {canEdit && description.trim().length > 10 && (
                      <button 
                        onClick={handleGenerateChecklist}
                        disabled={isGeneratingChecklist}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 text-xs font-bold border border-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Gerar itens com IA baseados na descrição"
                      >
                        {isGeneratingChecklist ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {isGeneratingChecklist ? 'Gerando...' : 'Gerar com IA'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => setChecklist([])} className="text-xs text-red-400 hover:text-red-300">Excluir</button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-gray-500 w-8">{checklistProgress}%</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#10b981] transition-all duration-300" 
                      style={{ width: `${checklistProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="space-y-2 mb-3">
                  {checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-3 group">
                      <input 
                        type="checkbox" 
                        checked={item.isCompleted} 
                        onChange={() => toggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded border-gray-600 text-[#10b981] focus:ring-[#10b981] bg-gray-700 cursor-pointer"
                      />
                      <span className={`flex-1 text-sm ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                        {item.text}
                      </span>
                      <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Item Input */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    placeholder="Adicionar um item..."
                    className="flex-1 bg-[#262626] border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:border-[#10b981] outline-none"
                  />
                  <button 
                    onClick={handleAddChecklistItem}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Activity */}
          <div className="w-full md:w-96 bg-[#202020] p-6 overflow-y-auto custom-scrollbar flex flex-col border-l border-gray-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Clock size={18} className="text-[#10b981]" />
              Atividade
            </h3>

            {/* New Comment Input */}
            <div className="mb-8">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Escreva um comentário..."
                      className="w-full bg-[#262626] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-[#10b981] focus:outline-none min-h-[80px] resize-y"
                    />
                    <button 
                      onClick={handleAddComment}
                      disabled={!comment.trim()}
                      className="absolute bottom-2 right-2 p-1.5 bg-[#10b981] text-white rounded-md hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-6">
              {comments.map((c, idx) => (
                <div key={idx} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-bold shrink-0 border border-gray-600">
                    {c.user.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-white text-sm">{c.user}</span>
                      <span className="text-xs text-gray-500">{c.time}</span>
                    </div>
                    <div className="bg-[#262626] p-3 rounded-lg rounded-tl-none mt-1 border border-gray-800 text-sm text-gray-300 shadow-sm group-hover:border-gray-700 transition-colors">
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#262626] p-6 rounded-xl border border-gray-700 shadow-2xl max-w-sm w-full text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Deletar Tarefa?</h3>
              <p className="text-gray-400 text-sm mb-6">
                Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (task && onDelete) onDelete(task.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                >
                  Sim, Deletar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Helper Components
const ActionButton = ({ icon, label, highlight = false, onClick, active = false }: { icon: React.ReactNode, label: string, highlight?: boolean, onClick?: () => void, active?: boolean }) => (
  <button 
    onClick={onClick}
    className={`
    flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors
    ${highlight 
      ? 'bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 border border-[#10b981]/30' 
      : active 
        ? 'bg-gray-700 text-white border border-gray-600'
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'}
  `}>
    {icon}
    <span>{label}</span>
  </button>
);

const FormatButton = ({ icon }: { icon: React.ReactNode }) => (
  <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
    {icon}
  </button>
);
