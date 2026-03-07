import type { ApiResponse } from '../types';
import { useToastStore } from '../stores/useToastStore';

const BASE_URL = '/api';

function getStoredLocale(): string {
  try {
    const stored = localStorage.getItem('locale-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.locale || 'pt-BR';
    }
  } catch { /* ignore */ }
  return 'pt-BR';
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': getStoredLocale(),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const workspaceId = localStorage.getItem('activeWorkspaceId');
  if (workspaceId) {
    headers['X-Workspace-Id'] = workspaceId;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data.error || `Request failed (${res.status})`;
      // Show toast for non-auth errors (401 redirects to login, no toast needed)
      if (res.status !== 401) {
        useToastStore.getState().addToast({ type: 'error', message: errorMsg });
      }
      return { success: false, error: errorMsg };
    }

    return { success: true, data };
  } catch (err) {
    const errorMsg = (err as Error).message;
    useToastStore.getState().addToast({ type: 'error', message: errorMsg });
    return { success: false, error: errorMsg };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const workspaceId = localStorage.getItem('activeWorkspaceId');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (workspaceId) headers['X-Workspace-Id'] = workspaceId;

    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error } as ApiResponse<T>;
      return { success: true, data } as ApiResponse<T>;
    });
  },
};
