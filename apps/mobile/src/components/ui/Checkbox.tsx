import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, size, space } from '@/theme/tokens';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  accessibilityLabel: string;
};

// Caixa de marcar redonda (laranja quando marcada), como no passo "O que vamos tocar?".
export function Checkbox({ checked, onChange, label, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.checked]}>
        {checked && <Icon name="check" size={14} strokeWidth={3} color={colors.onOrange} />}
      </View>
      <View style={styles.label}>{label}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.touch,
  },
  box: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: size.checkbox / 2,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  label: {
    flex: 1,
  },
});
