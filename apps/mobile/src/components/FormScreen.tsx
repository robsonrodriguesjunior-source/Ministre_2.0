import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glow, IconButton, Logo, Text } from '@/components/ui';
import { colors, size, space } from '@/theme/tokens';

type Props = {
  title?: string;
  /** Pergunta grande no topo (estilo do assistente: "Quando vai ser?"). */
  question?: string;
  subtitle?: string;
  children: ReactNode;
  /** Botões presos embaixo (ação principal). */
  footer?: ReactNode;
  back?: boolean;
  /** Botão à direita do título (ex.: "Novo aviso"). */
  action?: ReactNode;
  /** Logo oficial no topo e título centralizado (login e recuperação de senha). */
  logo?: boolean;
};

// Molde das telas de formulário: voltar, pergunta, campos rolando e a ação principal embaixo.
export function FormScreen({ title, question, subtitle, children, footer, back = true, action, logo = false }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <Glow calm />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.bar}>
          {back ? (
            <IconButton
              icon="back"
              label="Voltar"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ) : (
            <View style={styles.barSpacer} />
          )}
          {!!title && <Text variant="barTitle">{title}</Text>}
          {action ?? <View style={styles.barSpacer} />}
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={Platform.OS === 'web'}
        >
          {logo && (
            <View style={styles.logo}>
              <Logo variant="vertical" width={150} />
            </View>
          )}
          {!!question && (
            <Text variant="question" accessibilityRole="header" style={logo && styles.centered}>
              {question}
            </Text>
          )}
          {!!subtitle && (
            <Text variant="body" color="dim" style={[styles.subtitle, logo && styles.centered]}>
              {subtitle}
            </Text>
          )}
          <View style={styles.fields}>{children}</View>
        </ScrollView>
        {!!footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: 14,
  },
  barSpacer: {
    width: size.iconButton,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    paddingBottom: space.xxl,
  },
  subtitle: {
    marginTop: space.sm,
  },
  logo: {
    alignItems: 'center',
    marginBottom: space.xxl,
  },
  centered: {
    textAlign: 'center',
  },
  fields: {
    marginTop: space.xxl,
    gap: space.xl,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    gap: space.sm,
  },
});
