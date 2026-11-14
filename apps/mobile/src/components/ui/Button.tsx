import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { success } from '@/lib/haptics';
import { duration, easeOut, useReduceMotion } from '@/theme/motion';
import { colors, motion, radius, size } from '@/theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  /** Quando true, o botão mostra o estado confirmado (ex.: "Presença confirmada"). */
  confirmed?: boolean;
  confirmedLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

// Botão do app. Primário = laranja (um por tela). Secundário = borda.
// Ao virar "confirmado": encolhe para 0.96 e volta, o texto sobe e some, entra "✓ ..." e vibra de leve.
export function Button({
  label,
  onPress,
  variant = 'primary',
  confirmed = false,
  confirmedLabel = 'Confirmado',
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
}: Props) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const progress = useSharedValue(confirmed ? 1 : 0);

  useEffect(() => {
    const d = duration(motion.confirm, reduce);
    if (confirmed) {
      scale.value = withSequence(
        withTiming(0.96, { duration: d * 0.4, easing: easeOut }),
        withTiming(1, { duration: d * 0.6, easing: easeOut }),
      );
      success();
    }
    progress.value = withTiming(confirmed ? 1 : 0, { duration: d, easing: easeOut });
  }, [confirmed, reduce, progress, scale]);

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -10 * progress.value }],
  }));
  const confirmedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 10 * (1 - progress.value) }],
  }));

  const primary = variant === 'primary';
  const fg = primary ? 'onOrange' : 'ink';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={confirmed ? confirmedLabel : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}
    >
      <Animated.View style={[styles.base, primary ? styles.primary : styles.secondary, containerStyle]}>
        {loading ? (
          <ActivityIndicator color={colors[fg]} />
        ) : (
          <>
            <Animated.View style={[styles.layer, labelStyle]}>
              <Text variant="button" color={fg}>
                {label}
              </Text>
            </Animated.View>
            <Animated.View style={[styles.layer, confirmedStyle]} pointerEvents="none">
              <View style={styles.row}>
                <Icon name="check" size={17} strokeWidth={3} color={colors[fg]} />
                <Text variant="button" color={fg}>
                  {confirmedLabel}
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: size.button,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: colors.orange,
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
  },
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
