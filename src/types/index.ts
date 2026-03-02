// ─── Enums ───────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'GESTOR' | 'COLABORADOR' | 'CLIENTE';
export type WorkspaceRole = 'GESTOR' | 'COLABORADOR' | 'CLIENTE';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type SubStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

// ─── Models ──────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  activeWorkspaceId?: string;
  googleConnected?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  workspaceId: string;
  roleInWorkspace: WorkspaceRole;
  inviteAccepted: boolean;
  paymentStatus: PaymentStatus;
  costPerSeat: number;
  invitedEmail?: string;
  revolutOrderId?: string;
  paidAt?: string;
  user?: User;
  workspace?: Workspace;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assignee?: User;
  workspaceId: string;
  dueDate?: string;
  image?: string;
  color?: string;
  googleTaskId?: string;
  lastSyncedAt?: string;
  version: number;
  isSyncing?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string[];
  link?: string;
  platform?: string;
  workspaceId: string;
  recordingUrl?: string;
  summary?: string;
  suggestedTasks?: SuggestedTask[];
  createdAt: string;
  updatedAt: string;
}

export interface SuggestedTask {
  title: string;
  deadline?: string;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  basePrice: number;
  seatCount: number;
  totalMonthlyValue: number;
  autoRenew: boolean;
  status: SubStatus;
  currentPeriodEnd?: string;
  revolutOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Types ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface WorkspaceWithMembership extends Workspace {
  membership: Membership;
  memberCount?: number;
}

export interface BillingOverview {
  workspaceId: string;
  workspaceName: string;
  gestorName: string;
  basePrice: number;
  activeSeats: number;
  seatCost: number;
  totalMonthly: number;
  autoRenew: boolean;
}
