import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet, Button, Card, Chip, EmptyState, Icon, IconButton, Notice, Skeleton, Text, TextField } from '@/components/ui';
import { songKeys, songsApi } from '@/features/songs/api';
import { ChordSheet } from '@/features/songs/ChordSheet';
import { chordsOverLyricsToChordPro, KEYS, looksLikeChordsOverLyrics } from '@/features/songs/chordpro';
import type { SongDetail, SongInput } from '@/features/songs/types';
import { ApiError } from '@/lib/api';
import { useActiveMembership } from '@/stores/session';
import { colors, radius, size, space, type } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

type Form = {
  title: string;
  artist: string;
  note: string; // C, C#, D…
  minor: boolean;
  bpm: string;
  duration: string; // "4:30"
  chordpro: string;
  tags: string[];
  links: string[];
};

const EMPTY: Form = { title: '', artist: '', note: 'G', minor: false, bpm: '', duration: '', chordpro: '', tags: [], links: [] };
const MAX_LINKS = 5;
const EXAMPLE = '{c: Refrão}\n[G]Como um rio que [D]desce o monte';

function fromSong(s: SongDetail): Form {
  const minor = s.original_key.endsWith('m');
  const sec = s.duration_sec ?? 0;
  return {
    title: s.title,
    artist: s.artist ?? '',
    note: minor ? s.original_key.slice(0, -1) : s.original_key,
    minor,
    bpm: s.bpm ? String(s.bpm) : '',
    duration: sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '',
    chordpro: s.chordpro,
    tags: s.tags,
    links: s.links.map((l) => l.url),
  };
}

/** "4:30" ou "4" (minutos) em segundos; vazio = sem duração; inválido = undefined. */
function parseDuration(text: string): number | null | undefined {
  const t = text.trim();
  if (!t) return null;
  const m = /^(\d{1,2})(?::([0-5]\d))?$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : undefined;
}

