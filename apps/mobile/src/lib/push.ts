import { Platform } from 'react-native';

import { api } from '@/lib/api';

// Avisos no celular pelo app da Tela de Início (Web Push).
// iPhone: só funciona com o Ministre adicionado à Tela de Início (iOS 16.4 ou mais novo).
// O app nativo (APK/lojas) usa push.native.ts, direto pelo Firebase.

export type PushStatus =
  | 'on' // este celular recebe avisos
  | 'off' // dá para ligar
  | 'blocked' // a pessoa negou; só reativa nos Ajustes do celular
  | 'needs-install' // iPhone no Safari: precisa adicionar à Tela de Início
  | 'unsupported'; // navegador ou app sem suporte

const web = () => Platform.OS === 'web' && typeof window !== 'undefined';

function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  } catch {
    return null;
  }
}

export async function pushStatus(): Promise<PushStatus> {
  if (!web()) return 'unsupported';
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIos() && !isInstalled() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** A chave pública vem em base64 "de URL"; o navegador quer bytes. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Pede permissão (precisa ser chamado num toque da pessoa) e cadastra este celular. */
export async function enablePush(): Promise<PushStatus> {
  const status = await pushStatus();
  if (status === 'unsupported' || status === 'needs-install' || status === 'blocked') return status;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';

  const reg = await registration();
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;

  const { public_key } = await api<{ public_key: string | null }>('/push/config');
  if (!public_key) throw new Error('Os avisos no celular ainda não foram configurados no servidor.');

  // O serviço de avisos (Apple ou Google) às vezes demora; sem resposta em 60 s, a pessoa tenta de novo.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Não foi possível ativar agora. Tente de novo.')), 60_000),
  );
  const subscription = await Promise.race([currentSubscription(reg, public_key), timeout]);
  await api('/push/subscriptions', { method: 'POST', body: subscription.toJSON() });
  return 'on';
}

/** A inscrição foi feita com esta chave do servidor? */
function sameKey(sub: PushSubscription, publicKey: string) {
  const mine = sub.options?.applicationServerKey;
  if (!mine) return false;
  const a = new Uint8Array(mine);
  const b = keyBytes(publicKey);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Inscrição válida para a chave atual. Uma inscrição antiga (de outra versão do app, com outra chave)
 * faz o Google/Apple recusar todos os avisos ("Forbidden"): ela é cancelada e uma nova é criada.
 */
async function currentSubscription(reg: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription> {
  const existing = await reg.pushManager.getSubscription();
  if (existing && sameKey(existing, publicKey)) return existing;
  if (existing) {
    await api('/push/subscriptions', { method: 'DELETE', body: { endpoint: existing.endpoint } }).catch(() => undefined);
    await existing.unsubscribe().catch(() => undefined);
  }
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
}

export async function disablePush(): Promise<PushStatus> {
  const reg = web() ? await registration() : null;
  const subscription = await reg?.pushManager.getSubscription();
  if (subscription) {
    await api('/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  }
  return pushStatus();
}

/** Sair da conta: o servidor esquece este celular, mas a permissão continua (vale para a próxima conta). */
export async function forgetPushOnServer(): Promise<void> {
  if (!web() || !('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => undefined);
  const subscription = await reg?.pushManager?.getSubscription().catch(() => null);
  if (subscription) await api('/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => undefined);
}

/** Reenvia o cadastro (ex.: depois de entrar de novo na conta). Não pede permissão. */
export async function refreshPushSubscription(): Promise<void> {
  if (!web() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await registration();
  const existing = await reg?.pushManager.getSubscription();
  if (!reg || !existing) return;
  // Confere a chave: inscrição antiga é refeita aqui mesmo (a permissão já foi dada, não pergunta de novo).
  try {
    const { public_key } = await api<{ public_key: string | null }>('/push/config');
    const subscription = public_key ? await currentSubscription(reg, public_key) : existing;
    await api('/push/subscriptions', { method: 'POST', body: subscription.toJSON() });
  } catch {
    // Sem internet ou serviço de avisos fora: tenta de novo na próxima abertura.
  }
}

export const sendTestPush = () => api<{ message: string }>('/push/test', { method: 'POST' });

/** Número no ícone do app (iPhone e Android, quando o app está na Tela de Início). */
export function setAppBadge(count: number) {
  if (!web()) return;
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  (count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.())?.catch(() => undefined);
}

/** Só no app nativo (push.native.ts): na web o próprio aviso abre o endereço certo. */
export function useNotificationRoutes(_enabled: boolean) {}
