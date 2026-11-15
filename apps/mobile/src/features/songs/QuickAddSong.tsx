import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, Notice, Text, TextField } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { colors, radius, space, type } from '@/theme/tokens';

import { songKeys, songsApi } from './api';
import { KEYS } from './chordpro';
import { LinkImport } from './LinkImport';
import type { SongDetail, SongLookup } from './types';

type Props = {
  /** A música foi salva na biblioteca. */
  onSaved: (song: SongDetail) => void;
  /** O link já estava na biblioteca: usar a que existe. */
  onUseExisting: (song: SongDetail) => void;
  /** Escala de onde a música está sendo cadastrada (necessário para o ministro). */
  eventId?: number;
};

// Música nova a partir do link: preenche título, cantor e letra; o tom a pessoa escolhe. Salva na biblioteca.
export function QuickAddSong({ onSaved, onUseExisting, eventId }: Props) {
  const qc = useQueryClient();
  const [link, setLink] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [minor, setMinor] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [existing, setExisting] = useState<SongLookup['existing']>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fill = useCallback((d: SongLookup) => {
    setLink(d.url);
    if (d.title) setTitle(d.title);
    if (d.artist) setArtist(d.artist);
    setBpm(d.bpm);
    setDuration(d.duration_sec);
    if (d.lyrics) setLyrics(d.lyrics);
    setExisting(d.existing);
  }, []);

  const useExisting = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      onUseExisting((await songsApi.get(existing.id)).data);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const local: Record<string, string> = {};
    if (!title.trim()) local.title = 'Dê um nome para a música.';
    if (!note) local.original_key = 'Escolha o tom.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    setError(null);
    try {
      const { data } = await songsApi.create({
        event_id: eventId,
        title: title.trim(),
        artist: artist.trim() || null,
        original_key: note + (minor ? 'm' : ''),
        bpm,
        duration_sec: duration,
        chordpro: lyrics.trim(),
        tags: [],
        links: link ? [link] : [],
      });
      qc.invalidateQueries({ queryKey: songKeys.all });
      qc.invalidateQueries({ queryKey: ['songs-options'] });
      onSaved(data);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors({ title: e.field('title'), original_key: e.field('original_key') });
      } else {
        setError(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <LinkImport onResult={fill} />

      {!!existing && (
        <View style={styles.existing}>
          <Text variant="bodySm" color="inkSoft">
            “{existing.title}” já está na biblioteca com esse link.
          </Text>
          <Button label="Usar a da biblioteca" variant="secondary" onPress={useExisting} loading={busy} />
        </View>
      )}

      <TextField label="Nome" value={title} onChangeText={setTitle} placeholder="Ex.: Lugar Secreto" maxLength={120} error={errors.title} />
      <TextField label="Cantor" value={artist} onChangeText={setArtist} placeholder="Opcional" maxLength={120} />

      <View style={styles.group}>
        <Text variant="fieldLabel" color="dim">
          Tom
        </Text>
        <Text variant="meta" color="tabInactive">
          Os links não informam o tom: escolha aqui (dá para mudar depois).
        </Text>
        <View style={styles.keys}>
          {KEYS.map((k) => (
            <Chip key={k} label={k + (minor ? 'm' : '')} selected={note === k} onPress={() => setNote(k)} />
          ))}
          <Chip label="Menor" selected={minor} onPress={() => setMinor((m) => !m)} />
        </View>
        {!!errors.original_key && (
          <Text variant="meta" color="orange">
            {errors.original_key}
          </Text>
        )}
      </View>

      <View style={styles.group}>
        <Text variant="fieldLabel" color="dim">
          Letra
        </Text>
        <TextInput
          value={lyrics}
          onChangeText={setLyrics}
          multiline
          accessibilityLabel="Letra"
          placeholder="Vem sozinha com o link, ou cole aqui. Os acordes podem ser colocados depois, na música."
          placeholderTextColor={colors.tabInactive}
          selectionColor={colors.orange}
          textAlignVertical="top"
          style={styles.lyrics}
        />
      </View>

      {!!error && <Notice tone="error" message={error} />}
      <Button label="Salvar na biblioteca e adicionar" onPress={save} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  group: { gap: space.sm },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  existing: { gap: space.sm },
  lyrics: {
    ...type.editor,
    minHeight: 120,
    maxHeight: 220,
    color: colors.ink,
    backgroundColor: colors.card2,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.button,
    padding: space.md,
    outlineStyle: 'none',
  } as object,
});
