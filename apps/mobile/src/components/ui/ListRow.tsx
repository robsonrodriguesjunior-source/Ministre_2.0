import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors, size, space } from '@/theme/tokens';

type Props = {
  name: string;
  subtitle?: string;
  photoUrl?: string | null;
  seed?: string | number;
  right?: ReactNode;
  onPress?: () => void;
  divider?: boolean;
};

// Linha de membro: avatar 38, nome 14/700, função 12.5 `dim`, algo à direita (pílula) e divisória.
export function ListRow({ name, subtitle, photoUrl, seed, right, onPress, divider = true }: Props) {
  const content = (
    <>
      <Avatar name={name} photoUrl={photoUrl} seed={seed} size={size.avatarList} />
      <View style={styles.texts}>
        <Text variant="listName" numberOfLines={1}>
          {name}
        </Text>
        {!!subtitle && (
          <Text variant="meta" color="dim" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </>
  );

  const rowStyle = [styles.row, divider && styles.divider];
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    minHeight: size.touch,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pressed: {
    opacity: 0.8,
  },
  texts: {
    flex: 1,
    gap: space.xxs,
  },
});
