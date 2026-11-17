import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { getItem, setItem } from '@/lib/storage';

// Avisos no app nativo (APK/lojas): direto pelo Firebase (FCM).
// A versão web (Tela de Início) fica em push.ts; as duas têm as mesmas funções.

export type PushStatus = 'on' | 'off' | 'blocked' | 'needs-install' | 'unsupported';

const TOKEN_KEY = 'ministre.pushToken';
const CHANNEL = 'avisos'; // o servidor manda com channel_id "avisos"

// Com o app aberto, o aviso também aparece no topo da tela.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Avisos do ministério',
    // eslint-disable-next-line import/namespace -- existe no módulo nativo; o lint não enxerga
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.orange,
  });
}

/** Endereço do Firebase deste celular. Sem o Firebase configurado no app, dá erro. */
async function deviceToken(): Promise<string | null> {
  // iPhone: o endereço da Apple ainda não passa pelo Firebase (etapa do TestFlight).
  if (Platform.OS !== 'android') return null;
  try {
    return (await Notifications.getDevicePushTokenAsync()).data as string;
  } catch {
    return null;
  }
}

async function register(token: string) {
  await api('/push/devices', { method: 'POST', body: { token, platform: Platform.OS } });
  await setItem(TOKEN_KEY, token);
}

export async function pushStatus(): Promise<PushStatus> {
  if (Platform.OS !== 'android') return 'unsupported';
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? 'off' : 'blocked';
  return (await getItem(TOKEN_KEY)) ? 'on' : 'off';
}

/** Pede permissão (num toque da pessoa) e cadastra este celular. */
export async function enablePush(): Promise<PushStatus> {
  if (Platform.OS !== 'android') return 'unsupported';
  await ensureChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? 'off' : 'blocked';

  const token = await deviceToken();
  if (!token) throw new Error('Os avisos ainda não estão disponíveis nesta versão do app.');
  await register(token);
  return 'on';
}

export async function disablePush(): Promise<PushStatus> {
  const token = await getItem(TOKEN_KEY);
  if (token) await api('/push/devices', { method: 'DELETE', body: { token } }).catch(() => undefined);
  await setItem(TOKEN_KEY, null);
  return pushStatus();
}

/** Sair da conta: o servidor esquece este celular; a permissão continua para a próxima conta. */
export async function forgetPushOnServer(): Promise<void> {
  const token = await getItem(TOKEN_KEY);
  if (token) await api('/push/devices', { method: 'DELETE', body: { token } }).catch(() => undefined);
}

/** Ao abrir o app ou entrar na conta: reenvia o endereço (o Firebase às vezes troca). Não pede permissão. */
export async function refreshPushSubscription(): Promise<void> {
  if (Platform.OS !== 'android' || !(await getItem(TOKEN_KEY))) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await ensureChannel().catch(() => undefined);
  const token = await deviceToken();
  if (token) await register(token).catch(() => undefined);
}

export const sendTestPush = () => api<{ message: string }>('/push/test', { method: 'POST' });

/** Número no ícone do app. */
export function setAppBadge(count: number) {
  Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => undefined);
}

/** Tocou no aviso: abre a tela certa (data.route vem do servidor). */
export function routeFromNotification(response: Notifications.NotificationResponse | null | undefined): string | null {
  const route = response?.notification.request.content.data?.route;
  return typeof route === 'string' && route.startsWith('/') ? route : null;
}

/** Abre a tela do aviso tocado (com o app fechado ou aberto). Só depois do login carregado. */
export function useNotificationRoutes(enabled: boolean) {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !response) return;
    const id = response.notification.request.identifier + response.actionIdentifier;
    if (handled.current === id) return;
    handled.current = id;
    const route = routeFromNotification(response);
    if (route) router.push(route as Href);
  }, [response, enabled]);
}
