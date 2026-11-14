import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Chip, EmptyState, IconButton, KeyBadge, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { songKeys, songsApi } from '@/features/songs/api';
import { savedStageSets } from '@/features/songs/offline';
import type { SongFilter, SongSummary } from '@/features/songs/types';
import { shortDate } from '@/lib/dates';
import { useActiveMembership } from '@/stores/session';
import { colors, space } from '@/theme/tokens';

const FILTERS: { value: SongFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'most_played', label: 'Mais tocadas' },
  { value: 'new', label: 'Novas' },
];

const played = (n: number) => (n === 0 ? 'Ainda não tocada' : `Tocada ${n} ${n === 1 ? 'vez' : 'vezes'}`);

function SongItem({ song, showPlayed, divider }: { song: SongSummary; showPlayed: boolean; divider: boolean }) {
  const sub = [song.artist, showPlayed ? played(song.played_count) : null, song.is_new ? 'Nova' : null].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/musica/[id]', params: { id: String(song.id) } })}
      accessibilityRole="button"
      accessibilityLabel={`${song.title}, tom ${song.original_key}${song.bpm ? `, ${song.bpm} bpm` : ''}`}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text variant="songName" numberOfLines={1}>
          {song.title}
        </Text>
        {!!sub && (
          <Text variant="meta" color="dim" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      {!!song.bpm && (
        <Text variant="meta" color="dim">
          {song.bpm} bpm
        </Text>
      )}
      <KeyBadge label={song.original_key} accessibilityLabel={`Tom ${song.original_key}`} />
    </Pressable>
  );
}

// Sem internet: os repertórios guardados no aparelho continuam abrindo no Modo Palco.
function OfflineSets() {
  const saved = useQuery({ queryKey: ['stage-saved'], queryFn: savedStageSets, networkMode: 'always' });
  return (
    <View>
      <EmptyState icon="music" message="Sem conexão com a internet. Os repertórios abaixo estão salvos no aparelho e abrem no Modo Palco." />
      {(saved.data ?? []).map((s, i, all) => (
        <Pressable
          key={s.key}
          onPress={() => router.push({ pathname: '/palco', params: { event: s.key.replace('event-', '') } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, i < all.length - 1 && styles.divider, pressed && styles.pressed]}
        >
          <View style={styles.flex}>
            <Text variant="songName">{s.title}</Text>
            <Text variant="meta" color="dim">
              {[s.starts_at ? shortDate(new Date(s.starts_at)) : null, `${s.count} ${s.count === 1 ? 'música' : 'músicas'}`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text variant="link" color="orange">
            Modo Palco
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Músicas (5.7): o repertório do ministério, com busca e filtros.
export default function MusicasScreen() {
  const membership = useActiveMembership();
  const isLeader = membership?.role === 'leader';
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<SongFilter>('all');
  const [tag, setTag] = useState<string | null>(null);

  // Busca só depois que a pessoa para de digitar.
  useEffect(() => {
    const t = setTimeout(() => setTerm(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = { q: term, filter, tag };
  const list = useQuery({ queryKey: songKeys.list(params), queryFn: () => songsApi.list(params), placeholderData: (prev) => prev });
  const tags = useQuery({ queryKey: songKeys.tags, queryFn: songsApi.tags });
  const songs = list.data?.data ?? [];

  const pick = (f: SongFilter, t: string | null) => {
    setFilter(f);
    setTag(t);
  };

  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => qc.invalidateQueries({ queryKey: songKeys.all })}>
      <View style={styles.header}>
        <Text variant="screenTitle" accessibilityRole="header">
          Músicas
        </Text>
        {isLeader && <IconButton icon="plus" label="Nova música" onPress={() => router.push('/musica/editar')} />}
      </View>

      <View style={styles.search}>
        <TextField label="Buscar" value={q} onChangeText={setQ} placeholder="Nome da música ou artista…" returnKeyType="search" autoCorrect={false} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
        {FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} selected={filter === f.value && !tag} onPress={() => pick(f.value, null)} />
        ))}
        {(tags.data?.data ?? []).map((t) => (
          <Chip key={t} label={t} selected={tag === t} onPress={() => pick('all', tag === t ? null : t)} />
        ))}
      </ScrollView>

      {list.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : !list.data && (list.isError || list.fetchStatus === 'paused') ? (
        <OfflineSets />
      ) : songs.length === 0 ? (
        <EmptyState
          icon="music"
          message={term || tag || filter !== 'all' ? 'Nenhuma música encontrada.' : 'O repertório ainda está vazio.'}
          actionLabel={isLeader && !term ? 'Cadastrar música' : undefined}
          onAction={() => router.push('/musica/editar')}
        />
      ) : (
        <View>
          {songs.map((s, i) => (
            <SongItem key={s.id} song={s} showPlayed={filter === 'most_played'} divider={i < songs.length - 1} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { marginTop: space.lg },
  chipsWrap: { marginTop: space.md, marginBottom: space.xs, marginHorizontal: -space.lg, flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  loading: { gap: space.md, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { opacity: 0.7 },
});
