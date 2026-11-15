import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, space } from '@/theme/tokens';

type Props = { message: string; tone?: 'error' | 'info' };

// Aviso em caixa com borda (erro do formulário ou explicação), como o aviso de indisponibilidade do design.
export function Notice({ message, tone = 'info' }: Props) {
  return (
    <View
      style={[styles.box, tone === 'error' && styles.error]}
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
    >
      <Text variant="bodySm" color={tone === 'error' ? 'danger' : 'inkSoft'}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.eventRow,
    padding: space.lg,
  },
  error: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
});
