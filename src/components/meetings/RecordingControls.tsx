import { useEffect } from 'react';
import { Mic, Pause, Play, Square, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useRecordingStore } from '../../stores/useRecordingStore';

interface Props {
  meetingId: string;
  onProcessed?: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function RecordingControls({ meetingId, onProcessed }: Props) {
  const {
    status,
    elapsedMs,
    isUploading,
    error,
    aiResult,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    uploadAndProcess,
    reset,
  } = useRecordingStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const { status: s } = useRecordingStore.getState();
      // Only auto-reset if not in a processing/done state
      if (s === 'RECORDING' || s === 'PAUSED') {
        useRecordingStore.getState().reset();
      }
    };
  }, []);

  // Notify parent when AI result is ready
  useEffect(() => {
    if (status === 'DONE' && aiResult && onProcessed) {
      onProcessed();
    }
  }, [status, aiResult, onProcessed]);

  const isRecording = status === 'RECORDING';
  const isPaused = status === 'PAUSED';
  const isStopped = status === 'STOPPED';
  const isProcessing = status === 'PROCESSING';
  const isDone = status === 'DONE';
  const isFailed = status === 'FAILED';
  const isIdle = status === 'IDLE';

  // Recording pulse indicator color
  const pulseColor = isRecording ? 'bg-red-500' : isPaused ? 'bg-yellow-500' : 'bg-gray-500';

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Mic size={20} className={isRecording ? 'text-red-400' : 'text-gray-400'} />
            {(isRecording || isPaused) && (
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${pulseColor} ${isRecording ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <div>
            <h4 className="text-white text-sm font-medium">
              {isIdle && 'Gravação com IA'}
              {isRecording && 'Gravando...'}
              {isPaused && 'Pausado'}
              {isStopped && 'Gravação finalizada'}
              {isProcessing && 'Processando com IA...'}
              {isDone && 'Relatório pronto'}
              {isFailed && 'Erro no processamento'}
            </h4>
            <p className="text-gray-500 text-xs">
              {isIdle && 'Clique para iniciar a gravação da reunião'}
              {(isRecording || isPaused) && 'O áudio está a ser gravado localmente'}
              {isStopped && 'Envie o áudio para processamento pela IA'}
              {isProcessing && 'Gemini 1.5 Flash a analisar...'}
              {isDone && 'Resumo e tarefas sugeridas disponíveis'}
              {isFailed && 'Tente enviar novamente'}
            </p>
          </div>
        </div>

        {/* Timer */}
        {!isIdle && !isDone && (
          <div className="text-right">
            <span className={`font-mono text-lg tabular-nums ${isRecording ? 'text-red-400' : 'text-gray-300'}`}>
              {formatTime(elapsedMs)}
            </span>
            {elapsedMs > 55 * 60 * 1000 && (
              <p className="text-yellow-500 text-xs mt-0.5">Perto do limite (60 min)</p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* IDLE: Start button */}
        {isIdle && (
          <button
            onClick={() => startRecording(meetingId)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center"
          >
            <Mic size={16} />
            Iniciar Gravação
          </button>
        )}

        {/* RECORDING: Pause + Stop */}
        {isRecording && (
          <>
            <button
              onClick={pauseRecording}
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center"
            >
              <Pause size={16} />
              Pausar
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center"
            >
              <Square size={16} />
              Parar
            </button>
          </>
        )}

        {/* PAUSED: Resume + Stop */}
        {isPaused && (
          <>
            <button
              onClick={resumeRecording}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center"
            >
              <Play size={16} />
              Retomar
            </button>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center"
            >
              <Square size={16} />
              Parar
            </button>
          </>
        )}

        {/* STOPPED: Upload + Process */}
        {isStopped && (
          <button
            onClick={uploadAndProcess}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center"
          >
            <Upload size={16} />
            Enviar para IA
          </button>
        )}

        {/* PROCESSING: Spinner */}
        {isProcessing && (
          <div className="flex items-center gap-2 bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm w-full justify-center">
            <Loader2 size={16} className="animate-spin" />
            A processar com Gemini...
          </div>
        )}

        {/* DONE / FAILED: Reset */}
        {(isDone || isFailed) && (
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full justify-center"
          >
            <Mic size={16} />
            Nova Gravação
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-900/20 border border-red-800 rounded-lg p-3">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
