import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import type { QuickActionId } from '@/components/nav/ActionSheet';
import { TabBar } from '@/components/nav/TabBar';
import { useActiveMembership } from '@/stores/session';

// Ações do botão +. Novo aviso chega na Etapa 5.
function handleQuickAction(id: QuickActionId) {
  if (id === 'new-event') router.push('/escala/nova');
  else if (id === 'unavailable') router.push('/indisponibilidade');
  else if (id === 'my-events') router.navigate({ pathname: '/agenda', params: { mine: '1' } });
  else if (id === 'new-announcement') router.push('/avisos');
  else router.push('/musica/editar');
}

export default function TabsLayout() {
  const membership = useActiveMembership();
  const role = membership?.role ?? 'member';

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} role={role} onQuickAction={handleQuickAction} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="musicas" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
