import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotificationStore } from './useNotificationStore';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../lib/api';

const mockNotifications = [
  {
    id: 'n1',
    userId: 'u1',
    type: 'task_assigned',
    title: 'Tarefa atribuída',
    body: '"Fix bug" foi atribuída a você',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    userId: 'u1',
    type: 'task_moved',
    title: 'Tarefa movida',
    body: '"Deploy" → DONE',
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe('useNotificationStore', () => {
  beforeEach(() => {
    // Reset store state
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      eventSource: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    useNotificationStore.getState().disconnectSSE();
  });

  it('should start with empty state', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isOpen).toBe(false);
  });

  it('should toggle panel open/close', () => {
    const { setOpen } = useNotificationStore.getState();

    setOpen(true);
    expect(useNotificationStore.getState().isOpen).toBe(true);

    setOpen(false);
    expect(useNotificationStore.getState().isOpen).toBe(false);
  });

  it('should fetch notifications', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      data: {
        notifications: mockNotifications,
        total: 2,
        unreadCount: 1,
      },
    });

    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
    expect(state.unreadCount).toBe(1);
    expect(api.get).toHaveBeenCalledWith('/notifications?limit=30');
  });

  it('should fetch unread count', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true,
      data: { count: 5 },
    });

    await useNotificationStore.getState().fetchUnreadCount();
    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });

  it('should mark notification as read', async () => {
    // Pre-populate
    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 1,
    });

    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    const n1 = state.notifications.find(n => n.id === 'n1');
    expect(n1?.read).toBe(true);
    expect(state.unreadCount).toBe(0);
    expect(api.patch).toHaveBeenCalledWith('/notifications/n1/read');
  });

  it('should mark all as read', async () => {
    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 1,
    });

    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    await useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.notifications.every(n => n.read)).toBe(true);
    expect(state.unreadCount).toBe(0);
    expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('should delete notification and update unread count', async () => {
    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 1,
    });

    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    // Delete unread notification
    await useNotificationStore.getState().deleteNotification('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('n2');
    expect(state.unreadCount).toBe(0); // was 1, removed unread, so 0
  });

  it('should not decrement unread count when deleting read notification', async () => {
    useNotificationStore.setState({
      notifications: mockNotifications,
      unreadCount: 1,
    });

    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: true });

    // Delete read notification (n2)
    await useNotificationStore.getState().deleteNotification('n2');

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1); // unchanged
  });
});
