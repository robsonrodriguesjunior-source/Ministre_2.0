import { api } from '@/lib/api';

import type { AuthResponse, InvitePreview, Membership, User } from './types';

const device = 'Ministre';

export const authApi = {
  login: (email: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password, device_name: device } }),

  register: (data: { name: string; email: string; phone?: string; password: string; terms: boolean }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body: { ...data, device_name: device } }),

  forgot: (email: string) => api<{ message: string }>('/auth/forgot', { method: 'POST', body: { email } }),

  reset: (email: string, code: string, password: string) =>
    api<AuthResponse>('/auth/reset', { method: 'POST', body: { email, code, password } }),

  logout: () => api<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () => api<{ data: User }>('/me'),

  ministries: () => api<{ data: Membership[] }>('/me/ministries'),

  createChurch: (data: {
    church_name: string;
    city?: string;
    ministry_name: string;
    positions: string[];
    event_types: string[];
  }) => api<{ data: Membership }>('/churches', { method: 'POST', body: data }),

  invitePreview: (code: string) => api<InvitePreview>(`/invites/${encodeURIComponent(code)}`),

  acceptInvite: (code: string, positions: number[]) =>
    api<{ data: Membership }>(`/invites/${encodeURIComponent(code)}/accept`, {
      method: 'POST',
      body: { positions },
    }),
};
