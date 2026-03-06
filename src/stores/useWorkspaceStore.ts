import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkspaceWithMembership, Membership } from '../types';
import { api } from '../lib/api';

interface WorkspaceState {
  workspaces: WorkspaceWithMembership[];
  currentWorkspace: WorkspaceWithMembership | null;
  members: Membership[];
  isLoading: boolean;
  error: string | null;

  // Workspace lifecycle
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<WorkspaceWithMembership | null>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  setCurrentWorkspace: (workspace: WorkspaceWithMembership) => void;

  // Member management
  fetchMembers: () => Promise<void>;
  inviteMember: (email: string, role: string) => Promise<{ checkoutUrl?: string } | null>;
  removeMember: (membershipId: string) => Promise<boolean>;

  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      currentWorkspace: null,
      members: [],
      isLoading: false,
      error: null,

      fetchWorkspaces: async () => {
        set({ isLoading: true, error: null });
        const res = await api.get<WorkspaceWithMembership[]>('/workspaces');

        if (res.success && res.data) {
          // Only show workspaces where invite is accepted AND payment is confirmed
          const accessible = res.data.filter(
            (w) => w.membership.inviteAccepted && w.membership.paymentStatus === 'PAID'
          );
          set({ workspaces: accessible, isLoading: false });

          const current = get().currentWorkspace;
          // Auto-select first workspace if none selected or current no longer accessible
          if (accessible.length > 0) {
            const stillValid = current && accessible.find((w) => w.id === current.id);
            if (!stillValid) {
              const first = accessible[0];
              localStorage.setItem('activeWorkspaceId', first.id);
              set({ currentWorkspace: first });
            }
          } else {
            set({ currentWorkspace: null });
          }
        } else {
          set({ isLoading: false, error: res.error || 'Erro ao carregar workspaces' });
        }
      },

      createWorkspace: async (name: string) => {
        set({ isLoading: true, error: null });
        const res = await api.post<WorkspaceWithMembership>('/workspaces', { name });

        if (res.success && res.data) {
          const workspace = res.data;
          set((state) => ({
            workspaces: [...state.workspaces, workspace],
            currentWorkspace: workspace,
            isLoading: false,
          }));
          localStorage.setItem('activeWorkspaceId', workspace.id);
          return workspace;
        }

        set({ isLoading: false, error: res.error || 'Erro ao criar workspace' });
        return null;
      },

      switchWorkspace: async (workspaceId: string) => {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (!workspace) return;

        localStorage.setItem('activeWorkspaceId', workspaceId);
        set({ currentWorkspace: workspace });

        // Persist activeWorkspaceId on server for session recovery
        await api.patch('/auth/me', { activeWorkspaceId: workspaceId });
      },

      setCurrentWorkspace: (workspace) => {
        localStorage.setItem('activeWorkspaceId', workspace.id);
        set({ currentWorkspace: workspace });
      },

      fetchMembers: async () => {
        const res = await api.get<Membership[]>('/workspaces/members');
        if (res.success && res.data) {
          set({ members: res.data });
        }
      },

      inviteMember: async (email: string, role: string) => {
        const workspace = get().currentWorkspace;
        if (!workspace) return null;

        set({ error: null });
        const res = await api.post<{ checkoutUrl?: string; membership: Membership }>(
          '/workspaces/invite',
          { workspaceId: workspace.id, email, roleInWorkspace: role }
        );

        if (res.success && res.data) {
          // Refresh members list to show pending invite
          get().fetchMembers();
          return { checkoutUrl: res.data.checkoutUrl };
        }

        set({ error: res.error || 'Erro ao enviar convite' });
        return null;
      },

      removeMember: async (membershipId: string) => {
        const res = await api.delete(`/workspaces/members/${membershipId}`);
        if (res.success) {
          set((state) => ({
            members: state.members.filter((m) => m.id !== membershipId),
          }));
          return true;
        }
        return false;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
);
