import { useEffect } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/theme/motion';
import { colors, radius } from '@/theme/tokens';

type Props = {
  width?: DimensionValue;
  height: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
};

// Bloco `card` pulsando no formato do conteúdo. Nunca tela vazia carregando.
export function Skeleton({ width = '100%', height, rounded = radius.button, style }: Props) {
  const reduce = useReduceMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduce) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduce, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityLabel="Carregando"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.card }, animated, style]}
    />
  );
}
