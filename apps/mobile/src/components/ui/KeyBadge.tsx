import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  /** orange = tom (borda laranja) · line = informação extra, como "72 bpm" (borda `line`). */
  tone?: 'orange' | 'line';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Selo do tom ("G", "Tom G") e do andamento ("72 bpm").
export function KeyBadge({ label, tone = 'orange', accessibilityLabel, style }: Props) {
  const orange = tone === 'orange';
  return (
    <View style={[styles.badge, orange ? styles.orange : styles.line, style]} accessibilityLabel={accessibilityLabel ?? label}>
      <Text variant="pill" color={orange ? 'orange' : 'dim'}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderRadius: radius.key,
    paddingHorizontal: 9,
    paddingVertical: space.xs,
    minWidth: 34,
    alignItems: 'center',
  },
  orange: { borderColor: colors.orange },
  line: { borderColor: colors.line },
});
