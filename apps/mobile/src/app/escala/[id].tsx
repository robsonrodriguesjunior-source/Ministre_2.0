import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  DateBadge,
  EmptyState,
  IconButton,
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
import type { EventDetail } from '@/features/events/types';
import { useRespond } from '@/features/events/useRespond';
import { hour, weekdayName } from '@/lib/dates';
import { colors, fonts, size, space } from '@/theme/tokens';

type Tab = 'equipe' | 'repertorio' | 'roteiro';
const TABS: { value: Tab; label: string }[] = [
  { value: 'equipe', label: 'Equipe' },
  { value: 'repertorio', label: 'Repertório' },
  { value: 'roteiro', label: 'Roteiro' },
];

const minutes = (sec: number | null) => (sec ? `${Math.round(sec / 60)} min` : null);

function TeamTab({ event }: { event: EventDetail }) {
  if (event.team.length === 0) return <EmptyState icon="user" message="Ninguém escalado ainda." />;
  return (
    <View>
      {event.team.map((t, i) => {
        const pill = statusPill(t.status);
        return (
          <ListRow
            key={t.assignment_id}
            name={t.is_me ? `${t.name.split(' ')[0]} (você)` : t.name}
            subtitle={t.status === 'declined' && t.decline_reason ? `${t.position} · ${t.decline_reason}` : t.position}
            photoUrl={t.avatar_url}
            seed={t.user_id}
            right={<Pill label={pill.label} tone={pill.tone} />}
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

function SongsTab({ event }: { event: EventDetail }) {
  if (event.songs.length === 0) return <EmptyState icon="music" message="Nenhuma música escolhida ainda." />;
  return (
    <View>
      {event.songs.map((s, i) => (
        <View key={s.id} style={[styles.songRow, i < event.songs.length - 1 && styles.divider]}>
          <Text variant="eventDay" style={styles.songNumber}>
            {i + 1}
          </Text>
          <View style={styles.flex}>
            <Text variant="body" style={styles.songTitle}>
              {s.title}
            </Text>
            <Text variant="meta" color="dim">
              {[minutes(s.duration_sec), s.bpm ? `${s.bpm} bpm` : null].filter(Boolean).join(' · ') || s.artist}
            </Text>
          </View>
          <View style={styles.key} accessibilityLabel={`Tom ${s.key}`}>
            <Text variant="pill" color="orange">
              {s.key}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function RundownTab({ event }: { event: EventDetail }) {
  if (event.rundown.length === 0) return <EmptyState icon="list" message="O roteiro ainda não foi montado." />;
  return (
    <View>
      {event.rundown.map((r, i) => (
        <View key={r.id} style={[styles.songRow, i < event.rundown.length - 1 && styles.divider]}>
          <Text variant="eventTitle" color="dim" style={styles.time}>
            {r.planned_time ?? '—'}
          </Text>
          <View style={styles.flex}>
            <Text variant="body" style={styles.songTitle}>
              {r.title}
            </Text>
            <Text variant="meta" color="dim">
              {[r.duration_min ? `${r.duration_min} min` : null, r.responsible].filter(Boolean).join(' · ') || ' '}
            </Text>
          </View>
        </View>
      ))}
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
  const [tab, setTab] = useState<Tab>(params.tab ?? 'equipe');
  const [pageWidth, setPageWidth] = useState(Math.min(windowWidth, size.maxContentWidth));
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const [menu, setMenu] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const { confirm, decline } = useRespond();

  const query = useQuery({ queryKey: ['event', id], queryFn: () => eventsApi.get(id), enabled: Number.isFinite(id) });
  const event = query.data?.data;

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
        <View style={styles.bar}>
          <IconButton icon="back" label="Voltar" onPress={() => router.back()} />
          <Text variant="barTitle">Escala</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.loading}>
          {query.isError ? (
            <EmptyState icon="calendar" message="Não foi possível abrir esta escala." actionLabel="Voltar" onAction={() => router.back()} />
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
    cta = <Button label="Abrir Modo Palco" onPress={() => setToast('O Modo Palco chega na Etapa 4.')} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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
        </View>
      </View>
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
        {[<TeamTab key="e" event={event} />, <SongsTab key="r" event={event} />, <RundownTab key="t" event={event} />].map((page, i) => (
          <ScrollView
            key={i}
            style={{ width: pageWidth }}
            contentContainerStyle={[styles.page, { paddingBottom: (cta ? 120 : 40) + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {page}
          </ScrollView>
        ))}
      </ScrollView>

      {!!cta && <View style={[styles.cta, { bottom: space.lg + insets.bottom }]}>{cta}</View>}
      <Toast message={toast} onHide={() => setToast(null)} bottom={(cta ? 80 : 24) + insets.bottom} />

      {event.can_manage && <EventMenu event={event} visible={menu} onClose={() => setMenu(false)} onToast={setToast} />}
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
  songTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  time: { width: 48 },
  key: { borderWidth: 1.5, borderColor: colors.orange, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, minWidth: 34, alignItems: 'center' },
  cta: { position: 'absolute', left: space.lg, right: space.lg },
});

