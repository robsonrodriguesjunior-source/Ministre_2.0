import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName, Text } from '@/components/ui';
import { useSession } from '@/stores/session';
import { colors, radius, space } from '@/theme/tokens';

function Option({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Icon name={icon} size={24} color={colors.orange} />
      <View style={styles.optionText}>
        <Text variant="tileTitle">{title}</Text>
        <Text variant="bodySm" color="dim">
          {subtitle}
        </Text>
      </View>
      <Icon name="forward" color={colors.dim} />
    </Pressable>
  );
}

// Onboarding (5.1): entrar com convite ou criar o próprio ministério.
export default function Onboarding() {
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const firstName = user?.name.split(' ')[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.content}>
        <Text variant="meta" color="dim">
          {firstName ? `Olá, ${firstName}` : 'Olá'}
        </Text>
        <Text variant="question" accessibilityRole="header">
          Como você quer começar?
        </Text>
        <View style={styles.options}>
          <Option
            icon="megaphone"
            title="Tenho um convite"
            subtitle="Entrar no ministério com o código que o líder mandou"
            onPress={() => router.push('/convite')}
          />
          <Option
            icon="plus"
            title="Criar meu ministério"
            subtitle="Sou líder e quero organizar a minha equipe"
            onPress={() => router.push('/onboarding/criar')}
          />
        </View>
      </View>
      <Pressable onPress={signOut} accessibilityRole="button" style={styles.signOut} hitSlop={10}>
        <Text variant="link" color="dim">
          Sair desta conta
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: space.xs,
  },
  options: {
    marginTop: space.xxl,
    gap: space.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: {
    borderColor: colors.orange,
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: space.lg,
  },
});
