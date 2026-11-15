import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { colors, radius, size, space } from '@/theme/tokens';

import type { SongLink } from './types';

export const PLATFORM: Record<SongLink['type'], string> = { youtube: 'YouTube', spotify: 'Spotify', deezer: 'Deezer', other: 'o link' };

const open = (url: string) => Linking.openURL(url).catch(() => undefined);

type Props = {
  links: SongLink[];
  /** Linha da escala/lista: um botão pequeno "Ouvir" que abre o primeiro link. */
  compact?: boolean;
};

// "Ouvir no YouTube / Spotify / Deezer": abre a música no lugar de origem. Não há player dentro do app.
export function ListenButtons({ links, compact = false }: Props) {
  if (links.length === 0) return null;

  if (compact) {
    const first = links[0];
    return (
      <Pressable
        onPress={() => open(first.url)}
        accessibilityRole="link"
        accessibilityLabel={`Ouvir no ${PLATFORM[first.type]}`}
        hitSlop={6}
        style={({ pressed }) => [styles.small, pressed && styles.pressed]}
      >
        <Icon name="play" size={14} color={colors.orange} strokeWidth={2.4} />
        <Text variant="pill" color="ink">
          Ouvir
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      {links.map((l) => (
        <Pressable
          key={l.url}
          onPress={() => open(l.url)}
          accessibilityRole="link"
          accessibilityLabel={`Ouvir no ${PLATFORM[l.type]}`}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Icon name="play" size={16} color={colors.orange} strokeWidth={2.4} />
          <Text variant="link" color="ink">
            {l.type === 'other' ? 'Ouvir' : `Ouvir no ${PLATFORM[l.type]}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: size.touch,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.7 },
});
