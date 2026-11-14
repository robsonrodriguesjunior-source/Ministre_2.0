import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, space, type } from '@/theme/tokens';

import { type Accidental, type Line, parseChordPro } from './chordpro';

type Props = {
  chordpro: string;
  /** Troca de tom em semitons. */
  semitones?: number;
  accidental?: Accidental;
  /** Tamanho da letra: 1 = normal (A− / A+ mudam isso). */
  scale?: number;
  /** Esconde os acordes. */
  lyricsOnly?: boolean;
  /** page = tela da música (18/600) · stage = Modo Palco (23/600). */
  variant?: 'page' | 'stage';
};

// Cifra renderizada: acorde em mono laranja acima da sílaba, letra embaixo.
// A linha só quebra entre palavras, nunca no meio de uma (mesmo com acorde dentro dela).
export const ChordSheet = memo(function ChordSheet({
  chordpro,
  semitones = 0,
  accidental = 'sharp',
  scale = 1,
  lyricsOnly = false,
  variant = 'page',
}: Props) {
  const sheet = useMemo(() => parseChordPro(chordpro, semitones, accidental), [chordpro, semitones, accidental]);

  const base = variant === 'stage' ? type.stageLyric : type.lyric;
  const lyric = { ...base, fontSize: base.fontSize * scale, lineHeight: base.lineHeight * scale, color: colors.ink };
  const chord = { ...type.chord, fontSize: type.chord.fontSize * scale, lineHeight: type.chord.lineHeight * scale, color: colors.orange };
  const gap = lyric.fontSize * 0.3; // espaço entre palavras
  const lineGap = (variant === 'stage' ? 14 : 10) * scale;

  if (sheet.lines.length === 0) {
    return (
      <Text variant="body" color="dim">
        Esta música ainda não tem cifra cadastrada.
      </Text>
    );
  }

  return (
    <View accessibilityRole="text">
      {sheet.lines.map((line: Line, i) => {
        if (line.kind === 'blank') return <View key={i} style={{ height: lineGap }} />;
        if (line.kind === 'section') {
          return (
            <Text key={i} variant="section" color="tabInactive" style={styles.section} accessibilityRole="header">
              {line.label}
            </Text>
          );
        }
        if (lyricsOnly || !line.hasChords) {
          if (lyricsOnly && !line.plain) return null; // linha só de acordes
          return (
            <Text key={i} style={[lyric, { marginBottom: lineGap }]}>
              {lyricsOnly ? line.plain : line.words.map((w) => w.map((p) => p.text).join('')).join(' ')}
            </Text>
          );
        }
        return (
          <View key={i} style={[styles.line, { marginBottom: lineGap }]} accessibilityLabel={line.plain}>
            {line.words.map((word, w) => (
              <View key={w} style={[styles.word, { marginRight: gap }]}>
                {word.map((piece, p) => (
                  <View key={p}>
                    <Text style={chord}>{piece.chord ? `${piece.chord} ` : ' '}</Text>
                    <Text style={lyric}>{piece.text || ' '}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { marginTop: space.xs, marginBottom: space.md },
  line: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { flexDirection: 'row' },
});
