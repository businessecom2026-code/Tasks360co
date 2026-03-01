import { useState } from 'react';
import { Upload, AlertTriangle, FileAudio, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { SuggestedTask } from '../../types';
import { useTaskStore } from '../../stores/useTaskStore';

interface AiResult {
  summary: string;
  suggestedTasks: SuggestedTask[];
}

interface Props {
  meetingId?: string;
  onProcessed?: () => void;
}

export function MeetingUpload({ meetingId, onProcessed }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState('');
  const { injectSuggestedTasks } = useTaskStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'video/mp4', 'video/webm', 'text/plain'];
    if (!validTypes.includes(selected.type)) {
      setError('Formato não suportado. Use MP3, WAV, WebM, MP4 ou TXT.');
      return;
    }

    setFile(selected);
    setError('');
  };

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (meetingId) formData.append('meetingId', meetingId);

    const res = await api.upload<AiResult>('/meetings/process', formData);

    setIsProcessing(false);

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || 'Erro ao processar arquivo');
    }
  };

  const handleApproveTasks = async () => {
    if (!result?.suggestedTasks.length) return;
    await injectSuggestedTasks(result.suggestedTasks);
    onProcessed?.();
    setResult(null);
    setFile(null);
  };

  return (
    <div className="space-y-4">
      {/* 60-minute banner */}
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-yellow-400 font-medium">Limite de processamento</p>
          <p className="text-xs text-gray-400">
            Reuniões limitadas a 60 minutos para processamento de IA (Gemini 1.5 Flash).
            Arquivos maiores serão truncados.
          </p>
        </div>
      </div>

      {/* Upload area */}
      {!result && (
        <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-600 transition-colors">
          {!file ? (
            <label className="cursor-pointer block">
              <Upload size={32} className="mx-auto text-gray-500 mb-3" />
              <p className="text-gray-300 font-medium mb-1">
                Upload de gravação ou transcrição
              </p>
              <p className="text-gray-500 text-sm">
                MP3, WAV, WebM, MP4 ou TXT (máx. 60 min)
              </p>
              <input
                type="file"
                accept=".mp3,.wav,.webm,.mp4,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <FileAudio size={32} className="mx-auto text-blue-400" />
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-gray-500 text-sm">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => { setFile(null); setError(''); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Trocar arquivo
                </button>
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processando com IA...
                    </>
                  ) : (
                    'Processar com Gemini'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* AI Results */}
      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <CheckCircle2 size={18} />
              <span className="font-medium text-sm">Processamento concluído</span>
            </div>
            <h4 className="text-white font-medium mb-2">Resumo da Reunião</h4>
            <p className="text-gray-300 text-sm">{result.summary}</p>
          </div>

          {result.suggestedTasks.length > 0 && (
            <div className="p-4">
              <h4 className="text-white font-medium mb-3">
                Tarefas Sugeridas ({result.suggestedTasks.length})
              </h4>
              <ul className="space-y-2 mb-4">
                {result.suggestedTasks.map((task, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                    <span className="text-gray-300">{task.title}</span>
                    {task.deadline && (
                      <span className="text-gray-500 text-xs">até {task.deadline}</span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleApproveTasks}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Aprovar e Injetar no Kanban
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
