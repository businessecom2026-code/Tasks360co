import { Video, Calendar, Users, ExternalLink, Trash2 } from 'lucide-react';
import type { Meeting } from '../../types';

interface Props {
  meetings: Meeting[];
  onDelete?: (id: string) => void;
  onSelect?: (meeting: Meeting) => void;
}

export function MeetingList({ meetings, onDelete, onSelect }: Props) {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-12">
        <Video size={40} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">Nenhuma reunião encontrada</p>
        <p className="text-gray-600 text-sm mt-1">Crie uma reunião ou faça upload de uma gravação</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer"
          onClick={() => onSelect?.(meeting)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-white font-medium">{meeting.title}</h4>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {meeting.date} às {meeting.time}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {meeting.participants.length} participante(s)
                </span>
                {meeting.platform && (
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{meeting.platform}</span>
                )}
              </div>

              {meeting.summary && (
                <div className="mt-3 bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Resumo IA:</p>
                  <p className="text-sm text-gray-300">{meeting.summary}</p>
                </div>
              )}

              {meeting.suggestedTasks && meeting.suggestedTasks.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-green-500 font-medium">
                    {meeting.suggestedTasks.length} tarefa(s) sugerida(s) pela IA
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {meeting.link && (
                <a
                  href={meeting.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-500 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(meeting.id);
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
