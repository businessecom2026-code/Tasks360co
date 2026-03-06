import { create } from 'zustand';
import { api } from '../lib/api';

export interface Notification {
  id: string;
  userId: string;
  workspaceId?: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  eventSource: EventSource | null;
  setOpen: (open: boolean) => void;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  eventSource: null,

  setOpen: (open) => set({ isOpen: open }),

  fetchNotifications: async () => {
    const res = await api.get<NotificationListResponse>('/notifications?limit=30');
    if (res.success && res.data) {
      set({
        notifications: res.data.notifications,
        unreadCount: res.data.unreadCount,
      });
    }
  },

  fetchUnreadCount: async () => {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    if (res.success && res.data) {
      set({ unreadCount: res.data.count });
    }
  },

  markAsRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await api.patch('/notifications/read-all');
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (id) => {
    await api.delete(`/notifications/${id}`);
    set((state) => {
      const removed = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: removed && !removed.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },

  connectSSE: () => {
    const { eventSource } = get();
    if (eventSource) return; // already connected

    const token = localStorage.getItem('token');
    if (!token) return;

    const es = new EventSource(`/api/notifications/stream?token=${token}`);

    es.addEventListener('notification', (e) => {
      try {
        const notification = JSON.parse(e.data) as Notification;
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('connected', () => {
      console.log('[SSE] Connected');
    });

    es.onerror = () => {
      // Reconnect after 5s
      es.close();
      set({ eventSource: null });
      setTimeout(() => {
        get().connectSSE();
      }, 5000);
    };

    set({ eventSource: es });
  },

  disconnectSSE: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null });
    }
  },
}));
