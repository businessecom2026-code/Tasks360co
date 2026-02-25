export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COLLABORATOR' | 'CLIENT';

export type Language = 'en' | 'pt' | 'es' | 'it';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  dueDate?: string;
  image?: string;
  color?: string;
  company?: string;
  members?: string[]; // Array de nomes ou IDs de usuários
  tags?: string[]; // Array de strings (ex: 'Urgente', 'Design')
  checklist?: ChecklistItem[];
}

export interface Meeting {
  id: string | number;
  title: string;
  date: string;
  time: string;
  participants?: string[];
  link: string;
  platform?: string;
  status?: 'SCHEDULED' | 'COMPLETED';
  summary?: string;
  company?: string; // Multi-tenancy
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Demo purpose only
  role: UserRole;
  avatar: string;
  company: string;
}

export interface Column {
  id: string;
  title: string;
  color?: string;
}

export type ViewState = 'DASHBOARD' | 'KANBAN' | 'MEETINGS' | 'CHAT' | 'LIVE_MEETING' | 'USER_MANAGEMENT';