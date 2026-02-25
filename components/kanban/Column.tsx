import React from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  onAddTask?: (status: string) => void;
  onTaskClick?: (task: Task) => void;
}

export const Column: React.FC<ColumnProps> = ({ id, title, tasks, color = '#3b82f6', onAddTask, onTaskClick }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full">
      {/* Column Header */}
      <div className="bg-white rounded-t-lg border-t-4 shadow-sm p-4 mb-3 flex items-center justify-between" style={{ borderColor: color }}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-700">{title}</h3>
          <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <div className="w-1 h-1 rounded-full bg-current mb-0.5"></div>
          <div className="w-1 h-1 rounded-full bg-current mb-0.5"></div>
          <div className="w-1 h-1 rounded-full bg-current"></div>
        </button>
      </div>

      {/* Tasks Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <SortableContext id={id} items={tasks.map(t => t.id)}>
          <div ref={setNodeRef} className="min-h-[150px] pb-4">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </div>
        </SortableContext>
      </div>

      {/* Add Button */}
      {onAddTask && (
        <button 
          onClick={() => onAddTask(id)}
          className="mt-2 w-full py-2 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-dashed border-gray-300 transition-all font-medium text-sm"
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      )}
    </div>
  );
};
