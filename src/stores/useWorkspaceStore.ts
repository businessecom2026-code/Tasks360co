import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkspaceWithMembership } from '../types';
import { api } from '../lib/api';

interface WorkspaceState {
  workspaces: WorkspaceWithMembership[];
  currentWorkspace: WorkspaceWithMembership | null;
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  setCurrentWorkspace: (workspace: WorkspaceWithMembership) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,

      fetchWorkspaces: async () => {
        set({ isLoading: true });
        const res = await api.get<WorkspaceWithMembership[]>('/workspaces');

        if (res.success && res.data) {
          const accepted = res.data.filter((w) => w.membership.inviteAccepted);
          set({ workspaces: accepted, isLoading: false });

          // Auto-select first workspace if none selected
          if (!get().currentWorkspace && accepted.length > 0) {
            const first = accepted[0];
            localStorage.setItem('activeWorkspaceId', first.id);
            set({ currentWorkspace: first });
          }
        } else {
          set({ isLoading: false });
        }
      },

      switchWorkspace: async (workspaceId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (!workspace) return;

        localStorage.setItem('activeWorkspaceId', workspaceId);
        set({ currentWorkspace: workspace });

        // Update activeWorkspaceId on server
        await api.patch('/auth/me', { activeWorkspaceId: workspaceId });
      },

      setCurrentWorkspace: (workspace) => {
        localStorage.setItem('activeWorkspaceId', workspace.id);
        set({ currentWorkspace: workspace });
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
