import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, size, space } from '@/theme/tokens';

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

type Props = {
  date: Date;
  title: string;
  subtitle: string;
  /** Você está escalado: borda laranja. */
  mine?: boolean;
  /** Você não está escalado: esmaecido. */
  dimmed?: boolean;
  right?: ReactNode;
  onPress?: () => void;
};

// Evento na agenda: cartão branco com borda, raio 12, padding 12; selo da data à esquerda.
export function EventRow({ date, title, subtitle, mine = false, dimmed = false, right, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.row, mine && styles.mine, dimmed && styles.dimmed, pressed && styles.pressed]}
    >
      <View style={[styles.date, mine && styles.dateMine]}>
        <Text variant="weekday" color="dim">
          {WEEKDAYS[date.getDay()]}
        </Text>
        <Text variant="eventDay" color="ink">
          {String(date.getDate()).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text variant="eventTitle" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="meta" color="dim" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.eventRow,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  // Visual sóbrio: a linha em que você está escalado não muda de cor (o status já diz).
  mine: {},
  dimmed: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.85,
  },
  // Selo da data (manual Light): quadrado marfim; laranja suave quando você está escalado.
  date: {
    width: size.eventDateCol + 4,
    paddingVertical: space.xs + 2,
    borderRadius: radius.key,
    backgroundColor: colors.card2,
    alignItems: 'center',
  },
  dateMine: {},
  texts: {
    flex: 1,
    gap: space.xxs,
  },
});
