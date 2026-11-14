import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, size, space } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** Rola o conteúdo (padrão). */
  scroll?: boolean;
  /** Deixa espaço embaixo para a barra de abas e para um botão fixo. */
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

// Tela: fundo `bg`, padding horizontal 16, respeita a área segura (notch, barra de status).
export function Screen({ children, scroll = true, bottomInset = size.tabBar + space.xxl, contentStyle }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingBottom: bottomInset }, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}
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
