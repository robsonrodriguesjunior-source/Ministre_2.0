import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius } from '@/theme/tokens';

export type PillTone = 'ok' | 'wait' | 'declined';

type Props = {
  label: string;
  tone?: PillTone;
  style?: StyleProp<ViewStyle>;
};

// Pílula de status, sempre por extenso (cor nunca é o único sinal). ok = verde com ✓ · wait = neutra · declined = neutra com ⊘.
export function Pill({ label, tone = 'wait', style }: Props) {
  const ok = tone === 'ok';
  const color = ok ? colors.success : colors.dim;
  return (
    <View style={[styles.pill, ok ? styles.ok : styles.neutral, style]} accessibilityLabel={label}>
      {ok && <Icon name="check" size={12} strokeWidth={3} color={color} />}
      {tone === 'declined' && <Icon name="unavailable" size={12} strokeWidth={2.4} color={color} />}
      <Text variant="pill" color={ok ? 'success' : 'dim'}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  ok: {
    backgroundColor: colors.successBg,
  },
  neutral: {
    backgroundColor: colors.card2,
  },
});
