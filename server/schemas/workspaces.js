import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
});

export const inviteSchema = z.object({
  workspaceId: z.string().optional(), // Can come from X-Workspace-Id header instead
  email: z.string().email('Invalid email address'),
  roleInWorkspace: z.enum(['GESTOR', 'COLABORADOR', 'CLIENTE']).optional().default('COLABORADOR'),
});
