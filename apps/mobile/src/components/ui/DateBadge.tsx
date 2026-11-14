import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, size } from '@/theme/tokens';

const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

type Props = { date: Date };

// Data em destaque: 56×60, raio 16, laranja; dia 24/800 e mês 11/800 em maiúsculas.
export function DateBadge({ date }: Props) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  return (
    <View style={styles.badge} accessibilityLabel={`${date.getDate()} de ${month}`}>
      <Text variant="dateDay" color="onOrange" style={styles.line}>
        {day}
      </Text>
      <Text variant="dateMonth" color="onOrange" style={[styles.line, styles.month]}>
        {month}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: size.dateBadgeW,
    height: size.dateBadgeH,
    borderRadius: radius.eventRow,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    lineHeight: undefined,
    includeFontPadding: false,
  },
  month: {
    marginTop: 2,
  },
});
