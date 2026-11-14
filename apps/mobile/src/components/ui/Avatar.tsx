import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { avatarTones, colors, fonts, size as sizes } from '@/theme/tokens';

type AvatarProps = {
  name: string;
  photoUrl?: string | null;
  /** Identificador estável (ex.: id do usuário) para o tom de fundo nunca mudar. */
  seed?: string | number;
  size?: number;
  /** Cor da borda (usada no empilhado para "recortar" do fundo). */
  ringColor?: string;
};

function initials(name: string) {
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return avatarTones[Math.abs(h) % avatarTones.length];
}

// Foto real ou, sem foto, iniciais sobre um tom terroso fixo por pessoa.
export function Avatar({ name, photoUrl, seed, size = sizes.avatarList, ringColor }: AvatarProps) {
  const ring = ringColor ? { borderWidth: 2, borderColor: ringColor } : null;
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[box, ring]}
        contentFit="cover"
        accessibilityLabel={`Foto de ${name}`}
      />
    );
  }

  return (
    <View
      style={[styles.fallback, box, ring, { backgroundColor: toneFor(String(seed ?? name)) }]}
      accessibilityLabel={name}
    >
      <Text
        variant="pill"
        color="ink"
        style={{ fontFamily: fonts.bold, fontSize: Math.max(9, size * 0.36) }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

type StackPerson = { name: string; photoUrl?: string | null; seed?: string | number };

type AvatarStackProps = {
  people: StackPerson[];
  max?: number;
  /** Cor do fundo onde a pilha está (a borda de 2 px usa essa cor). */
  backgroundColor?: string;
};

// Avatares empilhados: 26 px, borda 2 na cor do fundo, sobreposição -8.
export function AvatarStack({ people, max = 4, backgroundColor = colors.card }: AvatarStackProps) {
  const shown = people.slice(0, max);
  return (
    <View style={styles.stack} accessibilityLabel={`${people.length} pessoas`}>
      {shown.map((p, i) => (
        <View key={`${p.seed ?? p.name}-${i}`} style={i > 0 ? styles.overlap : undefined}>
          <Avatar
            name={p.name}
            photoUrl={p.photoUrl}
            seed={p.seed}
            size={sizes.avatarStack}
            ringColor={backgroundColor}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlap: {
    marginLeft: -8,
  },
});
