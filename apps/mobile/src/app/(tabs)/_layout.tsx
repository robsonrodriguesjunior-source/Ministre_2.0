import { Tabs } from 'expo-router/tabs';

import { handleQuickAction } from '@/components/nav/quickActions';
import { TabBar } from '@/components/nav/TabBar';
import { useDesktop } from '@/lib/layout';
import { useActiveMembership } from '@/stores/session';

export default function TabsLayout() {
  const membership = useActiveMembership();
  const role = membership?.role ?? 'member';
  // No computador a navegação fica no menu lateral (DesktopShell); a barra de abas some.
  const desktop = useDesktop();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (desktop ? null : <TabBar {...props} role={role} onQuickAction={handleQuickAction} />)}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="musicas" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
