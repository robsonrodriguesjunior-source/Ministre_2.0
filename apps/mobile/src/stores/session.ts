import { create } from 'zustand';

import { authApi } from '@/features/auth/api';
import type { Membership, User } from '@/features/auth/types';
import { configureApi } from '@/lib/api';
import { getItem, setItem } from '@/lib/storage';

const TOKEN_KEY = 'ministre.token';
const MINISTRY_KEY = 'ministre.ministry';
const PENDING_INVITE_KEY = 'ministre.pendingInvite';

type SessionState = {
  /** Terminou de ler o login salvo no aparelho. */
  ready: boolean;
  token: string | null;
  user: User | null;
  memberships: Membership[];
  activeMinistryId: number | null;
  /** Convite aberto por link antes de entrar na conta (continua depois do login). */
  pendingInvite: string | null;

  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMemberships: () => Promise<Membership[]>;
  setActiveMinistry: (id: number) => Promise<void>;
  setPendingInvite: (code: string | null) => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  token: null,
  user: null,
  memberships: [],
  activeMinistryId: null,
  pendingInvite: null,

  hydrate: async () => {
    const [token, ministry, pendingInvite] = await Promise.all([
      getItem(TOKEN_KEY),
      getItem(MINISTRY_KEY),
      getItem(PENDING_INVITE_KEY),
    ]);
    set({ token, activeMinistryId: ministry ? Number(ministry) : null, pendingInvite });

    if (token) {
      try {
        const [{ data: user }] = await Promise.all([authApi.me(), get().refreshMemberships()]);
        set({ user });
      } catch {
        // sem internet: mantém o login salvo; 401 já faz signOut pelo configureApi
      }
    }
    set({ ready: true });
  },

  signIn: async (token, user) => {
    await setItem(TOKEN_KEY, token);
    set({ token, user });
    await get().refreshMemberships();
  },

  signOut: async () => {
    const hadToken = !!get().token;
    if (hadToken) authApi.logout().catch(() => undefined);
    await Promise.all([setItem(TOKEN_KEY, null), setItem(MINISTRY_KEY, null)]);
    set({ token: null, user: null, memberships: [], activeMinistryId: null });
  },

  refreshMemberships: async () => {
    const { data } = await authApi.ministries();
    const current = get().activeMinistryId;
    const active = data.find((m) => m.ministry.id === current) ? current : (data[0]?.ministry.id ?? null);
    set({ memberships: data, activeMinistryId: active });
    await setItem(MINISTRY_KEY, active ? String(active) : null);
    return data;
  },

  setActiveMinistry: async (id) => {
    set({ activeMinistryId: id });
    await setItem(MINISTRY_KEY, String(id));
  },

  setPendingInvite: async (code) => {
    set({ pendingInvite: code });
    await setItem(PENDING_INVITE_KEY, code);
  },
}));

/** Participação no ministério ativo (papel e funções). */
export function useActiveMembership(): Membership | null {
  return useSession((s) => s.memberships.find((m) => m.ministry.id === s.activeMinistryId) ?? null);
}

// Toda chamada à API leva o token e o ministério ativo; 401 (sessão vencida) desloga.
configureApi(
  () => ({ token: useSession.getState().token, ministryId: useSession.getState().activeMinistryId }),
  () => {
    useSession.getState().signOut();
  },
);
