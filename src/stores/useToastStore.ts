/**
 * Global Toast Notification Store (NOT persisted)
 *
 * Provides:
 * - addToast(toast): show a toast notification with auto-dismiss
 * - removeToast(id): manually dismiss a toast
 * - toasts: current toast stack
 *
 * Callable from outside React via useToastStore.getState().addToast()
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const duration = toast.duration ?? DEFAULT_DURATION;

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
