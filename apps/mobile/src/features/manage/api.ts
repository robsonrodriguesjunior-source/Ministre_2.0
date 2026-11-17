import type { Role, User } from '@/features/auth/types';
import { api } from '@/lib/api';

const m = { ministry: true } as const;

export type Member = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  positions: { id: number; name: string }[];
  joined_at: string | null;
  is_me: boolean;
};

export type ManagedPosition = { id: number; name: string; sort_order: number; archived: boolean; members_count: number };

export type MinistryInfo = {
  id: number;
  name: string;
  church: string;
  default_location: string | null;
  logo_url: string | null;
  worship_days: number[];
  members_count: number;
};

export type Invite = {
  id: number;
  code: string;
  role: Role;
  expires_at: string;
  max_uses: number | null;
  uses: number;
  usable: boolean;
  link: string;
};

export type TeamUnavailability = {
  id: number;
  member_id: number;
  user_id: number;
  name: string;
  avatar_url: string | null;
  starts_on: string;
  ends_on: string;
  recurrence_weekday: number | null;
  reason: string | null;
};

export type Stats = { year: number; events: number; confirmed_rate: number | null };

export const meApi = {
  update: (body: { name?: string; phone?: string | null }) => api<{ data: User }>('/me', { method: 'PATCH', body }),
  avatar: (form: FormData) => api<{ data: User }>('/me/avatar', { method: 'POST', body: form }),
  removeAvatar: () => api<{ data: User }>('/me/avatar', { method: 'DELETE' }),
  stats: () => api<{ data: Stats }>('/me/stats', m),
  remove: (confirm: string) => api<{ message: string }>('/me', { method: 'DELETE', body: { confirm } }),
};

export type OverviewPerson = {
  user_id: number; name: string; avatar_url: string | null; ministries: string[];
  scheduled: number; confirmed: number; declined: number; pending: number; past: number; confirmed_rate: number | null;
};
export type OverviewDepartment = {
  event_id: number; ministry_id: number; ministry: string; type: string; title: string; visibility: string; minister: string | null;
  total: number; confirmed: number; pending: number; declined: number;
  people: { name: string; avatar_url: string | null; user_id: number | null; position: string | null; status: 'pending' | 'confirmed' | 'declined'; is_minister: boolean }[];
};
export type ChurchOverview = {
  month: string;
  church: { id: number; name: string };
  ministries: { id: number; name: string; type: string }[];
  summary: { services: number; people_serving: number; people_idle: number; confirmed_rate: number | null };
  services: { starts_at: string; title: string; total: number; confirmed: number; departments: OverviewDepartment[] }[];
  people: OverviewPerson[];
};

export type ChurchManager = { user_id: number; name: string; avatar_url: string | null; is_owner: boolean; is_me: boolean };

export const manageApi = {
  churchManagers: () => api<{ data: ChurchManager[]; candidates: ChurchManager[] }>('/church/managers', m),
  addChurchManager: (userId: number) => api<{ message: string }>('/church/managers', { ...m, method: 'POST', body: { user_id: userId } }),
  removeChurchManager: (userId: number) => api<{ message: string }>('/church/managers/' + userId, { ...m, method: 'DELETE' }),
  churchOverview: (month: string) => api<ChurchOverview>(`/church/overview?month=${month}`, m),
  members: () => api<{ data: Member[] }>('/members', m),
  updateMember: (id: number, body: { role?: Role; position_ids?: number[] }) =>
    api<{ data: Member }>(`/members/${id}`, { ...m, method: 'PATCH', body }),
  removeMember: (id: number) => api<{ message: string }>(`/members/${id}`, { ...m, method: 'DELETE' }),

  invites: () => api<{ data: Invite[] }>('/invites', m),
  createInvite: (body: { role: Role; days_valid: number }) => api<{ data: Invite }>('/invites', { ...m, method: 'POST', body }),
  cancelInvite: (id: number) => api<{ message: string }>(`/invites/${id}`, { ...m, method: 'DELETE' }),

  positions: () => api<{ data: ManagedPosition[] }>('/manage/positions', m),
  createPosition: (name: string) => api<{ data: ManagedPosition }>('/manage/positions', { ...m, method: 'POST', body: { name } }),
  updatePosition: (id: number, body: { name?: string; archived?: boolean }) =>
    api<{ data: ManagedPosition }>(`/manage/positions/${id}`, { ...m, method: 'PATCH', body }),
  reorderPositions: (ids: number[]) => api<{ data: ManagedPosition[] }>('/manage/positions/order', { ...m, method: 'PUT', body: { ids } }),

  ministry: () => api<{ data: MinistryInfo }>('/manage/ministry', m),
  updateMinistry: (body: { name?: string; default_location?: string | null; worship_days?: number[] }) =>
    api<{ data: MinistryInfo }>('/manage/ministry', { ...m, method: 'PATCH', body }),
  logo: (form: FormData) => api<{ data: MinistryInfo }>('/manage/ministry/logo', { ...m, method: 'POST', body: form }),
  removeLogo: () => api<{ data: MinistryInfo }>('/manage/ministry/logo', { ...m, method: 'DELETE' }),

  teamUnavailability: (month: string) =>
    api<{ month: string; data: TeamUnavailability[] }>(`/manage/unavailabilities?month=${month}`, m),
};

export const manageKeys = {
  members: ['manage', 'members'] as const,
  invites: ['manage', 'invites'] as const,
  positions: ['manage', 'positions'] as const,
  ministry: ['manage', 'ministry'] as const,
  unavailability: (month: string) => ['manage', 'unavailability', month] as const,
  churchOverview: (month: string) => ['manage', 'church-overview', month] as const,
  churchManagers: ['manage', 'church-managers'] as const,
  stats: ['me', 'stats'] as const,
};

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
