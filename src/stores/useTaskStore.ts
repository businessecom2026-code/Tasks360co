import { create } from 'zustand';
import type { Task, TaskStatus } from '../types';
import { api } from '../lib/api';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  syncingTaskIds: Set<string>;
  fetchTasks: () => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSyncing: (id: string, syncing: boolean) => void;
  injectSuggestedTasks: (tasks: { title: string; deadline?: string }[]) => Promise<void>;
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  syncingTaskIds: new Set(),

  fetchTasks: async () => {
    set({ isLoading: true });
    const res = await api.get<Task[]>('/tasks');
    if (res.success && res.data) {
      set({ tasks: res.data, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  addTask: async (task) => {
    const res = await api.post<Task>('/tasks', task);
    if (res.success && res.data) {
      set((state) => ({ tasks: [...state.tasks, res.data!] }));
      return res.data;
    }
    return null;
  },

  updateTask: async (id, updates) => {
    const res = await api.patch<Task>(`/tasks/${id}`, updates);
    if (res.success && res.data) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...res.data } : t)),
      }));
      return true;
    }
    return false;
  },

  moveTask: async (id, status) => {
    const task = get().tasks.find((t) => t.id === id);
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));

    const res = await api.patch(`/tasks/${id}`, { status, version: task?.version });
    if (!res.success) {
      // Revert on failure
      get().fetchTasks();
    }
  },

  deleteTask: async (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
    await api.delete(`/tasks/${id}`);
  },

  setSyncing: (id, syncing) => {
    set((state) => {
      const next = new Set(state.syncingTaskIds);
      if (syncing) next.add(id);
      else next.delete(id);
      return { syncingTaskIds: next };
    });
  },

  injectSuggestedTasks: async (suggestedTasks) => {
    for (const st of suggestedTasks) {
      await get().addTask({
        title: st.title,
        dueDate: st.deadline,
        status: 'PENDING',
      });
    }
  },
}));
