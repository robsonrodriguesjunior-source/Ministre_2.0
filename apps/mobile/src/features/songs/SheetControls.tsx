import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Segmented, Text } from '@/components/ui';
import { lightTap } from '@/lib/haptics';
import { colors, radius, size, space } from '@/theme/tokens';

import type { Accidental } from './chordpro';

export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.6;
export const SCALE_STEP = 0.1;

type Props = {
  keyLabel: string;
  onTranspose: (step: 1 | -1) => void;
  accidental: Accidental;
  onAccidental: (a: Accidental) => void;
  scale: number;
  onScale: (scale: number) => void;
  lyricsOnly: boolean;
  onLyricsOnly: (v: boolean) => void;
};

function Round({ label, onPress, disabled, children }: { label: string; onPress: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        lightTap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.round, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {children}
    </Pressable>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="fieldLabel" color="dim" style={styles.rowLabel}>
        {label}
      </Text>
      <View style={styles.rowControls}>{children}</View>
    </View>
  );
}

// Transpor (− / tom / +, com # ou b), tamanho da letra (A− / A+) e "só letra" (5.7).
export function SheetControls({ keyLabel, onTranspose, accidental, onAccidental, scale, onScale, lyricsOnly, onLyricsOnly }: Props) {
  const round = (v: number) => Math.round(v * 10) / 10;
  return (
    <View style={styles.wrap}>
      <Row label="Tom">
        <Round label="Descer meio tom" onPress={() => onTranspose(-1)}>
          <Icon name="minus" />
        </Round>
        <View style={styles.key} accessibilityLabel={`Tom ${keyLabel}`} accessibilityLiveRegion="polite">
          <Text variant="sectionTitle" color="orange">
            {keyLabel}
          </Text>
        </View>
        <Round label="Subir meio tom" onPress={() => onTranspose(1)}>
          <Icon name="plus" />
        </Round>
        <View style={styles.accidental}>
          <Segmented<Accidental>
            options={[
              { value: 'sharp', label: '#' }, // como se escreve na cifra: C#, F#
              { value: 'flat', label: 'b' }, // Bb, Eb
            ]}
            value={accidental}
            onChange={onAccidental}
          />
        </View>
      </Row>
      <Row label="Letra">
        <Round label="Diminuir a letra" onPress={() => onScale(round(Math.max(MIN_SCALE, scale - SCALE_STEP)))} disabled={scale <= MIN_SCALE}>
          <Text variant="sectionTitle">A−</Text>
        </Round>
        <Round label="Aumentar a letra" onPress={() => onScale(round(Math.min(MAX_SCALE, scale + SCALE_STEP)))} disabled={scale >= MAX_SCALE}>
          <Text variant="sectionTitle">A+</Text>
        </Round>
        <Pressable
          onPress={() => onLyricsOnly(!lyricsOnly)}
          accessibilityRole="switch"
          accessibilityState={{ checked: lyricsOnly }}
          accessibilityLabel="Só letra"
          style={[styles.toggle, lyricsOnly && styles.toggleOn]}
        >
          <Text variant="chip" color={lyricsOnly ? 'onOrange' : 'ink'}>
            Só letra
          </Text>
        </Pressable>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLabel: { width: 48 },
  rowControls: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  round: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  key: { minWidth: 44, alignItems: 'center' },
  accidental: { flex: 1, maxWidth: 110, marginLeft: 'auto' },
  toggle: {
    marginLeft: 'auto',
    minHeight: size.touch,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.eventRow,
    borderWidth: 1,
    borderColor: colors.line,
  },
  toggleOn: { backgroundColor: colors.orange, borderColor: colors.orange },
});
