export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COLLABORATOR' | 'CLIENT';

export type Language = 'en' | 'pt' | 'es' | 'it';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: string;
  dueDate?: string;
  image?: string; // Base64 ou URL para preview
  color?: string; // Hex code para etiqueta/status visual
  company?: string; // Multi-tenancy
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
}

export type ViewState = 'DASHBOARD' | 'KANBAN' | 'MEETINGS' | 'CHAT' | 'LIVE_MEETING' | 'USER_MANAGEMENT';