import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, Card, EmptyState, Icon, IconButton, KeyBadge, Pill, Skeleton, Text } from '@/components/ui';
import { songKeys, songsApi } from '@/features/songs/api';
import { ChordSheet } from '@/features/songs/ChordSheet';
import { SheetControls } from '@/features/songs/SheetControls';
import type { SongDetail, SongLink } from '@/features/songs/types';
import { useTranspose } from '@/features/songs/useTranspose';
import { dayMonth } from '@/lib/dates';
import { colors, size, space } from '@/theme/tokens';

const LINK_LABEL: Record<SongLink['type'], string> = { youtube: 'YouTube', spotify: 'Spotify', other: 'Ouvir' };

const minutes = (sec: number | null) => (sec ? `${Math.max(1, Math.round(sec / 60))} min` : null);

function playedText(song: SongDetail) {
  if (song.played_count === 0) return 'Ainda não foi tocada';
  const times = `Tocada ${song.played_count} ${song.played_count === 1 ? 'vez' : 'vezes'}`;
  return song.last_played_at ? `${times} · última em ${dayMonth(new Date(song.last_played_at))}` : times;
}

function SongBody({ song, startKey }: { song: SongDetail; startKey: string | null }) {
  const insets = useSafeAreaInsets();
  const t = useTranspose(song.original_key, startKey);
  const [scale, setScale] = useState(1);
  const [lyricsOnly, setLyricsOnly] = useState(false);

  return (
    <>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Text variant="songHeader" accessibilityRole="header">
          {song.title}
        </Text>
        {!!song.artist && (
          <Text variant="body" color="dim">
            {song.artist}
          </Text>
        )}

        <View style={styles.badges}>
          <KeyBadge label={`Tom ${song.original_key}`} accessibilityLabel={`Tom original ${song.original_key}`} />
          {!!song.bpm && <KeyBadge label={`${song.bpm} bpm`} tone="line" />}
          {!!song.duration_sec && <KeyBadge label={minutes(song.duration_sec)!} tone="line" />}
          {song.tags.map((tag) => (
            <Pill key={tag} label={tag} />
          ))}
        </View>
        <Text variant="meta" color="dim" style={styles.played}>
          {playedText(song)}
        </Text>

        {song.links.length > 0 && (
          <View style={styles.links}>
            {song.links.map((l) => (
              <Pressable
                key={l.url}
                onPress={() => Linking.openURL(l.url).catch(() => undefined)}
                accessibilityRole="link"
                accessibilityLabel={`Abrir no ${LINK_LABEL[l.type]}`}
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              >
                <Icon name="link" size={16} color={colors.orange} />
                <Text variant="link" color="ink">
                  {LINK_LABEL[l.type]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Card style={styles.controls}>
          <SheetControls
            keyLabel={t.keyLabel}
            onTranspose={t.transpose}
            accidental={t.accidental}
            onAccidental={t.setAccidental}
            scale={scale}
            onScale={setScale}
            lyricsOnly={lyricsOnly}
            onLyricsOnly={setLyricsOnly}
          />
        </Card>

        <View style={styles.sheet}>
          <ChordSheet chordpro={song.chordpro} semitones={t.semitones} accidental={t.accidental} scale={scale} lyricsOnly={lyricsOnly} />
        </View>
      </ScrollView>

      {!!song.chordpro.trim() && (
        <View style={[styles.cta, { bottom: space.lg + insets.bottom }]}>
          <Button
            label="Abrir Modo Palco"
            onPress={() => router.push({ pathname: '/palco', params: { song: String(song.id), key: t.keyLabel } })}
          />
        </View>
      )}
    </>
  );
}

// Música (5.7): dados, links e a cifra com transposição.
export default function Musica() {
  const params = useLocalSearchParams<{ id: string; key?: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({ queryKey: songKeys.detail(id), queryFn: () => songsApi.get(id), enabled: Number.isFinite(id) });
  const song = query.data?.data;

  const remove = useMutation({
    mutationFn: () => songsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: songKeys.all });
      qc.invalidateQueries({ queryKey: ['songs-options'] });
      setConfirmDelete(false);
      router.navigate('/musicas'); // volta para o repertório, venha de onde vier
    },
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/musicas'));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.bar}>
        <IconButton icon="back" label="Voltar" onPress={back} />
        <Text variant="barTitle">Música</Text>
        {song?.can_manage ? <IconButton icon="more" label="Mais opções" onPress={() => setMenu(true)} /> : <View style={styles.spacer} />}
      </View>

      {!song ? (
        <View style={styles.loading}>
          {query.isError ? (
            <EmptyState icon="music" message="Não foi possível abrir esta música." actionLabel="Voltar" onAction={back} />
          ) : (
            <>
              <Skeleton height={34} />
              <Skeleton height={24} />
              <Skeleton height={120} />
              <Skeleton height={200} />
            </>
          )}
        </View>
      ) : (
        <SongBody key={song.id} song={song} startKey={params.key ?? null} />
      )}

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title={song?.title}>
        <View style={styles.sheetActions}>
          <Button
            label="Editar música"
            variant="secondary"
            onPress={() => {
              setMenu(false);
              router.push({ pathname: '/musica/editar', params: { id: String(id) } });
            }}
          />
          <Button
            label="Remover do repertório"
            variant="secondary"
            onPress={() => {
              setMenu(false);
              setConfirmDelete(true);
            }}
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remover do repertório?">
        <Text variant="bodySm" color="inkSoft">
          A música sai da lista, mas continua aparecendo nas escalas em que já foi usada.
        </Text>
        <View style={styles.sheetActions}>
          <Button label="Remover" onPress={() => remove.mutate()} loading={remove.isPending} />
          <Button label="Cancelar" variant="secondary" onPress={() => setConfirmDelete(false)} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 14 },
  spacer: { width: size.iconButton },
  loading: { padding: space.lg, gap: space.md },
  content: { paddingHorizontal: space.lg, paddingTop: space.lg },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.md },
  played: { marginTop: space.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.7 },
  controls: { marginTop: space.lg },
  sheet: { marginTop: space.xl },
  cta: { position: 'absolute', left: space.lg, right: space.lg },
  sheetActions: { gap: space.sm, marginTop: space.lg },
});
