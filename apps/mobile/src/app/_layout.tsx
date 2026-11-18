import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppFrame } from '@/components/nav/DesktopShell';
import { useDesktop } from '@/lib/layout';
import { useNotificationRoutes } from '@/lib/push';
import { useSession } from '@/stores/session';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const sessionReady = useSession((s) => s.ready);
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Web: guarda o app no aparelho (public/sw.js) para abrir sem internet, como no altar.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:') return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  const ready = (fontsLoaded || !!fontError) && sessionReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Column>
            <AppNavigator />
          </Column>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Moldura: no computador (web, 1024 px ou mais), logado e com ministério, ganha menu lateral e cabeçalho;
// o Modo Palco e as telas abertas sem login continuam em tela cheia/coluna.
function Column({ children }: { children: ReactNode }) {
  const desktop = useDesktop();
  const token = useSession((s) => s.token);
  const hasMinistry = useSession((s) => s.memberships.length > 0);
  const area = useSegments()[0] ?? '';
  const framed = desktop && !!token && hasMinistry && !['palco', '(auth)', 'onboarding', 'convite', 'termos', 'privacidade'].includes(area);
  return <AppFrame desktop={framed}>{children}</AppFrame>;
}

// Quem vê o quê: sem login -> boas-vindas/entrar; logado sem ministério -> onboarding; com ministério -> abas.
// O convite (/convite/CODIGO) abre em qualquer situação.
function AppNavigator() {
  const token = useSession((s) => s.token);
  const hasMinistry = useSession((s) => s.memberships.length > 0 || s.activeMinistryId !== null);
  const pendingInvite = useSession((s) => s.pendingInvite);
  const segments = useSegments();
  const pathname = usePathname();
  const area = segments[0] ?? '';

  // App nativo: tocou num aviso, abre a escala ou o aviso certo.
  useNotificationRoutes(!!token && hasMinistry);

  useEffect(() => {
    if (area === 'convite' || area === 'termos' || area === 'privacidade') return; // abertos sem login
    if (!token) {
      // Endereço principal ("/") ou qualquer tela fechada: começa pelas Boas-vindas.
      if (area !== '(auth)' || pathname === '/') router.replace('/boas-vindas');
      return;
    }
    if (pendingInvite) {
      router.replace({ pathname: '/convite/[code]', params: { code: pendingInvite } });
      return;
    }
    if (!hasMinistry) {
      if (area !== 'onboarding') router.replace('/onboarding');
      return;
    }
    if (area === '(auth)' || area === 'onboarding') router.replace('/');
  }, [token, hasMinistry, pendingInvite, area, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!token && !hasMinistry}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!!token && hasMinistry}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="escala/[id]" />
        <Stack.Screen name="escala/nova" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="musica/[id]" />
        <Stack.Screen name="musica/editar" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="palco" options={{ animation: 'fade', contentStyle: { backgroundColor: colors.stageBg } }} />
        <Stack.Screen name="indisponibilidade" />
        <Stack.Screen name="avisos" />
        <Stack.Screen name="aviso/novo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ajustes-notificacoes" />
        <Stack.Screen name="notificacoes" />
        <Stack.Screen name="perfil/dados" />
        <Stack.Screen name="perfil/excluir" />
        <Stack.Screen name="gestao/index" />
        <Stack.Screen name="gestao/membros" />
        <Stack.Screen name="gestao/convites" />
        <Stack.Screen name="configuracoes/index" />
        <Stack.Screen name="configuracoes/funcoes" />
        <Stack.Screen name="configuracoes/ministerio" />
        <Stack.Screen name="gestao/indisponibilidades" />
        <Stack.Screen name="_catalogo" />
      </Stack.Protected>
      <Stack.Screen name="convite/index" />
      <Stack.Screen name="convite/[code]" />
      <Stack.Screen name="termos" />
      <Stack.Screen name="privacidade" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
