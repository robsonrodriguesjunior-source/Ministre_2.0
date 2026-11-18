import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  DateBadge,
  EmptyState,
  Glow,
  Icon,
  IconButton,
  KeyBadge,
  ListRow,
  Pill,
  Segmented,
  Skeleton,
  Text,
  Toast,
} from '@/components/ui';
import { eventsApi } from '@/features/events/api';
import { DeclineSheet } from '@/features/events/DeclineSheet';
import { EventMenu } from '@/features/events/EventMenu';
import { myStatus, statusPill } from '@/features/events/status';
import type { EventDetail, TeamMember } from '@/features/events/types';
import { useRespond } from '@/features/events/useRespond';
import { AddSongSheet, type PickedSong } from '@/features/songs/AddSongSheet';
import { songsApi } from '@/features/songs/api';
import { ListenButtons } from '@/features/songs/ListenButtons';
import { loadStageSet, saveStageSet, stageKey } from '@/features/songs/offline';
import { dayMonth, hour, weekdayName } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

type Tab = 'equipe' | 'repertorio';
const TABS: { value: Tab; label: string }[] = [
  { value: 'equipe', label: 'Equipe' },
  { value: 'repertorio', label: 'Repertório' },
];

const minutes = (sec: number | null) => (sec ? `${Math.round(sec / 60)} min` : null);

// Estrela do ministro: o líder toca para marcar/desmarcar; os outros só veem quem é o ministro.
function MinisterStar({ event, member, onStar }: { event: EventDetail; member: TeamMember; onStar: (memberId: number, on: boolean) => void }) {
  const on = member.is_minister;
  const icon = <Icon name="star" size={22} color={on ? colors.brand : colors.lineStrong} fill={on ? colors.brand : 'none'} strokeWidth={1.8} />;
  if (!event.can_manage) {
    return on ? (
      <View accessible accessibilityLabel="Ministro desta escala" style={styles.star}>
        {icon}
      </View>
    ) : null;
  }
  return (
    <Pressable
      onPress={() => onStar(member.member_id, !on)}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      aria-pressed={on}
      accessibilityLabel={on ? `Tirar ${member.name} de ministro` : `Marcar ${member.name} como ministro`}
      hitSlop={6}
      style={styles.star}
    >
      {icon}
    </Pressable>
  );
}

function TeamTab({ event, onStar }: { event: EventDetail; onStar: (memberId: number, on: boolean) => void }) {
  return (
    <View>
      {event.team.length === 0 && <EmptyState icon="user" message="Ninguém escalado ainda." />}
      {event.can_manage && event.team.length > 0 && (
        <Text variant="meta" color="dim" style={styles.starHint}>
          Toque na estrela para escolher o ministro: ele monta o repertório desta escala.
        </Text>
      )}
      {event.team.map((t, i) => {
        const pill = statusPill(t.status);
        const base = t.status === 'declined' && t.decline_reason ? `${t.position} · ${t.decline_reason}` : t.position;
        return (
          <ListRow
            key={t.assignment_id}
            name={t.is_me ? `${t.name.split(' ')[0]} (você)` : t.name}
            subtitle={t.is_minister ? `${base} · Ministro do culto` : base}
            photoUrl={t.avatar_url}
            seed={t.user_id}
            right={
              <View style={styles.teamRight}>
                <Pill label={pill.label} tone={pill.tone} />
                <MinisterStar event={event} member={t} onStar={onStar} />
              </View>
            }
            divider={i < event.team.length - 1}
          />
        );
      })}
      {!!event.notes && (
        <Card style={styles.notes}>
          <Text variant="cardLabel" color="orange">
            Observações do líder
          </Text>
          <Text variant="bodySm" color="inkSoft" style={styles.notesText}>
            {event.notes}
          </Text>
        </Card>
      )}
    </View>
  );
}

type SongsTabProps = {
  event: EventDetail;
  onAdd: () => void;
  onRemove: (songId: number) => void;
};

