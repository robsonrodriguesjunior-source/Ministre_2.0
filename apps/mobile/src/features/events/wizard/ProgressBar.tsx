import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { duration, easeOut, useReduceMotion } from '@/theme/motion';
import { colors, motion } from '@/theme/tokens';

function Segment({ filled }: { filled: boolean }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, { duration: duration(motion.step, reduce), easing: easeOut });
  }, [filled, reduce, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

// Barra de progresso em 3 segmentos que enchem em laranja (5.5).
export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`Passo ${step} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} filled={i < step} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.orange },
});
