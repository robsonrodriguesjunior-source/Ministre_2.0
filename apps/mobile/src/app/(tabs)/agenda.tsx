import { useQuery } from '@tanstack/react-query';
import { addDays, addWeeks, endOfWeek, startOfWeek } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  EmptyState,
  EventRow,
  Icon,
  Pill,
  Screen,
  SectionHeader,
  Segmented,
  Skeleton,
  Text,
  WeekStrip,
} from '@/components/ui';
import { eventsApi } from '@/features/events/api';
import { myStatus, statusPill } from '@/features/events/status';
import type { EventSummary } from '@/features/events/types';
import { hour, isoDay, monthYear, sameDay, weekDays } from '@/lib/dates';
import { fonts, colors, space } from '@/theme/tokens';

type Filter = 'all' | 'mine';

function Row({ event }: { event: EventSummary }) {
  const date = new Date(event.starts_at);
  const status = myStatus(event.mine);
  const positions = event.mine.map((m) => m.position).join(' + ');
  const mine = status !== null;

  let right = null;
  if (event.status === 'draft') right = <Pill label="Rascunho" tone="wait" />;
  else if (event.status === 'cancelled') right = <Pill label="Cancelado" tone="declined" />;
  else if (status) right = <Pill {...statusPill(status)} />;

  const subtitle = [
    mine ? `${hour(date)} · ${positions}` : 'Você não está escalado',
    event.visibility === 'temporary' ? 'Temporária' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <EventRow
      date={date}
      title={event.title}
      subtitle={subtitle}
      mine={mine && event.status === 'published'}
      dimmed={!mine}
      right={right}
      onPress={() => router.push({ pathname: '/escala/[id]', params: { id: String(event.id) } })}
    />
  );
}

// Agenda (5.3).
export default function Agenda() {
  const params = useLocalSearchParams<{ mine?: string }>();
  const [filter, setFilter] = useState<Filter>(params.mine === '1' ? 'mine' : 'all');
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState(today);
  const week = useMemo(() => weekDays(selected), [selected]);

  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const from = startOfWeek(selected < thisWeekStart ? selected : today, { weekStartsOn: 1 });
  const to = addDays(from, 90);

  const events = useQuery({
    queryKey: ['events', { mine: filter === 'mine', from: isoDay(from) }],
    queryFn: () => eventsApi.list({ from: from.toISOString(), to: to.toISOString(), mine: filter === 'mine' }),
  });

  const list = events.data?.data ?? [];
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const nextWeekEnd = addWeeks(thisWeekEnd, 1);
  const upcoming = list.filter((e) => new Date(e.starts_at) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const sections = [
    { title: 'Esta semana', items: upcoming.filter((e) => new Date(e.starts_at) <= thisWeekEnd) },
    { title: 'Próxima semana', items: upcoming.filter((e) => new Date(e.starts_at) > thisWeekEnd && new Date(e.starts_at) <= nextWeekEnd) },
    { title: 'Mais adiante', items: upcoming.filter((e) => new Date(e.starts_at) > nextWeekEnd) },
  ];
  const selectedDay = list.filter((e) => sameDay(new Date(e.starts_at), selected));

  return (
    <Screen refreshing={events.isRefetching} onRefresh={() => events.refetch()}>
      <Text variant="screenTitle" accessibilityRole="header">
        Agenda
      </Text>

      <View style={styles.month}>
        <Text variant="body" color="inkSoft" style={styles.semibold}>
          {monthYear(selected)}
        </Text>
        <View style={styles.arrows}>
          <Pressable onPress={() => setSelected(addWeeks(selected, -1))} accessibilityRole="button" accessibilityLabel="Semana anterior" hitSlop={10}>
            <Icon name="back" color={colors.dim} />
          </Pressable>
          <Pressable onPress={() => setSelected(addWeeks(selected, 1))} accessibilityRole="button" accessibilityLabel="Próxima semana" hitSlop={10}>
            <Icon name="forward" color={colors.dim} />
          </Pressable>
        </View>
      </View>

      <View style={styles.week}>
        <WeekStrip
          days={week}
          selected={selected}
          onSelect={setSelected}
          hasEvent={(d) => list.some((e) => sameDay(new Date(e.starts_at), d))}
        />
      </View>

      <View style={styles.filter}>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'mine', label: 'Só as minhas' },
          ]}
        />
      </View>

      {events.isLoading ? (
        <View style={styles.list}>
          <Skeleton height={68} rounded={16} />
          <Skeleton height={68} rounded={16} />
          <Skeleton height={68} rounded={16} />
        </View>
      ) : events.isError ? (
        <Card style={styles.gapTop}>
          <EmptyState icon="unavailable" message="Não foi possível carregar a agenda." actionLabel="Tentar de novo" onAction={() => events.refetch()} />
        </Card>
      ) : (
        <>
          {!sameDay(selected, today) && (
            <>
              <SectionHeader title={`Dia ${selected.getDate()}`} />
              <View style={styles.list}>
                {selectedDay.length ? (
                  selectedDay.map((e) => <Row key={e.id} event={e} />)
                ) : (
                  <Text variant="bodySm" color="dim">
                    Nenhum culto neste dia.
                  </Text>
                )}
              </View>
            </>
          )}

          {sections.map((s, i) =>
            s.items.length || i === 0 ? (
              <View key={s.title}>
                <SectionHeader
                  title={s.title}
                  actionLabel={i === 0 ? 'Indisponibilidade' : undefined}
                  onAction={() => router.push('/indisponibilidade')}
                />
                <View style={styles.list}>
                  {s.items.length ? (
                    s.items.map((e) => <Row key={e.id} event={e} />)
                  ) : (
                    <Text variant="bodySm" color="dim">
                      {filter === 'mine' ? 'Você não está escalado esta semana.' : 'Nenhum culto esta semana.'}
                    </Text>
                  )}
                </View>
              </View>
            ) : null,
          )}

          {upcoming.length === 0 && (
            <Card style={styles.gapTop}>
              <EmptyState icon="calendar" message="Nenhum culto marcado por enquanto." />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  semibold: { fontFamily: fonts.semibold },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  arrows: { flexDirection: 'row', gap: 14 },
  week: { marginTop: space.md },
  filter: { marginTop: space.lg },
  list: { gap: space.sm },
  gapTop: { marginTop: space.lg },
});
