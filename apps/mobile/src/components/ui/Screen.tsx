import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, size, space } from '@/theme/tokens';


import { Glow } from './Glow';

type Props = {
  children: ReactNode;
  /** Rola o conteúdo (padrão). */
  scroll?: boolean;
  /** Deixa espaço embaixo para a barra de abas e para um botão fixo. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Puxar para atualizar. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Algo preso embaixo da tela (ex.: botão fixo acima da barra de abas). */
  overlay?: ReactNode;
};

// Tela: fundo `bg` com o brilho do Vidro escuro, padding horizontal 16, respeita a área segura (notch, barra de status).
export function Screen({
  children,
  scroll = true,
  bottomInset = size.tabBar + space.xxl,
  contentStyle,
  refreshing,
  onRefresh,
  overlay,
}: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <Glow />
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentStyle]}
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.orange}
                colors={[colors.orange]}
                progressBackgroundColor={colors.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: 14,
  },
});
