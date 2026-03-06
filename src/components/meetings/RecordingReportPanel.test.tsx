import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordingReportPanel } from './RecordingReportPanel';
import { useRecordingStore } from '../../stores/useRecordingStore';
import { useTaskStore } from '../../stores/useTaskStore';

// Mock stores
vi.mock('../../stores/useRecordingStore', () => ({
  useRecordingStore: vi.fn(),
}));

vi.mock('../../stores/useTaskStore', () => ({
  useTaskStore: vi.fn(),
}));

// Mock PDF generation
vi.mock('../../lib/meetingPdf', () => ({
  generateMeetingPdf: vi.fn(),
}));

const mockInjectSuggestedTasks = vi.fn();

const baseMeeting = {
  id: 'meet-1',
  title: 'Reunião Sprint 10',
  date: '2026-03-06',
  time: '10:00',
  participants: ['Alice', 'Bob'],
  workspaceId: 'ws-1',
  createdAt: '2026-03-06T10:00:00Z',
  updatedAt: '2026-03-06T11:00:00Z',
};

describe('RecordingReportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useTaskStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: { injectSuggestedTasks: typeof mockInjectSuggestedTasks }) => unknown) => {
        const state = { injectSuggestedTasks: mockInjectSuggestedTasks };
        return selector ? selector(state) : state;
      }
    );
  });

  function mockRecordingState(overrides: Record<string, unknown> = {}) {
    const state = { aiResult: null, status: 'IDLE', ...overrides };
    (useRecordingStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: typeof state) => unknown) =>
        selector ? selector(state) : state
    );
  }

  it('should not render when no summary', () => {
    mockRecordingState();
    const { container } = render(<RecordingReportPanel meeting={baseMeeting} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render meeting summary from saved data', () => {
    mockRecordingState();

    const meeting = {
      ...baseMeeting,
      summary: 'Discussão sobre deploy de produção',
      suggestedTasks: [
        { title: 'Fazer deploy', deadline: '2026-03-10' },
        { title: 'Atualizar docs' },
      ],
    };

    render(<RecordingReportPanel meeting={meeting} />);

    expect(screen.getByText('Resumo da Reunião')).toBeInTheDocument();
    expect(screen.getByText('Discussão sobre deploy de produção')).toBeInTheDocument();
    expect(screen.getByText('Tarefas Sugeridas (2)')).toBeInTheDocument();
    expect(screen.getByText('Fazer deploy')).toBeInTheDocument();
    expect(screen.getByText('até 2026-03-10')).toBeInTheDocument();
    expect(screen.getByText('Atualizar docs')).toBeInTheDocument();
  });

  it('should render fresh AI result from recording store', () => {
    mockRecordingState({
      status: 'DONE',
      aiResult: {
        summary: 'Resumo da gravação fresca',
        suggestedTasks: [{ title: 'Nova tarefa IA' }],
      },
    });

    render(<RecordingReportPanel meeting={baseMeeting} />);

    expect(screen.getByText('Relatório da Gravação (IA)')).toBeInTheDocument();
    expect(screen.getByText('Resumo da gravação fresca')).toBeInTheDocument();
    expect(screen.getByText('Nova tarefa IA')).toBeInTheDocument();
  });

  it('should show approve button and inject tasks into Kanban', async () => {
    mockRecordingState();

    const meeting = {
      ...baseMeeting,
      summary: 'Resumo teste',
      suggestedTasks: [{ title: 'Task 1' }, { title: 'Task 2' }],
    };

    mockInjectSuggestedTasks.mockResolvedValueOnce(undefined);

    render(<RecordingReportPanel meeting={meeting} onTasksInjected={vi.fn()} />);

    const btn = screen.getByText('Aprovar e Injetar no Kanban');
    await userEvent.click(btn);

    expect(mockInjectSuggestedTasks).toHaveBeenCalledWith(meeting.suggestedTasks);
  });

  it('should show PDF download button', () => {
    mockRecordingState();

    const meeting = {
      ...baseMeeting,
      summary: 'Resumo com PDF',
    };

    render(<RecordingReportPanel meeting={meeting} />);

    expect(screen.getByText('PDF')).toBeInTheDocument();
  });
});
