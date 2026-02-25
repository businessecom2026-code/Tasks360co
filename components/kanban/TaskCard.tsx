import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { Calendar, User as UserIcon, AlignLeft } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick && onClick(task)}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3 hover:shadow-md transition-shadow group relative ${isDragging ? 'z-50' : ''}`}
    >
      {/* Color Tag */}
      {task.color && (
        <div 
          className="w-8 h-1.5 rounded-full mb-2" 
          style={{ backgroundColor: task.color }}
        />
      )}

      {/* Image Preview */}
      {task.image && (
        <div className="mb-2 rounded-md overflow-hidden h-24 w-full">
           <img src={task.image} alt="Task preview" className="w-full h-full object-cover" />
        </div>
      )}

      <h4 className="text-sm font-semibold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
        {task.title}
      </h4>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
           {task.dueDate && (
             <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
               <Calendar size={12} />
               <span>{task.dueDate}</span>
             </div>
           )}
           {task.description && (
             <div className="text-gray-400" title="Has description">
               <AlignLeft size={12} />
             </div>
           )}
        </div>

        {task.assignee && (
          <div className="flex items-center gap-1" title={`Assigned to ${task.assignee}`}>
             <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                {task.assignee.charAt(0).toUpperCase()}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
