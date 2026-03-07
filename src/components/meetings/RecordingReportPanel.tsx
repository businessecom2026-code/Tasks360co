import { CheckCircle2, Download, Sparkles } from 'lucide-react';
import { useRecordingStore } from '../../stores/useRecordingStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { generateMeetingPdf } from '../../lib/meetingPdf';
import type { Meeting } from '../../types';

interface Props {
  meeting: Meeting;
  onTasksInjected?: () => void;
}

export function RecordingReportPanel({ meeting, onTasksInjected }: Props) {
  const { aiResult, status } = useRecordingStore();
  const { injectSuggestedTasks } = useTaskStore();

  // Show from store result or from meeting's saved summary
  const summary = aiResult?.summary || meeting.summary;
  const suggestedTasks = aiResult?.suggestedTasks || meeting.suggestedTasks;
  const isFromRecording = status === 'DONE' && aiResult !== null;

  if (!summary) return null;

  const handleApprove = async () => {
    if (!suggestedTasks?.length) return;
    await injectSuggestedTasks(suggestedTasks);
    onTasksInjected?.();
  };

  const handleDownloadPdf = () => {
    // Build a meeting-like object with potentially fresh AI data
    const meetingForPdf: Meeting = {
      ...meeting,
      summary: summary,
      suggestedTasks: suggestedTasks,
    };
    generateMeetingPdf(meetingForPdf);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-emerald-400">
            {isFromRecording ? (
              <>
                <Sparkles size={18} />
                <span className="font-medium text-sm">Relatório da Gravação (IA)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span className="font-medium text-sm">Resumo IA</span>
              </>
            )}
          </div>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-400 transition-colors text-xs"
            title="Download PDF"
          >
            <Download size={14} />
            PDF
          </button>
        </div>

        <h4 className="text-white font-medium mb-2">Resumo da Reunião</h4>
        <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
      </div>

      {/* Suggested tasks */}
      {suggestedTasks && suggestedTasks.length > 0 && (
        <div className="p-4">
          <h4 className="text-white font-medium mb-3">
            Tarefas Sugeridas ({suggestedTasks.length})
          </h4>
          <ul className="space-y-2 mb-4">
            {suggestedTasks.map((task, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                <span className="text-gray-300 flex-1">{task.title}</span>
                {task.deadline && (
                  <span className="text-gray-500 text-xs shrink-0">até {task.deadline}</span>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={handleApprove}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Aprovar e Injetar no Kanban
          </button>
        </div>
      )}
    </div>
  );
}
