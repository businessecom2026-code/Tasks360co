// ─── Enums ───────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'GESTOR' | 'COLABORADOR' | 'CLIENTE';
export type WorkspaceRole = 'GESTOR' | 'COLABORADOR' | 'CLIENTE';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SubStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'TRIAL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type RecordingStatus = 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface TaskLabel {
  name: string;
  color: string; // tailwind color key: red, blue, green, yellow, purple, orange, pink, teal
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  parentId?: string | null; // null = root item, string = sub-item of parent
}

export type AttachmentFileCategory = 'image' | 'document' | 'video';

export interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileType: string; // MIME type
  fileSize: number; // bytes
  thumbnailUrl?: string;
  createdAt: string;
}

// ─── Models ──────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  activeWorkspaceId?: string;
  googleConnected?: boolean;
  googleCalConnected?: boolean;
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
  priority?: TaskPriority;
  labels?: TaskLabel[];
  checklist?: ChecklistItem[];
  coverColor?: string;
  assigneeId?: string;
  assignee?: User;
  workspaceId: string;
  dueDate?: string;
  image?: string;
  color?: string;
  googleTaskId?: string;
  lastSyncedAt?: string;
  version: number;
  attachments?: Attachment[];
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
  recordWithAi?: boolean;
  recordings?: RecordingSession[];
  createdAt: string;
  updatedAt: string;
}

export interface RecordingSession {
  id: string;
  meetingId: string;
  status: RecordingStatus;
  startedAt?: string;
  pausedAt?: string;
  stoppedAt?: string;
  totalDurationMs: number;
  audioUrl?: string;
  processingJobId?: string;
  errorMessage?: string;
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

// ─── Notifications ───────────────────────────────────────

export type NotificationType = 'task_assigned' | 'task_moved' | 'invite_received' | 'meeting_created' | 'payment_success' | 'recording_ready';

export interface Notification {
  id: string;
  userId: string;
  workspaceId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
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

export interface CalendarEvent {
  id: string;
  googleEventId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  allDay: boolean;
  status: string;
  htmlLink?: string;
  recurrence?: string;
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
