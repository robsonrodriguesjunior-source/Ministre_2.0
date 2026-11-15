import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, size, space } from '@/theme/tokens';

const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type Props = {
  /** Os 7 dias exibidos (normalmente segunda a domingo). */
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
  /** Dias com evento recebem o ponto laranja. */
  hasEvent?: (day: Date) => boolean;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Faixa da semana: 7 colunas; selecionado com fundo laranja e raio 14; ponto de 5 px nos dias com evento.
export function WeekStrip({ days, selected, onSelect, hasEvent }: Props) {
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const sel = sameDay(d, selected);
        const dot = hasEvent?.(d) ?? false;
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelect(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            aria-pressed={sel}
            accessibilityLabel={`Dia ${d.getDate()}${dot ? ', tem culto' : ''}`}
            style={[styles.day, sel && styles.selected]}
          >
            <Text variant="dayLetter" color={sel ? 'onOrange' : 'dim'}>
              {LETTERS[d.getDay()]}
            </Text>
            <Text variant="dayNumber" color={sel ? 'onOrange' : 'ink'}>
              {d.getDate()}
            </Text>
            <View style={[styles.dot, dot && (sel ? styles.dotOnOrange : styles.dotOrange)]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.xs,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.tag,
  },
  selected: {
    backgroundColor: colors.orange,
  },
  dot: {
    width: size.dot,
    height: size.dot,
    borderRadius: size.dot / 2,
    backgroundColor: colors.transparent,
  },
  dotOrange: {
    backgroundColor: colors.orange,
  },
  dotOnOrange: {
    backgroundColor: colors.onOrange,
  },
});
