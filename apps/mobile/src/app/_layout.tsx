import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '@/stores/session';
import { colors, size } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const sessionReady = useSession((s) => s.ready);
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
          {/* No computador o app fica numa coluna central com a largura de um celular. */}
          <View style={styles.column}>
            <AppNavigator />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
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

  useEffect(() => {
    if (area === 'convite') return;
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
        <Stack.Screen name="indisponibilidade" />
        <Stack.Screen name="avisos" />
        <Stack.Screen name="notificacoes" />
        <Stack.Screen name="_catalogo" />
      </Stack.Protected>
      <Stack.Screen name="convite/index" />
      <Stack.Screen name="convite/[code]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? size.maxContentWidth : undefined,
    alignSelf: 'center',
    backgroundColor: colors.bg,
  },
});