// Tocar numa música abre a cifra já no tom desta escala; "Ouvir" abre no YouTube, Spotify ou Deezer.
// O líder ou o ministro desta escala adiciona músicas (da biblioteca ou novas pelo link) e tira as que não vão mais.
// Os demais só veem e ouvem.
function SongsTab({ event, onAdd, onRemove }: SongsTabProps) {
  const add = event.can_edit_songs ? <Button label="Adicionar música" variant="secondary" onPress={onAdd} style={styles.addSong} /> : null;
  if (event.songs.length === 0) {
    return (
      <View>
        <EmptyState icon="music" message="Nenhuma música escolhida ainda." />
        {add}
      </View>
    );
  }
  return (
    <View>
      {event.songs.map((s, i) => (
        <Pressable
          key={s.id}
          onPress={() => router.push({ pathname: '/musica/[id]', params: { id: String(s.song_id), key: s.key } })}
          accessibilityRole="button"
          accessibilityLabel={`${i + 1}. ${s.title}, tom ${s.key}`}
          style={({ pressed }) => [styles.songRow, i < event.songs.length - 1 && styles.divider, pressed && styles.pressed]}
        >
          <Text variant="eventDay" style={styles.songNumber}>
            {i + 1}
          </Text>
          <View style={styles.flex}>
            <Text variant="songTitle">{s.title}</Text>
            <Text variant="meta" color="dim" numberOfLines={1}>
              {[s.artist, minutes(s.duration_sec), s.bpm ? `${s.bpm} bpm` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <ListenButtons links={s.links} compact />
          <KeyBadge label={s.key} accessibilityLabel={`Tom ${s.key}`} />
          {event.can_edit_songs && (
            <Pressable onPress={() => onRemove(s.song_id)} accessibilityRole="button" accessibilityLabel={`Tirar ${s.title} da escala`} hitSlop={8} style={styles.remove}>
              <Icon name="close" size={16} color={colors.dim} />
            </Pressable>
          )}
        </Pressable>
      ))}
      {add}
    </View>
  );
}

// Escala (5.4): o culto inteiro numa tela.
export default function Escala() {
  const params = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const id = Number(params.id);
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'equipe');
  const [addOpen, setAddOpen] = useState(false);
  const [pageWidth, setPageWidth] = useState(Math.min(windowWidth, size.maxContentWidth));
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [menu, setMenu] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const { confirm, decline } = useRespond();

  const query = useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.get(id), enabled: Number.isFinite(id) });
  const event = query.data?.data;
  const songCount = event?.songs.length ?? 0;

  // Guarda o repertório no aparelho assim que a escala abre, para o Modo Palco funcionar depois sem internet.
  useEffect(() => {
    if (!songCount) return;
    songsApi
      .stage(id)
      .then((r) => saveStageSet(stageKey({ eventId: id }), { ...r.data, saved_at: new Date().toISOString() }))
      .catch(() => undefined);
  }, [id, songCount, query.dataUpdatedAt]);

  // Sem internet: se o repertório desta escala foi guardado, o Modo Palco ainda abre.
  const saved = useQuery({
    queryKey: ['stage-saved', id],
    queryFn: () => loadStageSet(stageKey({ eventId: id })),
    enabled: !event && (query.isError || query.fetchStatus === 'paused'),
    networkMode: 'always',
  });

  // Repertório da escala: adicionar (da biblioteca ou nova) e tirar músicas.
  const saveSongs = useMutation({
    mutationFn: (songs: { song_id: number; key: string }[]) => eventsApi.setSongs(id, songs),
    onSuccess: (r) => {
      qc.setQueryData(['event', id], r);
      qc.invalidateQueries({ queryKey: ['home'] });
    },
    onError: () => setToast('Não foi possível salvar o repertório. Tente de novo.'),
  });
  const currentSongs = () => (event?.songs ?? []).map((s) => ({ song_id: s.song_id, key: s.key }));
  const addSong = (song: PickedSong) => {
    saveSongs.mutate([...currentSongs(), { song_id: song.song_id, key: song.key }]);
    setToast(`${song.title} entrou no repertório.`);
  };
  const removeSong = (songId: number) => saveSongs.mutate(currentSongs().filter((s) => s.song_id !== songId));

  // Estrela do ministro (só o líder).
  const setMinister = useMutation({
    mutationFn: ({ memberId, on }: { memberId: number; on: boolean }) => eventsApi.setMinister(id, memberId, on),
    onSuccess: (r, v) => {
      qc.setQueryData(['event', id], r);
      const name = r.data.team.find((t) => t.member_id === v.memberId)?.name.split(' ')[0] ?? 'A pessoa';
      setToast(v.on ? `${name} é o ministro: pode montar o repertório.` : `${name} não é mais o ministro.`);
    },
    onError: () => setToast('Não foi possível salvar o ministro. Tente de novo.'),
  });
  const star = (memberId: number, on: boolean) => setMinister.mutate({ memberId, on });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['event', id] });
    qc.invalidateQueries({ queryKey: ['events'] });
    qc.invalidateQueries({ queryKey: ['home'] });
  };
  const remind = useMutation({ mutationFn: () => eventsApi.remindPending(id), onSuccess: (r) => { setToast(r.message); refresh(); } });
  const publish = useMutation({ mutationFn: () => eventsApi.publish(id), onSuccess: () => { setToast('Escala publicada. A equipe foi avisada.'); refresh(); } });

  // Aba e página andam juntas: tocar na aba rola a página; deslizar a página troca a aba.
  const goTo = useCallback(
    (t: Tab) => {
      setTab(t);
      pager.current?.scrollTo({ x: TABS.findIndex((x) => x.value === t) * pageWidth, animated: true });
    },
    [pageWidth],
  );
  useEffect(() => {
    pager.current?.scrollTo({ x: TABS.findIndex((x) => x.value === tab) * pageWidth, animated: false });
    // só quando a largura muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth]);
  const onSwipe = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    const next = TABS[index]?.value;
    if (next && next !== tab) setTab(next);
  };

  if (query.isLoading || !event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Glow calm />
        <View style={styles.bar}>
          <IconButton icon="back" label="Voltar" onPress={() => goBack('/agenda')} />
          <Text variant="barTitle">Escala</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.loading}>
          {saved.data ? (
            <EmptyState
              icon="music"
              message="Sem conexão com a internet. O repertório desta escala está salvo no aparelho."
              actionLabel="Abrir Modo Palco"
              onAction={() => router.push({ pathname: '/palco', params: { event: String(id) } })}
            />
          ) : query.isError || query.fetchStatus === 'paused' ? (
            <EmptyState icon="calendar" message="Não foi possível abrir esta escala." actionLabel="Voltar" onAction={() => goBack('/agenda')} />
          ) : (
            <>
              <Skeleton height={60} />
              <Skeleton height={40} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const date = new Date(event.starts_at);
  const status = myStatus(event.mine);
  const first = event.mine[0];
  const iAmMinister = !event.can_manage && event.team.some((t) => t.is_me && t.is_minister);

  // Um botão por aba (5.4).
  let cta: React.ReactNode = null;
  if (tab === 'equipe') {
    if (event.status === 'draft' && event.can_manage) {
      cta = <Button label="Publicar escala" onPress={() => publish.mutate()} loading={publish.isPending} />;
    } else if (first && event.status === 'published' && (status === 'pending' || justConfirmed)) {
      cta = (
        <Button
          label="Confirmar minha presença"
          confirmed={justConfirmed}
          confirmedLabel="Presença confirmada"
          loading={confirm.isPending}
          onPress={() =>
            confirm.mutate(first.assignment_id, {
              onSuccess: () => {
                setJustConfirmed(true);
                setTimeout(() => setJustConfirmed(false), 1400);
              },
            })
          }
        />
      );
    } else if (event.can_manage && event.status === 'published' && event.pending_count > 0) {
      cta = (
        <Button
          label={`Lembrar ${event.pending_count} ${event.pending_count === 1 ? 'pendente' : 'pendentes'}`}
          onPress={() => remind.mutate()}
          loading={remind.isPending}
          disabled={event.remindable_count === 0}
          accessibilityHint="Manda um lembrete só para quem ainda não respondeu"
        />
      );
    }
  } else if (tab === 'repertorio' && event.songs.length > 0) {
    cta = <Button label="Abrir Modo Palco" onPress={() => router.push({ pathname: '/palco', params: { event: String(id) } })} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Glow calm />
      <View style={styles.bar}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/agenda'))} />
        <Text variant="barTitle">Escala</Text>
        {event.can_manage ? <IconButton icon="more" label="Mais opções" onPress={() => setMenu(true)} /> : <View style={styles.spacer} />}
      </View>

      <View style={styles.header}>
        <DateBadge date={date} />
        <View style={styles.flex}>
          <Text variant="headerTitle" numberOfLines={2}>
            {event.title}
          </Text>
          <Text variant="meta" color="dim">
            {[weekdayName(date), hour(date), event.location].filter(Boolean).join(' · ')}
          </Text>
          {!!event.rehearsal_at && (
            <Text variant="meta" color="orange">
              Ensaio: {weekdayName(new Date(event.rehearsal_at))}, {dayMonth(new Date(event.rehearsal_at))} · {hour(new Date(event.rehearsal_at))}
            </Text>
          )}
        </View>
      </View>
      {iAmMinister && (
        <View style={styles.statusRow}>
          <View style={styles.ministerBanner}>
            <Icon name="star" size={16} color={colors.brand} fill={colors.brand} />
            <Text variant="pill" color="orange">
              Você é o ministro: monte o repertório
            </Text>
          </View>
        </View>
      )}
      {event.visibility === 'temporary' && (
        <View style={styles.statusRow}>
          <Pill label="Escala Temporária · só os escalados veem" tone="wait" />
        </View>
      )}
      {event.status !== 'published' && (
        <View style={styles.statusRow}>
          <Pill label={event.status === 'draft' ? 'Rascunho · só líderes veem' : 'Culto cancelado'} tone={event.status === 'draft' ? 'wait' : 'declined'} />
        </View>
      )}
      {status === 'confirmed' && !justConfirmed && first && (
        <View style={styles.statusRow}>
          <Pill label="Presença confirmada" tone="ok" />
          <Text variant="link" color="orange" onPress={() => setDeclineOpen(true)} accessibilityRole="button">
            Não posso mais
          </Text>
        </View>
      )}
      {status === 'pending' && event.status === 'published' && (
        <View style={styles.statusRow}>
          <Text variant="link" color="orange" onPress={() => setDeclineOpen(true)} accessibilityRole="button">
            Não posso ir
          </Text>
        </View>
      )}

      <View style={styles.segment}>
        <Segmented<Tab> options={TABS} value={tab} onChange={goTo} />
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSwipe}
        onScrollEndDrag={onSwipe}
        scrollEventThrottle={16}
        onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
        style={styles.flex}
      >
        {[<TeamTab key="e" event={event} onStar={star} />, <SongsTab key="r" event={event} onAdd={() => setAddOpen(true)} onRemove={removeSong} />].map((page, i) => (
          <ScrollView
            key={i}
            style={{ width: pageWidth }}
            contentContainerStyle={[styles.page, { paddingBottom: (cta ? 120 : 40) + insets.bottom }]}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
          >
            {page}
          </ScrollView>
        ))}
      </ScrollView>

      {!!cta && <View style={[styles.cta, { bottom: space.lg + insets.bottom }]}>{cta}</View>}
      <Toast message={toast} onHide={() => setToast(null)} bottom={(cta ? 80 : 24) + insets.bottom} />

      {event.can_manage && <EventMenu event={event} visible={menu} onClose={() => setMenu(false)} onToast={setToast} />}
      {event.can_edit_songs && (
        <AddSongSheet visible={addOpen} onClose={() => setAddOpen(false)} onAdd={addSong} added={event.songs.map((s) => s.song_id)} eventId={id} />
      )}
      <DeclineSheet
        visible={declineOpen}
        onClose={() => setDeclineOpen(false)}
        eventTitle={event.title}
        onDecline={async (reason) => {
          if (!first) return;
          await decline.mutateAsync({ assignmentId: first.assignment_id, reason });
          setToast('O líder foi avisado.');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 14 },
  spacer: { width: size.iconButton },
  loading: { padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg, paddingHorizontal: space.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, paddingHorizontal: space.lg },
  segment: { marginTop: space.lg, paddingHorizontal: space.lg },
  page: { paddingHorizontal: space.lg, paddingTop: space.sm },
  notes: { marginTop: space.lg },
  notesText: { marginTop: space.sm },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  songNumber: { width: 22, color: colors.lineStrong },
  addSong: { marginTop: space.lg },
  remove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  teamRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  star: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center', marginRight: -space.sm },
  starHint: { marginTop: space.xs, marginBottom: space.xs },
  ministerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
  },
  pressed: { opacity: 0.7 },
  cta: { position: 'absolute', left: space.lg, right: space.lg },
});

