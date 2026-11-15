import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, size, space } from '@/theme/tokens';

type Props = {
  icon: IconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  /** Ação que não tem volta (ex.: excluir conta): texto laranja, sem seta. */
  danger?: boolean;
  divider?: boolean;
};

// Linha de menu do Perfil e da Gestão: ícone, título, explicação curta e seta.
export function MenuRow({ icon, label, subtitle, onPress, danger = false, divider = true }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.ink} />
      </View>
      <View style={styles.texts}>
        <Text variant="tileTitle" color={danger ? 'danger' : 'ink'}>
          {label}
        </Text>
        {!!subtitle && (
          <Text variant="meta" color="dim" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {!danger && <Icon name="forward" size={18} color={colors.tabInactive} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: size.touch + space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { opacity: 0.7 },
  icon: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.button,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
});
