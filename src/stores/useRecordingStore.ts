/**
 * Recording Store — manages browser-side MediaRecorder state + API sync.
 *
 * Flow: START → (chunks via ondataavailable to IndexedDB) → PAUSE/RESUME → STOP
 *       → concat blobs → upload to /api/recordings/:id/upload → AI processes → DONE
 */

import { create } from 'zustand';
import { api } from '../lib/api';
import type { RecordingSession, RecordingStatus } from '../types';

interface AiResult {
  summary: string;
  suggestedTasks: { title: string; deadline?: string }[];
}

interface RecordingState {
  // Server session
  session: RecordingSession | null;
  // Client-side
  status: RecordingStatus;
  elapsedMs: number;
  isUploading: boolean;
  error: string | null;
  aiResult: AiResult | null;

  // Actions
  startRecording: (meetingId: string) => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  uploadAndProcess: () => Promise<void>;
  reset: () => void;
  tick: () => void;

  // Internal refs (not persisted)
  _mediaRecorder: MediaRecorder | null;
  _chunks: Blob[];
  _stream: MediaStream | null;
  _timerInterval: ReturnType<typeof setInterval> | null;
  _recordStartTime: number;
  _accumulatedMs: number;
}

const INITIAL: Pick<RecordingState, 'session' | 'status' | 'elapsedMs' | 'isUploading' | 'error' | 'aiResult' | '_mediaRecorder' | '_chunks' | '_stream' | '_timerInterval' | '_recordStartTime' | '_accumulatedMs'> = {
  session: null,
  status: 'IDLE',
  elapsedMs: 0,
  isUploading: false,
  error: null,
  aiResult: null,
  _mediaRecorder: null,
  _chunks: [],
  _stream: null,
  _timerInterval: null,
  _recordStartTime: 0,
  _accumulatedMs: 0,
};

export const useRecordingStore = create<RecordingState>((set, get) => ({
  ...INITIAL,

  startRecording: async (meetingId: string) => {
    try {
      set({ error: null, status: 'IDLE' });

      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Create server session
      const res = await api.post<RecordingSession>('/recordings/start', { meetingId });
      if (!res.success || !res.data) {
        stream.getTracks().forEach((t) => t.stop());
        set({ error: res.error || 'Erro ao iniciar gravação no servidor' });
        return;
      }

      // 3. Setup MediaRecorder (local buffer strategy)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start(30_000); // chunk every 30s for resilience

      // 4. Start timer
      const startTime = Date.now();
      const interval = setInterval(() => get().tick(), 200);

      set({
        session: res.data,
        status: 'RECORDING',
        _mediaRecorder: recorder,
        _chunks: chunks,
        _stream: stream,
        _timerInterval: interval,
        _recordStartTime: startTime,
        _accumulatedMs: 0,
        elapsedMs: 0,
      });
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Permissão de microfone negada. Ative nas configurações do browser.'
        : (err as Error).message || 'Erro ao iniciar gravação';
      set({ error: msg, status: 'IDLE' });
    }
  },

  pauseRecording: async () => {
    const { session, _mediaRecorder, _timerInterval, _recordStartTime, _accumulatedMs } = get();
    if (!session || !_mediaRecorder) return;

    try {
      _mediaRecorder.pause();
      if (_timerInterval) clearInterval(_timerInterval);

      const segmentMs = Date.now() - _recordStartTime;
      const totalAccumulated = _accumulatedMs + segmentMs;

      await api.patch(`/recordings/${session.id}/pause`);

      set({
        status: 'PAUSED',
        _timerInterval: null,
        _accumulatedMs: totalAccumulated,
        elapsedMs: totalAccumulated,
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  resumeRecording: async () => {
    const { session, _mediaRecorder } = get();
    if (!session || !_mediaRecorder) return;

    try {
      _mediaRecorder.resume();

      await api.patch(`/recordings/${session.id}/resume`);

      const startTime = Date.now();
      const interval = setInterval(() => get().tick(), 200);

      set({
        status: 'RECORDING',
        _timerInterval: interval,
        _recordStartTime: startTime,
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  stopRecording: async () => {
    const { session, _mediaRecorder, _stream, _timerInterval, _recordStartTime, _accumulatedMs, status } = get();
    if (!session || !_mediaRecorder) return;

    try {
      // Stop timer
      if (_timerInterval) clearInterval(_timerInterval);

      // Calculate final duration
      let finalMs = _accumulatedMs;
      if (status === 'RECORDING') {
        finalMs += Date.now() - _recordStartTime;
      }

      // Stop MediaRecorder — triggers final ondataavailable
      await new Promise<void>((resolve) => {
        _mediaRecorder.onstop = () => resolve();
        _mediaRecorder.stop();
      });

      // Stop mic
      _stream?.getTracks().forEach((t) => t.stop());

      await api.patch(`/recordings/${session.id}/stop`);

      set({
        status: 'STOPPED',
        _timerInterval: null,
        _stream: null,
        _mediaRecorder: null,
        elapsedMs: finalMs,
        _accumulatedMs: finalMs,
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  uploadAndProcess: async () => {
    const { session, _chunks } = get();
    if (!session || _chunks.length === 0) return;

    set({ isUploading: true, error: null, status: 'PROCESSING' });

    try {
      const blob = new Blob(_chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, `recording-${session.id}.webm`);

      const res = await api.upload<{ session: RecordingSession; aiResult: AiResult }>(
        `/recordings/${session.id}/upload`,
        formData
      );

      if (!res.success || !res.data) {
        set({ error: res.error || 'Erro ao processar gravação', isUploading: false, status: 'FAILED' });
        return;
      }

      set({
        status: 'DONE',
        isUploading: false,
        aiResult: res.data.aiResult,
        session: res.data.session,
      });
    } catch (err) {
      set({ error: (err as Error).message, isUploading: false, status: 'FAILED' });
    }
  },

  tick: () => {
    const { _recordStartTime, _accumulatedMs } = get();
    const segmentMs = Date.now() - _recordStartTime;
    set({ elapsedMs: _accumulatedMs + segmentMs });
  },

  reset: () => {
    const { _timerInterval, _stream, _mediaRecorder } = get();
    if (_timerInterval) clearInterval(_timerInterval);
    _stream?.getTracks().forEach((t) => t.stop());
    if (_mediaRecorder?.state !== 'inactive') {
      try { _mediaRecorder?.stop(); } catch { /* ignore */ }
    }
    set({ ...INITIAL });
  },
}));
