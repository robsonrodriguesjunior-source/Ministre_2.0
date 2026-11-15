import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Icon, KeyBadge, Segmented, Skeleton, Text, TextField } from '@/components/ui';
import { eventsApi } from '@/features/events/api';
import { colors, space } from '@/theme/tokens';

import { QuickAddSong } from './QuickAddSong';

export type PickedSong = { song_id: number; title: string; key: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (song: PickedSong) => void;
  /** Músicas que já estão na escala (aparecem marcadas). */
  added: number[];
  /** Escala aberta (o ministro só cadastra música nova de dentro dela). */
  eventId?: number;
};

type Mode = 'library' | 'new';

// "Adicionar música" na escala: da biblioteca ou uma nova pelo link (que já fica salva na biblioteca).
export function AddSongSheet({ visible, onClose, onAdd, added, eventId }: Props) {
  const [mode, setMode] = useState<Mode>('library');
  const [q, setQ] = useState('');
  const songs = useQuery({ queryKey: ['songs-options'], queryFn: eventsApi.songs, enabled: visible });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (songs.data?.data ?? []).filter((s) => !term || s.title.toLowerCase().includes(term) || s.artist?.toLowerCase().includes(term));
  }, [songs.data, q]);

  const close = () => {
    setMode('library');
    setQ('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={close} title="Adicionar música" scroll>
      <View style={styles.wrap}>
        <Segmented<Mode>
          options={[
            { value: 'library', label: 'Da biblioteca' },
            { value: 'new', label: 'Nova música' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === 'library' ? (
          <>
            <TextField label="Buscar" value={q} onChangeText={setQ} placeholder="Nome da música ou cantor…" autoCorrect={false} />
            {songs.isLoading ? (
              <Skeleton height={120} />
            ) : filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text variant="bodySm" color="dim">
                  {q ? 'Nenhuma música com esse nome na biblioteca.' : 'A biblioteca ainda está vazia.'}
                </Text>
                <Text variant="link" color="orange" onPress={() => setMode('new')} accessibilityRole="button">
                  Cadastrar pelo link
                </Text>
              </View>
            ) : (
              filtered.map((s) => {
                const isAdded = added.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => !isAdded && onAdd({ song_id: s.id, title: s.title, key: s.original_key })}
                    disabled={isAdded}
                    accessibilityRole="button"
                    accessibilityLabel={isAdded ? `${s.title}, já está na escala` : `Adicionar ${s.title}, tom ${s.original_key}`}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed, isAdded && styles.added]}
                  >
                    <View style={styles.flex}>
                      <Text variant="songName" numberOfLines={1}>
                        {s.title}
                      </Text>
                      {!!s.artist && (
                        <Text variant="meta" color="dim" numberOfLines={1}>
                          {s.artist}
                        </Text>
                      )}
                    </View>
                    <KeyBadge label={s.original_key} />
                    <Icon name={isAdded ? 'check' : 'plus'} size={18} color={isAdded ? colors.dim : colors.orange} />
                  </Pressable>
                );
              })
            )}
          </>
        ) : (
          <QuickAddSong
            eventId={eventId}
            onSaved={(song) => {
              onAdd({ song_id: song.id, title: song.title, key: song.original_key });
              close();
            }}
            onUseExisting={(song) => {
              onAdd({ song_id: song.id, title: song.title, key: song.original_key });
              close();
            }}
          />
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  flex: { flex: 1 },
  empty: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { opacity: 0.7 },
  added: { opacity: 0.5 },
});
