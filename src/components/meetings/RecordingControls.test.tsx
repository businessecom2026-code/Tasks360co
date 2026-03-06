import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordingControls } from './RecordingControls';
import { useRecordingStore } from '../../stores/useRecordingStore';

// Mock the store
vi.mock('../../stores/useRecordingStore', () => {
  const store = vi.fn();
  store.getState = vi.fn(() => defaultStore);
  return { useRecordingStore: store };
});

const defaultStore = {
  status: 'IDLE' as const,
  elapsedMs: 0,
  isUploading: false,
  error: null as string | null,
  aiResult: null,
  startRecording: vi.fn(),
  pauseRecording: vi.fn(),
  resumeRecording: vi.fn(),
  stopRecording: vi.fn(),
  uploadAndProcess: vi.fn(),
  reset: vi.fn(),
};

function mockStoreState(overrides: Partial<typeof defaultStore>) {
  const state = { ...defaultStore, ...overrides };
  (useRecordingStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state
  );
  (useRecordingStore as unknown as { getState: () => typeof state }).getState = () => state;
}

describe('RecordingControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState({});
  });

  it('should render idle state with start button', () => {
    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Iniciar Gravação')).toBeInTheDocument();
    expect(screen.getByText('Gravação com IA')).toBeInTheDocument();
  });

  it('should call startRecording when clicking start', async () => {
    const startFn = vi.fn();
    mockStoreState({ startRecording: startFn });

    render(<RecordingControls meetingId="meet-1" />);
    await userEvent.click(screen.getByText('Iniciar Gravação'));

    expect(startFn).toHaveBeenCalledWith('meet-1');
  });

  it('should show Pause and Stop buttons when recording', () => {
    mockStoreState({ status: 'RECORDING', elapsedMs: 5000 });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Pausar')).toBeInTheDocument();
    expect(screen.getByText('Parar')).toBeInTheDocument();
    expect(screen.getByText('Gravando...')).toBeInTheDocument();
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('should show Resume and Stop buttons when paused', () => {
    mockStoreState({ status: 'PAUSED', elapsedMs: 30000 });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Retomar')).toBeInTheDocument();
    expect(screen.getByText('Parar')).toBeInTheDocument();
    expect(screen.getByText('Pausado')).toBeInTheDocument();
    expect(screen.getByText('00:30')).toBeInTheDocument();
  });

  it('should show Upload button when stopped', () => {
    mockStoreState({ status: 'STOPPED', elapsedMs: 60000 });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Enviar para IA')).toBeInTheDocument();
    expect(screen.getByText('Gravação finalizada')).toBeInTheDocument();
  });

  it('should call uploadAndProcess when clicking upload', async () => {
    const uploadFn = vi.fn();
    mockStoreState({ status: 'STOPPED', elapsedMs: 60000, uploadAndProcess: uploadFn });

    render(<RecordingControls meetingId="meet-1" />);
    await userEvent.click(screen.getByText('Enviar para IA'));

    expect(uploadFn).toHaveBeenCalled();
  });

  it('should show processing spinner', () => {
    mockStoreState({ status: 'PROCESSING', elapsedMs: 60000 });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('A processar com Gemini...')).toBeInTheDocument();
  });

  it('should show New Recording button when done', () => {
    mockStoreState({ status: 'DONE', aiResult: { summary: 'test', suggestedTasks: [] } });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Nova Gravação')).toBeInTheDocument();
    expect(screen.getByText('Relatório pronto')).toBeInTheDocument();
  });

  it('should show error message', () => {
    mockStoreState({ error: 'Permissão de microfone negada' });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Permissão de microfone negada')).toBeInTheDocument();
  });

  it('should show 60-min warning when near limit', () => {
    mockStoreState({ status: 'RECORDING', elapsedMs: 56 * 60 * 1000 }); // 56 minutes

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Perto do limite (60 min)')).toBeInTheDocument();
  });

  it('should format timer correctly for hours', () => {
    mockStoreState({ status: 'RECORDING', elapsedMs: 3661000 }); // 1h 1m 1s

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('should show failed state with reset button', () => {
    mockStoreState({ status: 'FAILED', error: 'Falha ao enviar áudio' });

    render(<RecordingControls meetingId="meet-1" />);
    expect(screen.getByText('Erro no processamento')).toBeInTheDocument();
    expect(screen.getByText('Falha ao enviar áudio')).toBeInTheDocument();
    expect(screen.getByText('Nova Gravação')).toBeInTheDocument();
  });
});
