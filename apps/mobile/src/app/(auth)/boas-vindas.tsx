import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Logo, Text } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

// Abertura (manual Light): fundo marfim, logo oficial vertical no centro, decoração mínima.
export default function Welcome() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.center}>
        <View accessibilityRole="header">
          <Logo variant="vertical" width={220} />
        </View>
        <Text variant="body" color="dim" style={styles.tagline}>
          As escalas do seu ministério, em ordem.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button label="Entrar" onPress={() => router.push('/entrar')} />
        <Button label="Criar conta" variant="secondary" onPress={() => router.push('/criar-conta')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ivory,
    paddingHorizontal: space.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
  },
  tagline: {
    textAlign: 'center',
  },
  actions: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
});
