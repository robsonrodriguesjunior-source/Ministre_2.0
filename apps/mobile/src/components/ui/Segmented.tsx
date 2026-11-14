import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { duration, easeOut, useReduceMotion } from '@/theme/motion';
import { colors, motion, radius } from '@/theme/tokens';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

const PAD = 4;

// Abas segmentadas: fundo `card`, raio 12, indicador `card2` raio 9 que desliza (0,25 s).
export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(index * segment, { duration: duration(motion.segment, reduce), easing: easeOut });
  }, [index, segment, reduce, x]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {segment > 0 && <Animated.View style={[styles.indicator, { width: segment }, indicatorStyle]} />}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.option}
          >
            <Text variant="segment" color={active ? 'ink' : 'dim'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.button,
    padding: PAD,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.segmentIndicator,
    backgroundColor: colors.card2,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
  },
});
