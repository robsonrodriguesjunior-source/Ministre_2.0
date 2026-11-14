import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet, type QuickActionId } from '@/components/nav/ActionSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { lightTap } from '@/lib/haptics';
import { duration, easeOut, useReduceMotion } from '@/theme/motion';
import { colors, motion, size, space } from '@/theme/tokens';

// Abas na ordem do design: Início · Agenda · [ + ] · Músicas · Perfil.
const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Início', icon: 'home' },
  agenda: { label: 'Agenda', icon: 'calendar' },
  musicas: { label: 'Músicas', icon: 'music' },
  perfil: { label: 'Perfil', icon: 'user' },
};

type Props = BottomTabBarProps & {
  role?: 'leader' | 'member';
  onQuickAction?: (id: QuickActionId) => void;
};

// Barra de abas: altura 72, `tabBar`, borda superior `line`; ativa em laranja.
// Botão + central de 50 px, laranja, elevado (-26) com anel de 5 px na cor `bg`; gira 45° ao abrir o painel.
export function TabBar({ state, emitter, navigateToTab, role = 'leader', onQuickAction }: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(open ? 45 : 0, { duration: duration(motion.plus, reduce), easing: easeOut });
  }, [open, reduce, rotation]);

  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const routes = state.routes.filter((r) => r.name in TABS);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const meta = TABS[route.name];
    const focused = state.routes[state.index]?.key === route.key;
    const tint = focused ? colors.orange : colors.tabInactive;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        style={styles.tab}
      >
        <Icon name={meta.icon} size={size.iconTab} color={tint} />
        <Text variant="tabLabel" style={{ color: tint }}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <View style={[styles.bar, { height: size.tabBar + insets.bottom, paddingBottom: 14 + insets.bottom }]}>
        {left.map(renderTab)}
        <Pressable
          onPress={() => {
            lightTap();
            setOpen((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Fechar ações rápidas' : 'Abrir ações rápidas'}
          style={styles.plusWrap}
        >
          <View style={styles.plus}>
            <Animated.View style={plusStyle}>
              <Icon name="plus" size={24} strokeWidth={2.6} color={colors.onOrange} />
            </Animated.View>
          </View>
        </Pressable>
        {right.map(renderTab)}
      </View>

      <ActionSheet
        visible={open}
        role={role}
        onClose={() => setOpen(false)}
        onSelect={(id) => {
          setOpen(false);
          onQuickAction?.(id);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: space.sm,
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: {
    width: 56,
    minHeight: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  plusWrap: {
    width: size.plusButton + size.plusRing * 2,
    alignItems: 'center',
  },
  plus: {
    width: size.plusButton + size.plusRing * 2,
    height: size.plusButton + size.plusRing * 2,
    borderRadius: (size.plusButton + size.plusRing * 2) / 2,
    borderWidth: size.plusRing,
    borderColor: colors.bg,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -size.plusLift - size.plusRing,
  },
});
