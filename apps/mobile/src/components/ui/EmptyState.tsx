import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, space } from '@/theme/tokens';

type Props = {
  icon: IconName;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Estado vazio: ícone fino, frase curta e uma ação.
export function EmptyState({ icon, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={32} color={colors.dim} />
      <Text variant="body" color="inkSoft" style={styles.message}>
        {message}
      </Text>
      {!!actionLabel && (
        <Button label={actionLabel} variant="secondary" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  message: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
  },
});
