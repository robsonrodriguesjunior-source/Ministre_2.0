import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { space } from '@/theme/tokens';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Título de seção 15/700 com link laranja opcional à direita ("Ver todos").
export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text variant="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      {!!actionLabel && (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={10}>
          <Text variant="link" color="orangeText">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 18,
    marginBottom: space.sm,
    marginHorizontal: space.xxs,
  },
});
