import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Card,
  EmptyState,
  Icon,
  type IconName,
  IconButton,
  QuickAction,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '@/components/ui';
import { eventKeys, eventsApi } from '@/features/events/api';
import { NextEventCard } from '@/features/events/NextEventCard';
import { ago, greeting, hour, weekdayName } from '@/lib/dates';
import { setAppBadge } from '@/lib/push';
import { useSession } from '@/stores/session';
import { fonts, colors, radius, space } from '@/theme/tokens';

function WeekItem({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} style={styles.weekItem}>
      <View style={styles.weekIcon}>
        <Icon name={icon} size={19} />
      </View>
      <View style={styles.flex}>
        <Text variant="body" style={styles.semibold}>
          {title}
        </Text>
        <Text variant="bodySm" color="dim">
          {subtitle}
        </Text>
      </View>
      <Icon name="forward" color={colors.tabInactive} />
    </Pressable>
  );
}

// Início (5.2): o próximo culto vem primeiro.
export default function Inicio() {
  const user = useSession((s) => s.user);
  const firstName = user?.name.split(' ')[0] ?? '';
  const home = useQuery({ queryKey: eventKeys.home, queryFn: eventsApi.home });
  const data = home.data;
  const unread = data?.unread_notifications;

  // Número de notificações novas no ícone do app (Tela de Início).
  useEffect(() => {
    if (unread !== undefined) setAppBadge(unread);
  }, [unread]);

  return (
    <Screen refreshing={home.isRefetching} onRefresh={() => home.refetch()}>
      <View style={styles.hello}>
        <Avatar name={user?.name ?? '?'} photoUrl={user?.avatar_url} seed={user?.id} size={40} />
        <View style={styles.flex}>
          <Text variant="meta" color="dim">
            {greeting()},
          </Text>
          <Text variant="greetingName">{firstName}</Text>
        </View>
        <IconButton
          icon="bell"
          label="Notificações"
          badge={(data?.unread_notifications ?? 0) > 0}
          onPress={() => router.push('/notificacoes')}
        />
      </View>

      {home.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={260} rounded={radius.card} />
          <Skeleton height={76} />
        </View>
      ) : home.isError ? (
        <Card style={styles.gapTop}>
          <EmptyState icon="unavailable" message="Não foi possível carregar. Confira a internet." actionLabel="Tentar de novo" onAction={() => home.refetch()} />
        </Card>
      ) : data?.next_event ? (
        <NextEventCard event={data.next_event} />
      ) : (
        <Card style={styles.gapTop}>
          <EmptyState icon="calendar" message="Você não está em nenhuma escala por enquanto." actionLabel="Ver agenda" onAction={() => router.navigate('/agenda')} />
        </Card>
      )}

      <View style={styles.quick}>
        <QuickAction icon="calendar" label="Escalas" onPress={() => router.navigate('/agenda')} />
        <QuickAction icon="music" label="Músicas" onPress={() => router.navigate('/musicas')} />
        <QuickAction icon="megaphone" label="Avisos" onPress={() => router.push('/avisos')} />
        <QuickAction icon="unavailable" label="Indisponível" onPress={() => router.push('/indisponibilidade')} />
      </View>

      {!!data && (data.rehearsal || data.songs || data.announcement) && (
        <>
          <SectionHeader title="Esta semana" />
          <View>
            {data.rehearsal && (
              <WeekItem
                icon="calendar"
                title={`Ensaio · ${data.rehearsal.title}`}
                subtitle={`${weekdayName(new Date(data.rehearsal.starts_at))}, ${hour(new Date(data.rehearsal.starts_at))}${data.rehearsal.location ? ` · ${data.rehearsal.location}` : ''}`}
                onPress={() => router.push({ pathname: '/escala/[id]', params: { id: String(data.rehearsal!.id) } })}
              />
            )}
            {data.songs && data.songs.count > 0 && (
              <WeekItem
                icon="music"
                title={`${data.songs.count} ${data.songs.count === 1 ? 'música' : 'músicas'} no repertório`}
                subtitle={data.songs.new > 0 ? `${data.songs.new} ${data.songs.new === 1 ? 'nova' : 'novas'} para você ouvir` : 'Do próximo culto'}
                onPress={() => router.push({ pathname: '/escala/[id]', params: { id: String(data.songs!.event_id), tab: 'repertorio' } })}
              />
            )}
            {data.announcement && (
              <WeekItem icon="megaphone" title="Aviso do líder" subtitle={data.announcement.body} onPress={() => router.push('/avisos')} />
            )}
          </View>
        </>
      )}

      {data?.announcement && (
        <>
          <SectionHeader title="Último aviso" actionLabel="Ver todos" onAction={() => router.push('/avisos')} />
          <View style={styles.note}>
            <Avatar name={data.announcement.author?.name ?? 'Líder'} seed={data.announcement.author?.id} size={34} />
            <View style={styles.flex}>
              <Text variant="bodySm" style={styles.bold}>
                {data.announcement.author?.name ?? 'Líder'}
              </Text>
              <Text variant="meta" color="inkSoft" numberOfLines={2}>
                {data.announcement.body}
              </Text>
            </View>
            <Text variant="pill" color="dim">
              {ago(new Date(data.announcement.created_at))}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  bold: { fontFamily: fonts.bold },
  hello: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loading: { gap: space.md, marginTop: space.lg },
  gapTop: { marginTop: space.lg },
  quick: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  weekItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  weekIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.tag,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.eventRow,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
});
