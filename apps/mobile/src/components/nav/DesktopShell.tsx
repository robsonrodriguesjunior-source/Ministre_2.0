import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type PressableStateCallbackType } from 'react-native';

import { ActionSheet } from '@/components/nav/ActionSheet';
import { handleQuickAction } from '@/components/nav/quickActions';
import { Avatar, Button, Icon, type IconName, IconButton, Logo, Text } from '@/components/ui';
import { eventKeys, eventsApi } from '@/features/events/api';
import { useActiveMembership, useSession } from '@/stores/session';
import { colors, radius, size, space, weight } from '@/theme/tokens';

type NavItem = { label: string; icon: IconName; href: Href; match: string[]; leaderOnly?: boolean };

// Só o que o app já tem (o manual pede para não inventar módulos).
const MAIN: NavItem[] = [
  { label: 'Início', icon: 'home', href: '/', match: [] },
  { label: 'Agenda', icon: 'calendar', href: '/agenda', match: ['/agenda', '/escala'] },
  { label: 'Músicas', icon: 'music', href: '/musicas', match: ['/musicas', '/musica', '/palco'] },
  { label: 'Avisos', icon: 'megaphone', href: '/avisos', match: ['/avisos', '/aviso'] },
  { label: 'Indisponibilidade', icon: 'unavailable', href: '/indisponibilidade', match: ['/indisponibilidade'] },
  { label: 'Gestão', icon: 'list', href: '/gestao', match: ['/gestao'], leaderOnly: true },
  { label: 'Configurações', icon: 'sliders', href: '/configuracoes', match: ['/configuracoes'], leaderOnly: true },
];
const ACCOUNT: NavItem = { label: 'Perfil', icon: 'user', href: '/perfil', match: ['/perfil', '/ajustes-notificacoes'] };

function isActive(item: NavItem, pathname: string) {
  if (item.href === '/') return pathname === '/';
  return item.match.some((m) => pathname === m || pathname.startsWith(m + '/'));
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Pressable
      onPress={() => router.navigate(item.href)}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      aria-current={active ? 'page' : undefined}
      accessibilityLabel={item.label}
      style={(state: PressableStateCallbackType & { hovered?: boolean }) => [
        styles.navItem,
        state.hovered && !active && styles.navHover,
        active && styles.navActive,
      ]}
    >
      <Icon name={item.icon} size={20} color={active ? colors.orangeText : colors.inkSoft} />
      <Text variant={active ? 'navActive' : 'nav'} color={active ? 'orangeText' : 'ink'}>
        {item.label}
      </Text>
    </Pressable>
  );
}

// Menu lateral claro (manual, figura 1): logo horizontal, navegação, ações rápidas e o ministério ativo.
function Sidebar() {
  const pathname = usePathname();
  const membership = useActiveMembership();
  const leader = membership?.role === 'leader';
  const [actions, setActions] = useState(false);

  return (
    <View style={styles.sidebar} accessibilityRole="navigation" aria-label="Menu principal">
      {/* Em telas baixas o menu rola, em vez de um item ficar por cima do outro. */}
      <ScrollView style={styles.flex} contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="Ministre, ir para o Início" style={styles.logo}>
        <Logo variant="horizontal" width={150} />
      </Pressable>

      <View style={styles.nav}>
        {MAIN.filter((i) => !i.leaderOnly || leader).map((i) => (
          <NavLink key={i.label} item={i} active={isActive(i, pathname)} />
        ))}
        <View style={styles.divider} />
        <NavLink item={ACCOUNT} active={isActive(ACCOUNT, pathname)} />
      </View>

      <Button label="Ações rápidas" variant="secondary" onPress={() => setActions(true)} />

      {!!membership && (
        <View style={styles.ministry}>
          <Logo variant="symbol" width={28} />
          <View style={styles.flex}>
            <Text variant="bodySm" numberOfLines={1} style={styles.ministryName}>
              {membership.ministry.name}
            </Text>
            <Text variant="meta" color="dim" numberOfLines={1}>
              {membership.church.name}
            </Text>
          </View>
        </View>
      )}
      </ScrollView>

      <ActionSheet
        visible={actions}
        role={leader ? 'leader' : 'member'}
        onClose={() => setActions(false)}
        onSelect={(id) => {
          setActions(false);
          handleQuickAction(id);
        }}
      />
    </View>
  );
}

// Cabeçalho de 64 px: igreja à esquerda; notificações e a pessoa à direita.
function Header() {
  const membership = useActiveMembership();
  const user = useSession((s) => s.user);
  const home = useQuery({ queryKey: eventKeys.home, queryFn: eventsApi.home });
  const unread = home.data?.unread_notifications ?? 0;

  return (
    <View style={styles.header} accessibilityRole="banner">
      <View style={styles.flex}>
        <Text variant="headerName" numberOfLines={1}>
          {membership?.church.name ?? 'Ministre'}
        </Text>
      </View>
      <IconButton icon="bell" label="Notificações" badge={unread > 0} onPress={() => router.push('/notificacoes')} />
      <Pressable onPress={() => router.navigate('/perfil')} accessibilityRole="link" accessibilityLabel="Meu perfil" style={styles.me}>
        <Avatar name={user?.name ?? '?'} photoUrl={user?.avatar_url} seed={user?.id} size={36} />
        <Text variant="headerName" numberOfLines={1}>
          {user?.name ?? ''}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Moldura do app. No celular: coluna simples (na web, centralizada com a largura de um celular;
 * a Gestão usa uma coluna larga). No computador (`desktop`): menu lateral + cabeçalho + conteúdo centralizado.
 * A árvore é sempre a mesma (só o menu e o cabeçalho aparecem/somem), para a navegação não reiniciar
 * ao redimensionar a janela ou ao entrar na conta.
 */
export function AppFrame({ desktop, children }: { desktop: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const wideMobile = pathname.startsWith('/gestao') || pathname.startsWith('/configuracoes');
  const maxWidth = desktop
    ? pathname === '/'
      ? size.desktopHome
      : wideMobile
        ? size.maxWideWidth
        : size.desktopPage
    : Platform.OS === 'web'
      ? wideMobile
        ? size.maxWideWidth
        : size.maxContentWidth
      : undefined;

  return (
    <View style={styles.root}>
      {desktop ? <Sidebar /> : null}
      <View style={styles.main}>
        {desktop ? <Header /> : null}
        <View style={[styles.content, desktop && styles.contentDesktop]}>
          <View style={[styles.page, { maxWidth }]}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  flex: { flex: 1 },
  sidebar: {
    width: size.sidebar,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  sidebarContent: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.lg,
    gap: space.xl,
  },
  logo: { paddingHorizontal: space.sm },
  nav: { flexGrow: 1, gap: space.xs },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.navItem,
    paddingHorizontal: space.md,
    borderRadius: radius.key,
  },
  navHover: { backgroundColor: colors.ivory },
  navActive: { backgroundColor: colors.orangeSoft },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
  ministry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.eventRow,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ministryName: weight.semibold,
  main: { flex: 1 },
  header: {
    height: size.header,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xxl + space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  me: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: size.sidebar },
  content: { flex: 1 },
  contentDesktop: { paddingHorizontal: space.xxl, paddingTop: space.sm },
  page: { flex: 1, width: '100%', alignSelf: 'center' },
});
