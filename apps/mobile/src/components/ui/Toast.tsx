import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { colors, radius, space } from '@/theme/tokens';

type Props = { message: string | null; onHide: () => void; bottom?: number };

// Mensagem curta que aparece embaixo e some sozinha ("Lembramos 2 pessoas.").
export function Toast({ message, onHide, bottom = 150 }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 3200);
    return () => clearTimeout(t);
  }, [message, onHide]);

  if (!message) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.toast, { bottom }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text variant="bodySm">{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    backgroundColor: colors.card2,
    borderRadius: radius.button,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
});
