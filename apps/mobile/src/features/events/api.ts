import { api } from '@/lib/api';

import type {
  Availability,
  Conflict,
  EventDetail,
  EventSummary,
  EventType,
  Home,
  SongOption,
  Unavailability,
} from './types';

const m = { ministry: true } as const;

export const eventsApi = {
  home: () => api<Home>('/home', m),

  list: (params: { from?: string; to?: string; mine?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.mine) q.set('mine', '1');
    return api<{ data: EventSummary[] }>(`/events?${q.toString()}`, m);
  },

  get: (id: number) => api<{ data: EventDetail }>(`/events/${id}`, m),

  create: (body: { title: string; starts_at: string; event_type_id?: number | null; location?: string | null; is_rehearsal?: boolean; notes?: string | null }) =>
    api<{ data: EventDetail }>('/events', { ...m, method: 'POST', body }),

  update: (id: number, body: Partial<{ title: string; starts_at: string; event_type_id: number | null; location: string | null; is_rehearsal: boolean; notes: string | null }>) =>
    api<{ data: EventDetail }>(`/events/${id}`, { ...m, method: 'PATCH', body }),

  remove: (id: number) => api<{ message: string }>(`/events/${id}`, { ...m, method: 'DELETE' }),
  publish: (id: number) => api<{ data: EventDetail }>(`/events/${id}/publish`, { ...m, method: 'POST' }),
  cancel: (id: number) => api<{ data: EventDetail }>(`/events/${id}/cancel`, { ...m, method: 'POST' }),
  duplicate: (id: number, starts_at: string) =>
    api<{ data: EventDetail }>(`/events/${id}/duplicate`, { ...m, method: 'POST', body: { starts_at } }),
  remindPending: (id: number) =>
    api<{ reminded: number; message: string }>(`/events/${id}/remind-pending`, { ...m, method: 'POST' }),

  setTeam: (id: number, team: { member_id: number; position_id: number }[]) =>
    api<{ data: EventDetail }>(`/events/${id}/assignments`, { ...m, method: 'PUT', body: { team } }),
  setSongs: (id: number, songs: { song_id: number; key: string }[]) =>
    api<{ data: EventDetail }>(`/events/${id}/songs`, { ...m, method: 'PUT', body: { songs } }),

  confirm: (assignmentId: number) =>
    api<{ status: string; message: string }>(`/assignments/${assignmentId}/confirm`, { ...m, method: 'POST' }),
  decline: (assignmentId: number, reason?: string) =>
    api<{ status: string; message: string }>(`/assignments/${assignmentId}/decline`, {
      ...m,
      method: 'POST',
      body: { reason: reason ?? null },
    }),

  availability: (date: string, eventId?: number) =>
    api<Availability>(`/events/availability?date=${date}${eventId ? `&event_id=${eventId}` : ''}`, m),

  eventTypes: () => api<{ data: EventType[] }>('/event-types', m),
  songs: () => api<{ data: SongOption[] }>('/songs', m),

  unavailabilities: () => api<{ data: Unavailability[] }>('/unavailabilities', m),
  conflicts: (p: { starts_on: string; ends_on?: string; repeat_weekly?: boolean }) => {
    const q = new URLSearchParams({ starts_on: p.starts_on });
    if (p.ends_on) q.set('ends_on', p.ends_on);
    if (p.repeat_weekly) q.set('repeat_weekly', '1');
    return api<{ data: Conflict[] }>(`/unavailabilities/conflicts?${q.toString()}`, m);
  },
  markUnavailable: (body: { starts_on: string; ends_on?: string; reason?: string; repeat_weekly?: boolean; decline_conflicts?: boolean }) =>
    api<{ data: Unavailability; declined: number }>('/unavailabilities', { ...m, method: 'POST', body }),
  removeUnavailability: (id: number) => api<{ message: string }>(`/unavailabilities/${id}`, { ...m, method: 'DELETE' }),
};

/** Chaves do cache: mudou uma escala, estas listas são recarregadas. */
export const eventKeys = {
  home: ['home'] as const,
  list: (mine: boolean) => ['events', { mine }] as const,
  detail: (id: number) => ['event', id] as const,
  unavailabilities: ['unavailabilities'] as const,
};
