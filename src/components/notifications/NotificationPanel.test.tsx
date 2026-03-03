import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPanel } from './NotificationPanel';
import { useNotificationStore } from '../../stores/useNotificationStore';

// Mock the store
vi.mock('../../stores/useNotificationStore', () => ({
  useNotificationStore: vi.fn(),
}));

const defaultStore = {
  notifications: [],
  unreadCount: 0,
  isOpen: true,
  setOpen: vi.fn(),
  fetchNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
};

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: typeof defaultStore) => unknown) =>
        selector ? selector({ ...defaultStore }) : { ...defaultStore }
    );
  });

  it('should not render when closed', () => {
    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: typeof defaultStore) => unknown) => {
        const state = { ...defaultStore, isOpen: false };
        return selector ? selector(state) : state;
      }
    );

    const { container } = render(<NotificationPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('should render empty state when no notifications', () => {
    render(<NotificationPanel />);
    expect(screen.getByText('Sem notificações')).toBeInTheDocument();
  });

  it('should render notifications', () => {
    const notifications = [
      {
        id: 'n1',
        userId: 'u1',
        type: 'task_assigned',
        title: 'Nova tarefa',
        body: 'Fix bug atribuída',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        userId: 'u1',
        type: 'task_moved',
        title: 'Tarefa movida',
        body: 'Deploy → DONE',
        read: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: typeof defaultStore) => unknown) => {
        const state = { ...defaultStore, notifications, unreadCount: 1 };
        return selector ? selector(state) : state;
      }
    );

    render(<NotificationPanel />);
    expect(screen.getByText('Nova tarefa')).toBeInTheDocument();
    expect(screen.getByText('Tarefa movida')).toBeInTheDocument();
    expect(screen.getByText('Fix bug atribuída')).toBeInTheDocument();
  });

  it('should show "Ler todas" button when there are unread notifications', () => {
    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: typeof defaultStore) => unknown) => {
        const state = { ...defaultStore, unreadCount: 3 };
        return selector ? selector(state) : state;
      }
    );

    render(<NotificationPanel />);
    expect(screen.getByText('Ler todas')).toBeInTheDocument();
  });

  it('should show unread count badge', () => {
    (useNotificationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector?: (s: typeof defaultStore) => unknown) => {
        const state = { ...defaultStore, unreadCount: 5 };
        return selector ? selector(state) : state;
      }
    );

    render(<NotificationPanel />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call fetchNotifications when panel opens', () => {
    render(<NotificationPanel />);
    expect(defaultStore.fetchNotifications).toHaveBeenCalled();
  });
});
