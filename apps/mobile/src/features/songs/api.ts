import { api } from '@/lib/api';

import type { SongDetail, SongFilter, SongInput, SongLookup, SongSummary, StageSet } from './types';

const m = { ministry: true } as const;

export const songsApi = {
  list: (params: { q?: string; filter?: SongFilter; tag?: string | null } = {}) => {
    const q = new URLSearchParams();
    if (params.q?.trim()) q.set('q', params.q.trim());
    if (params.filter && params.filter !== 'all') q.set('filter', params.filter);
    if (params.tag) q.set('tag', params.tag);
    return api<{ data: SongSummary[] }>(`/songs?${q.toString()}`, m);
  },
  tags: () => api<{ data: string[] }>('/songs/tags', m),
  lookup: (url: string) => api<{ data: SongLookup }>('/songs/lookup', { ...m, method: 'POST', body: { url } }),
  get: (id: number) => api<{ data: SongDetail }>(`/songs/${id}`, m),
  create: (body: SongInput) => api<{ data: SongDetail }>('/songs', { ...m, method: 'POST', body }),
  update: (id: number, body: SongInput) => api<{ data: SongDetail }>(`/songs/${id}`, { ...m, method: 'PATCH', body }),
  remove: (id: number) => api<{ message: string }>(`/songs/${id}`, { ...m, method: 'DELETE' }),
  stage: (eventId: number) => api<{ data: Omit<StageSet, 'saved_at'> }>(`/events/${eventId}/stage`, m),
};

/** Chaves do cache: mudou uma música, estas listas são recarregadas. */
export const songKeys = {
  all: ['songs'] as const,
  list: (p: { q: string; filter: SongFilter; tag: string | null }) => ['songs', 'list', p] as const,
  tags: ['songs', 'tags'] as const,
  detail: (id: number) => ['songs', 'detail', id] as const,
};
