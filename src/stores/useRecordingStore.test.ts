import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRecordingStore } from './useRecordingStore';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
    upload: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../lib/api';

// Mock MediaRecorder as a class
let mockMediaRecorderInstance: {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  state: string;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
};

class MockMediaRecorder {
  start = vi.fn();
  stop = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  state = 'recording';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor() {
    mockMediaRecorderInstance = this;
  }

  static isTypeSupported = vi.fn(() => true);
}

vi.stubGlobal('MediaRecorder', MockMediaRecorder);

// Mock getUserMedia
const mockStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: vi.fn(() => Promise.resolve(mockStream)) },
  writable: true,
});

describe('useRecordingStore', () => {
  beforeEach(() => {
    useRecordingStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useRecordingStore.getState().reset();
  });

  it('should start with IDLE state', () => {
    const state = useRecordingStore.getState();
    expect(state.status).toBe('IDLE');
    expect(state.session).toBeNull();
    expect(state.elapsedMs).toBe(0);
    expect(state.aiResult).toBeNull();
  });

  it('should start recording successfully', async () => {
    const mockSession = {
      id: 'rec-1',
      meetingId: 'meet-1',
      status: 'RECORDING',
      totalDurationMs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      data: mockSession,
    });

    await useRecordingStore.getState().startRecording('meet-1');

    const state = useRecordingStore.getState();
    expect(state.status).toBe('RECORDING');
    expect(state.session).toEqual(mockSession);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(api.post).toHaveBeenCalledWith('/recordings/start', { meetingId: 'meet-1' });
  });

  it('should handle mic permission denied', async () => {
    const err = new DOMException('Permission denied', 'NotAllowedError');
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);

    await useRecordingStore.getState().startRecording('meet-1');

    const state = useRecordingStore.getState();
    expect(state.status).toBe('IDLE');
    expect(state.error).toContain('microfone');
  });

  it('should handle API error on start', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Erro no servidor',
    });

    await useRecordingStore.getState().startRecording('meet-1');

    const state = useRecordingStore.getState();
    expect(state.error).toBe('Erro no servidor');
  });

  it('should pause recording', async () => {
    // Setup recording state
    useRecordingStore.setState({
      session: { id: 'rec-1', meetingId: 'meet-1', status: 'RECORDING', totalDurationMs: 0, createdAt: '', updatedAt: '' },
      status: 'RECORDING',
      _mediaRecorder: { pause: vi.fn(), stop: vi.fn(), resume: vi.fn(), start: vi.fn(), state: 'recording', ondataavailable: null, onstop: null } as unknown as MediaRecorder,
      _recordStartTime: Date.now() - 5000,
      _accumulatedMs: 0,
      _timerInterval: setInterval(() => {}, 1000),
    });

    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useRecordingStore.getState().pauseRecording();

    const state = useRecordingStore.getState();
    expect(state.status).toBe('PAUSED');
    expect(state._accumulatedMs).toBeGreaterThan(0);
  });

  it('should resume recording', async () => {
    useRecordingStore.setState({
      session: { id: 'rec-1', meetingId: 'meet-1', status: 'PAUSED', totalDurationMs: 5000, createdAt: '', updatedAt: '' },
      status: 'PAUSED',
      _mediaRecorder: { pause: vi.fn(), stop: vi.fn(), resume: vi.fn(), start: vi.fn(), state: 'paused', ondataavailable: null, onstop: null } as unknown as MediaRecorder,
      _accumulatedMs: 5000,
    });

    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useRecordingStore.getState().resumeRecording();

    const state = useRecordingStore.getState();
    expect(state.status).toBe('RECORDING');
  });

  it('should stop recording', async () => {
    const mockRec = {
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(function (this: { onstop: (() => void) | null }) {
        if (this.onstop) this.onstop();
      }),
      state: 'recording',
      ondataavailable: null as ((e: { data: Blob }) => void) | null,
      onstop: null as (() => void) | null,
    };

    useRecordingStore.setState({
      session: { id: 'rec-1', meetingId: 'meet-1', status: 'RECORDING', totalDurationMs: 0, createdAt: '', updatedAt: '' },
      status: 'RECORDING',
      _mediaRecorder: mockRec as unknown as MediaRecorder,
      _stream: mockStream as unknown as MediaStream,
      _recordStartTime: Date.now() - 10000,
      _accumulatedMs: 0,
      _timerInterval: setInterval(() => {}, 1000),
    });

    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useRecordingStore.getState().stopRecording();

    const state = useRecordingStore.getState();
    expect(state.status).toBe('STOPPED');
    expect(state._mediaRecorder).toBeNull();
  });

  it('should upload and process recording', async () => {
    const mockAiResult = {
      summary: 'Test summary',
      suggestedTasks: [{ title: 'Task 1', deadline: '2026-03-15' }],
    };

    useRecordingStore.setState({
      session: { id: 'rec-1', meetingId: 'meet-1', status: 'STOPPED', totalDurationMs: 30000, createdAt: '', updatedAt: '' },
      status: 'STOPPED',
      _chunks: [new Blob(['audio-data'], { type: 'audio/webm' })],
    });

    (api.upload as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      data: {
        session: { id: 'rec-1', status: 'DONE' },
        aiResult: mockAiResult,
      },
    });

    await useRecordingStore.getState().uploadAndProcess();

    const state = useRecordingStore.getState();
    expect(state.status).toBe('DONE');
    expect(state.aiResult).toEqual(mockAiResult);
    expect(state.isUploading).toBe(false);
  });

  it('should handle upload failure', async () => {
    useRecordingStore.setState({
      session: { id: 'rec-1', meetingId: 'meet-1', status: 'STOPPED', totalDurationMs: 30000, createdAt: '', updatedAt: '' },
      status: 'STOPPED',
      _chunks: [new Blob(['audio-data'])],
    });

    (api.upload as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      error: 'Erro IA',
    });

    await useRecordingStore.getState().uploadAndProcess();

    const state = useRecordingStore.getState();
    expect(state.status).toBe('FAILED');
    expect(state.error).toBe('Erro IA');
  });

  it('should reset all state', () => {
    useRecordingStore.setState({
      status: 'DONE',
      session: { id: 'rec-1', meetingId: 'meet-1', status: 'DONE', totalDurationMs: 60000, createdAt: '', updatedAt: '' },
      elapsedMs: 60000,
      aiResult: { summary: 'test', suggestedTasks: [] },
    });

    useRecordingStore.getState().reset();

    const state = useRecordingStore.getState();
    expect(state.status).toBe('IDLE');
    expect(state.session).toBeNull();
    expect(state.elapsedMs).toBe(0);
    expect(state.aiResult).toBeNull();
  });

  it('should tick timer correctly', () => {
    const startTime = Date.now() - 5000;
    useRecordingStore.setState({
      _recordStartTime: startTime,
      _accumulatedMs: 10000,
    });

    useRecordingStore.getState().tick();

    const state = useRecordingStore.getState();
    // elapsedMs should be ~ 10000 + 5000 = 15000 (± timing tolerance)
    expect(state.elapsedMs).toBeGreaterThan(14000);
    expect(state.elapsedMs).toBeLessThan(16000);
  });
});
