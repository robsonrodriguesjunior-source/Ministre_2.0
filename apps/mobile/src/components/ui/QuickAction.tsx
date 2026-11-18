import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, size } from '@/theme/tokens';

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
};

// Atalho: quadrado 52, raio 16, `card`, ícone laranja 22 e rótulo 11.5/600 abaixo.
export function QuickAction({ icon, label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={styles.square}>
        <Icon name={icon} size={size.iconQuick} color={colors.inkSoft} />
      </View>
      <Text variant="quickAction" color="inkMuted">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  square: {
    width: size.quickAction,
    height: size.quickAction,
    borderRadius: radius.quickAction,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
