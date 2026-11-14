import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, size, space } from '@/theme/tokens';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// Opção de escolha (funções, tipos de culto): borda `line`; escolhida fica laranja.
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      {selected && <Icon name="check" size={15} strokeWidth={3} color={colors.onOrange} />}
      <Text variant="chip" color={selected ? 'onOrange' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: size.touch,
    paddingHorizontal: space.lg,
    borderRadius: radius.eventRow,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selected: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  pressed: {
    opacity: 0.85,
  },
});
