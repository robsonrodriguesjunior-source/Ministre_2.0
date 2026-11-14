import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';

import type { QuickActionId } from '@/components/nav/ActionSheet';
import { TabBar } from '@/components/nav/TabBar';

// Etapa 1: as ações do + ainda não têm tela; por enquanto abrem o catálogo de componentes.
function handleQuickAction(id: QuickActionId) {
  if (id === 'my-events') router.navigate('/agenda');
  else router.push('/_catalogo');
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} role="leader" onQuickAction={handleQuickAction} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="musicas" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
