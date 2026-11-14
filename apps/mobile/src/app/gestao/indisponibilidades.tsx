import { useQuery } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Avatar, EmptyState, IconButton, Skeleton, Text } from '@/components/ui';
import { manageApi, manageKeys, type TeamUnavailability, WEEKDAYS } from '@/features/manage/api';
import { monthYear, shortDate } from '@/lib/dates';
import { colors, space } from '@/theme/tokens';

/** "Dom, 22 nov" · "10 a 20 dez" · "Toda quarta, até 31 dez" */
function when(u: TeamUnavailability) {
  const start = parseISO(u.starts_on);
  const end = parseISO(u.ends_on);
  const short = (d: Date) => format(d, 'd MMM', { locale: ptBR }).replace('.', '');
  if (u.recurrence_weekday !== null) return `Toda ${WEEKDAYS[u.recurrence_weekday].toLowerCase()}, até ${short(end)}`;
  if (u.starts_on === u.ends_on) return shortDate(start);
  return `${short(start)} a ${short(end)}`;
}

// Gestão › Indisponibilidades (5.10): quem avisou que não pode, mês a mês, agrupado por pessoa.
export default function IndisponibilidadesEquipe() {
  const [month, setMonth] = useState(() => new Date());
  const key = format(month, 'yyyy-MM');
  const query = useQuery({ queryKey: manageKeys.unavailability(key), queryFn: () => manageApi.teamUnavailability(key) });
  const items = query.data?.data ?? [];

  const people = Object.values(
    items.reduce<Record<number, TeamUnavailability[]>>((acc, u) => {
      (acc[u.member_id] ??= []).push(u);
      return acc;
    }, {}),
  ).sort((a, b) => a[0].name.localeCompare(b[0].name, 'pt-BR'));

  return (
    <FormScreen title="Indisponibilidades">
      <View style={styles.month}>
        <IconButton icon="back" label="Mês anterior" onPress={() => setMonth((m) => addMonths(m, -1))} />
        <Text variant="sectionTitle" accessibilityLiveRegion="polite">
          {monthYear(month)}
        </Text>
        <IconButton icon="forward" label="Próximo mês" onPress={() => setMonth((m) => addMonths(m, 1))} />
      </View>

      {query.isLoading ? (
        <Skeleton height={120} />
      ) : people.length === 0 ? (
        <EmptyState icon="calendar" message="Ninguém marcou indisponibilidade neste mês." />
      ) : (
        <View>
          {people.map((list, i) => (
            <View key={list[0].member_id} style={[styles.person, i < people.length - 1 && styles.divider]}>
              <Avatar name={list[0].name} photoUrl={list[0].avatar_url} seed={list[0].user_id} />
              <View style={styles.flex}>
                <Text variant="listName">{list[0].name}</Text>
                {list.map((u) => (
                  <Text key={u.id} variant="meta" color="dim">
                    {when(u)}
                    {u.reason ? ` · ${u.reason}` : ''}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
});
