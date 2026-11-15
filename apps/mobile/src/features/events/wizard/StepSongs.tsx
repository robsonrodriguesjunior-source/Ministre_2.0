import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Checkbox, Chip, Icon, Skeleton, Text, TextField } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

import { QuickAddSong } from '@/features/songs/QuickAddSong';
import type { SongDetail } from '@/features/songs/types';

import type { SongOption } from '../types';

export type SongPick = { song_id: number; title: string; key: string };

const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

type Props = { songs: SongOption[] | undefined; loading: boolean; picked: SongPick[]; onChange: (p: SongPick[]) => void };

// Passo 3: "O que vamos tocar?" — marcar, buscar, ordenar e trocar o tom para esta escala.
export function StepSongs({ songs, loading, picked, onChange }: Props) {
  const [q, setQ] = useState('');
  const [keyFor, setKeyFor] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  // Música nova pelo link: já fica salva na biblioteca e entra marcada nesta escala.
  const addNew = (song: SongDetail) => {
    setNewOpen(false);
    if (!picked.some((p) => p.song_id === song.id)) onChange([...picked, { song_id: song.id, title: song.title, key: song.original_key }]);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (songs ?? []).filter((s) => !term || s.title.toLowerCase().includes(term) || s.artist?.toLowerCase().includes(term));
  }, [songs, q]);

  const toggle = (s: SongOption) =>
    onChange(picked.some((p) => p.song_id === s.id) ? picked.filter((p) => p.song_id !== s.id) : [...picked, { song_id: s.id, title: s.title, key: s.original_key }]);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...picked];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const editing = picked.find((p) => p.song_id === keyFor);

  return (
    <View style={styles.wrap}>
      <Text variant="question">O que vamos tocar?</Text>

      {picked.length > 0 && (
        <>
          <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
            Ordem · {picked.length} {picked.length === 1 ? 'escolhida' : 'escolhidas'}
          </Text>
          {picked.map((p, i) => (
            <View key={p.song_id} style={styles.row}>
              <Text variant="eventDay" style={styles.number}>
                {i + 1}
              </Text>
              <Text variant="body" style={[styles.semibold, styles.flex]} numberOfLines={1}>
                {p.title}
              </Text>
              <Pressable onPress={() => setKeyFor(p.song_id)} accessibilityRole="button" accessibilityLabel={`Trocar o tom de ${p.title}, hoje ${p.key}`} style={styles.key}>
                <Text variant="pill" color="orange">
                  {p.key}
                </Text>
              </Pressable>
              <Pressable onPress={() => move(i, -1)} disabled={i === 0} accessibilityRole="button" accessibilityLabel={`Subir ${p.title}`} hitSlop={6} style={[styles.arrow, i === 0 && styles.disabled]}>
                <View style={styles.up}>
                  <Icon name="back" size={18} color={colors.ink} />
                </View>
              </Pressable>
              <Pressable onPress={() => move(i, 1)} disabled={i === picked.length - 1} accessibilityRole="button" accessibilityLabel={`Descer ${p.title}`} hitSlop={6} style={[styles.arrow, i === picked.length - 1 && styles.disabled]}>
                <View style={styles.down}>
                  <Icon name="back" size={18} color={colors.ink} />
                </View>
              </Pressable>
            </View>
          ))}
        </>
      )}

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Repertório
      </Text>
      <TextField label="Buscar" value={q} onChangeText={setQ} placeholder="Buscar outra música…" />
      <Pressable onPress={() => setNewOpen(true)} accessibilityRole="button" style={styles.newSong}>
        <Icon name="plus" size={16} color={colors.orange} />
        <Text variant="link" color="orange">
          Nova música pelo link (YouTube, Spotify ou Deezer)
        </Text>
      </Pressable>
      <View style={styles.list}>
        {loading ? (
          <>
            <Skeleton height={44} />
            <Skeleton height={44} />
          </>
        ) : filtered.length === 0 ? (
          <Text variant="bodySm" color="dim">
            {songs?.length ? 'Nenhuma música com esse nome.' : 'O repertório ainda está vazio. Cadastre as músicas na aba Músicas.'}
          </Text>
        ) : (
          filtered.map((s) => (
            <Checkbox
              key={s.id}
              checked={picked.some((p) => p.song_id === s.id)}
              onChange={() => toggle(s)}
              accessibilityLabel={`${s.title}, tom ${s.original_key}`}
              label={
                <View style={styles.songLabel}>
                  <Text variant="body" style={[styles.semibold, styles.flex]} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text variant="meta" color="dim">
                    Tom {s.original_key}
                  </Text>
                </View>
              }
            />
          ))
        )}
      </View>

      <BottomSheet visible={newOpen} onClose={() => setNewOpen(false)} title="Nova música" scroll>
        {newOpen && <QuickAddSong onSaved={addNew} onUseExisting={addNew} />}
      </BottomSheet>

      <BottomSheet visible={keyFor !== null} onClose={() => setKeyFor(null)} title={editing ? `Tom de ${editing.title}` : ''}>
        <View style={styles.keys}>
          {KEYS.map((k) => (
            <Chip
              key={k}
              label={k}
              selected={editing?.key === k}
              onPress={() => {
                onChange(picked.map((p) => (p.song_id === keyFor ? { ...p, key: k } : p)));
                setKeyFor(null);
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.xxl },
  flex: { flex: 1 },
  semibold: { fontFamily: 'Figtree_600SemiBold' },
  label: { marginTop: 22, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  number: { width: 22, color: colors.lineStrong },
  key: { borderWidth: 1.5, borderColor: colors.orange, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
  arrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  up: { transform: [{ rotate: '90deg' }] },
  down: { transform: [{ rotate: '-90deg' }] },
  disabled: { opacity: 0.25 },
  list: { marginTop: space.sm },
  songLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  newSong: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: space.xs },
});
