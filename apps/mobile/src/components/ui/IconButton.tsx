import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, size } from '@/theme/tokens';

type Props = {
  icon: IconName;
  label: string; // rótulo de acessibilidade (o ícone não tem texto)
  onPress?: () => void;
  badge?: boolean; // ponto laranja de notificação
};

// Botão redondo de 38 (área de toque 44) com ícone. Ponto laranja de 7 px quando há novidade.
export function IconButton({ icon, label, onPress, badge = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, há novidades` : label}
      hitSlop={(size.touch - size.iconButton) / 2}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name={icon} />
      {badge && <View style={styles.badge} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: size.iconButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: size.notifyDot,
    height: size.notifyDot,
    borderRadius: size.notifyDot / 2,
    backgroundColor: colors.orange,
  },
});
