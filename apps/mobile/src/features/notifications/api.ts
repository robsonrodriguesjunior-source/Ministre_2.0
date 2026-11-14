import { api } from '@/lib/api';

const m = { ministry: true } as const;

export type Announcement = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  push_sent: boolean;
  author: { id: number; name: string; avatar_url: string | null } | null;
  is_read: boolean;
  can_manage: boolean;
  /** "lido por N de M" — só para líderes. */
  reads?: { count: number; total: number };
};

export type BellItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  route: string | null;
  read: boolean;
  created_at: string;
};

export type PushPrefs = {
  escalas: boolean;
  lembretes: boolean;
  avisos: boolean;
  indisponibilidade: boolean;
  resumo: boolean;
};

export const notificationsApi = {
  announcements: () => api<{ data: Announcement[] }>('/announcements', m),
  createAnnouncement: (body: { title: string; body: string; pinned: boolean; send_push: boolean }) =>
    api<{ data: Announcement; message: string }>('/announcements', { ...m, method: 'POST', body }),
  updateAnnouncement: (id: number, body: Partial<{ title: string; body: string; pinned: boolean }>) =>
    api<{ data: Announcement }>(`/announcements/${id}`, { ...m, method: 'PATCH', body }),
  removeAnnouncement: (id: number) => api<{ message: string }>(`/announcements/${id}`, { ...m, method: 'DELETE' }),
  readAnnouncements: () => api<{ read: number }>('/announcements/read-all', { ...m, method: 'POST' }),

  bell: () => api<{ data: BellItem[]; unread: number }>('/notifications', m),
  readOne: (id: number) => api<{ unread: number }>(`/notifications/${id}/read`, { ...m, method: 'POST' }),
  readAll: () => api<{ unread: number }>('/notifications/read-all', { ...m, method: 'POST' }),

  prefs: () => api<{ data: PushPrefs }>('/me/notifications'),
  updatePrefs: (body: Partial<PushPrefs>) => api<{ data: PushPrefs }>('/me/notifications', { method: 'PATCH', body }),
};

/** Chaves do cache. */
export const notificationKeys = {
  announcements: ['announcements'] as const,
  bell: ['bell'] as const,
  prefs: ['push-prefs'] as const,
};