// Nova ou editar música (5.7), só para líderes.
export default function EditarMusica() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const editId = rawId ? Number(rawId) : null;
  const membership = useActiveMembership();
  const qc = useQueryClient();

  const [form, setForm] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(!editId);
  const [dirty, setDirty] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const existing = useQuery({ queryKey: songKeys.detail(editId ?? 0), queryFn: () => songsApi.get(editId!), enabled: !!editId });
  const tagList = useQuery({ queryKey: songKeys.tags, queryFn: songsApi.tags });

  // Editar: preenche o formulário com a música (uma vez).
  const song = existing.data?.data;
  if (song && !loaded) {
    setForm(fromSong(song));
    setLoaded(true);
  }

  if (membership && membership.role !== 'leader') {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="music" message="Só líderes do ministério cadastram músicas." actionLabel="Voltar" onAction={() => goBack('/musicas')} />
      </SafeAreaView>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };
  const toggleTag = (t: string) => set('tags', form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t]);
  const addTag = () => {
    const t = newTag.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setNewTag('');
  };
  const allTags = [...new Set([...(tagList.data?.data ?? []), ...form.tags])];
  const showConvert = looksLikeChordsOverLyrics(form.chordpro);

  const save = async () => {
    const duration = parseDuration(form.duration);
    const local: Record<string, string> = {};
    if (!form.title.trim()) local.title = 'Dê um nome para a música.';
    if (duration === undefined) local.duration_sec = 'Use minutos e segundos, como 4:30.';
    if (form.bpm && !/^\d{2,3}$/.test(form.bpm.trim())) local.bpm = 'Use só números, como 72.';
    setErrors(local);
    if (Object.keys(local).length) return;

    const body: SongInput = {
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      original_key: form.note + (form.minor ? 'm' : ''),
      bpm: form.bpm ? Number(form.bpm) : null,
      duration_sec: duration ?? null,
      chordpro: form.chordpro,
      tags: form.tags,
      links: form.links.map((l) => l.trim()).filter(Boolean),
    };

    setSaving(true);
    setError(null);
    try {
      const saved = editId ? (await songsApi.update(editId, body)).data : (await songsApi.create(body)).data;
      qc.invalidateQueries({ queryKey: songKeys.all });
      qc.invalidateQueries({ queryKey: ['songs-options'] });
      if (editId) goBack('/musicas');
      else router.replace({ pathname: '/musica/[id]', params: { id: String(saved.id) } });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        const byField: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.fieldErrors)) byField[k.startsWith('links.') ? 'links' : k] = v[0];
        setErrors(byField);
        setError('Confira os campos marcados.');
      } else {
        setError(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const close = () => (dirty ? setConfirmClose(true) : goBack('/musicas'));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.bar}>
          <IconButton icon="close" label="Fechar" onPress={close} />
          <Text variant="barTitle">{editId ? 'Editar música' : 'Nova música'}</Text>
          <View style={styles.spacer} />
        </View>

        {!loaded ? (
          <View style={styles.loading}>
            {existing.isError ? (
              <EmptyState icon="music" message="Não foi possível abrir esta música." actionLabel="Voltar" onAction={() => goBack('/musicas')} />
            ) : (
              <>
                <Skeleton height={50} />
                <Skeleton height={50} />
                <Skeleton height={160} />
              </>
            )}
          </View>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextField label="Nome" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Ex.: Rio de Graça" error={errors.title} maxLength={120} />
            <TextField label="Artista" value={form.artist} onChangeText={(v) => set('artist', v)} placeholder="Opcional" error={errors.artist} maxLength={120} />

            <View style={styles.group}>
              <Text variant="fieldLabel" color="dim">
                Tom original
              </Text>
              <View style={styles.wrap}>
                {KEYS.map((k) => (
                  <Chip key={k} label={k + (form.minor ? 'm' : '')} selected={form.note === k} onPress={() => set('note', k)} />
                ))}
                <Chip label="Menor" selected={form.minor} onPress={() => set('minor', !form.minor)} />
              </View>
              {!!errors.original_key && (
                <Text variant="meta" color="orange">
                  {errors.original_key}
                </Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="BPM" value={form.bpm} onChangeText={(v) => set('bpm', v.replace(/\D/g, ''))} placeholder="72" keyboardType="number-pad" maxLength={3} error={errors.bpm} />
              </View>
              <View style={styles.flex}>
                <TextField label="Duração" value={form.duration} onChangeText={(v) => set('duration', v)} placeholder="4:30" keyboardType="numbers-and-punctuation" maxLength={5} error={errors.duration_sec} />
              </View>
            </View>

            <View style={styles.group}>
              <Text variant="fieldLabel" color="dim">
                Tags
              </Text>
              {allTags.length > 0 && (
                <View style={styles.wrap}>
                  {allTags.map((t) => (
                    <Chip key={t} label={t} selected={form.tags.includes(t)} onPress={() => toggleTag(t)} />
                  ))}
                </View>
              )}
              <TextField label="Nova tag" value={newTag} onChangeText={setNewTag} onSubmitEditing={addTag} onBlur={addTag} placeholder="Ex.: Adoração, Ceia" returnKeyType="done" maxLength={30} error={errors.tags} />
            </View>

            <View style={styles.group}>
              <Text variant="fieldLabel" color="dim">
                Links (YouTube, Spotify ou outro)
              </Text>
              {form.links.map((l, i) => (
                <View key={i} style={styles.linkRow}>
                  <View style={styles.flex}>
                    <TextField
                      label={`Link ${i + 1}`}
                      value={l}
                      onChangeText={(v) => set('links', form.links.map((x, j) => (j === i ? v : x)))}
                      placeholder="https://"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                  </View>
                  <IconButton icon="close" label={`Remover link ${i + 1}`} onPress={() => set('links', form.links.filter((_, j) => j !== i))} />
                </View>
              ))}
              {!!errors.links && (
                <Text variant="meta" color="orange">
                  {errors.links}
                </Text>
              )}
              {form.links.length < MAX_LINKS && (
                <Pressable onPress={() => set('links', [...form.links, ''])} accessibilityRole="button" style={styles.addLink}>
                  <Icon name="plus" size={16} color={colors.orange} />
                  <Text variant="link" color="orange">
                    Adicionar link
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={styles.group}>
              <Text variant="fieldLabel" color="dim">
                Cifra
              </Text>
              <Text variant="meta" color="dim">
                Escreva o acorde entre colchetes antes da sílaba e marque as partes com chaves. Ex.: {EXAMPLE.replace('\n', ' · ')}
              </Text>
              <TextInput
                value={form.chordpro}
                onChangeText={(v) => set('chordpro', v)}
                multiline
                accessibilityLabel="Cifra"
                placeholder={EXAMPLE}
                placeholderTextColor={colors.tabInactive}
                selectionColor={colors.orange}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textAlignVertical="top"
                style={styles.editor}
              />
              {!!errors.chordpro && (
                <Text variant="meta" color="orange">
                  {errors.chordpro}
                </Text>
              )}
              {showConvert && (
                <Card style={styles.convert}>
                  <Text variant="bodySm" color="inkSoft">
                    Parece uma cifra com os acordes em cima da letra. Quer converter para o formato do Ministre?
                  </Text>
                  <Button label="Converter cifra" variant="secondary" onPress={() => set('chordpro', chordsOverLyricsToChordPro(form.chordpro))} />
                </Card>
              )}
            </View>

            {!!form.chordpro.trim() && (
              <View style={styles.group}>
                <Text variant="fieldLabel" color="dim">
                  Como fica
                </Text>
                <Card>
                  <ChordSheet chordpro={form.chordpro} />
                </Card>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.footer}>
          {!!error && <Notice tone="error" message={error} />}
          <Button label={editId ? 'Salvar alterações' : 'Salvar música'} onPress={save} loading={saving} disabled={!loaded} />
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={confirmClose} onClose={() => setConfirmClose(false)} title="Descartar as alterações?">
        <Text variant="bodySm" color="inkSoft">
          O que você preencheu será perdido.
        </Text>
        <View style={styles.sheetActions}>
          <Button label="Descartar" onPress={() => { setConfirmClose(false); goBack('/musicas'); }} />
          <Button label="Continuar editando" variant="secondary" onPress={() => setConfirmClose(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 14 },
  spacer: { width: size.iconButton },
  loading: { padding: space.lg, gap: space.md },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xxl, gap: space.xl },
  group: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.md },
  linkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: size.touch, alignSelf: 'flex-start' },
  editor: {
    ...type.editor,
    minHeight: 220,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.button,
    padding: space.md,
    outlineStyle: 'none',
  } as object,
  convert: { gap: space.md },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg, gap: space.sm },
  sheetActions: { gap: space.sm, marginTop: space.lg },
});
