import { useQuery } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Avatar, Card, EmptyState, Icon, IconButton, Segmented, Skeleton, Text } from '@/components/ui';
import { manageApi, manageKeys, type OverviewDepartment, type OverviewPerson } from '@/features/manage/api';
import { hour, monthYear, shortDate } from '@/lib/dates';
import { goBack } from '@/lib/nav';
import { useActiveMembership } from '@/stores/session';
import { colors, radius, space } from '@/theme/tokens';

type Tab = 'cultos' | 'pessoas';

const STATUS_LABEL = { confirmed: 'Confirmou', pending: 'Falta responder', declined: 'Não pode' } as const;

/** "6 de 6 confirmados" em verde; se falta alguém, neutro. */
function Count({ confirmed, total }: { confirmed: number; total: number }) {
  if (total === 0) {
    return (
      <View style={[styles.count, styles.countWait]}>
        <Text variant="pill" color="dim">
          Ninguém escalado
        </Text>
      </View>
    );
  }
  const all = confirmed === total;
  return (
    <View style={[styles.count, all ? styles.countOk : styles.countWait]}>
      {all && <Icon name="check" size={12} strokeWidth={3} color={colors.success} />}
      <Text variant="pill" color={all ? 'success' : 'dim'}>
        {confirmed} de {total}
      </Text>
    </View>
  );
}

function Department({ d }: { d: OverviewDepartment }) {
  const [open, setOpen] = useState(false);
  const info =
    [
      d.minister ? `Ministro: ${d.minister}` : '',
      d.visibility === 'temporary' ? 'Temporária' : '',
      d.pending ? `${d.pending} sem resposta` : '',
      d.declined ? `${d.declined} não pode${d.declined > 1 ? 'm' : ''}` : '',
    ]
      .filter(Boolean)
      .join(' · ') || (d.total ? 'Todos confirmaram' : 'Toque para ver');
  return (
    <View style={styles.dept}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${d.ministry}: ${d.confirmed} de ${d.total} confirmados. ${open ? 'Esconder' : 'Ver'} quem está escalado.`}
        style={styles.deptHead}
      >
        <View style={styles.flex}>
          <Text variant="listName">{d.ministry}</Text>
          <Text variant="meta" color="dim">
            {info}
          </Text>
        </View>
        <Count confirmed={d.confirmed} total={d.total} />
        <Icon name={open ? 'minus' : 'plus'} size={16} color={colors.dim} />
      </Pressable>
      {open &&
        (d.people.length === 0 ? (
          <Text variant="meta" color="dim" style={styles.people}>
            Ninguém escalado ainda.
          </Text>
        ) : (
          <View style={styles.people}>
            {d.people.map((p, i) => (
              <View key={`${p.user_id}-${i}`} style={styles.person}>
                <Avatar name={p.name} photoUrl={p.avatar_url} seed={p.user_id ?? p.name} size={28} />
                <View style={styles.flex}>
                  <Text variant="bodySm">
                    {p.name}
                    {p.is_minister ? ' ★' : ''}
                  </Text>
                  <Text variant="meta" color="dim">
                    {p.position}
                  </Text>
                </View>
                <Text variant="meta" color={p.status === 'confirmed' ? 'success' : p.status === 'declined' ? 'danger' : 'dim'}>
                  {STATUS_LABEL[p.status]}
                </Text>
              </View>
            ))}
          </View>
        ))}
    </View>
  );
}

function PersonRow({ p, max, last }: { p: OverviewPerson; max: number; last: boolean }) {
  const low = p.confirmed_rate !== null && p.confirmed_rate < 60;
  return (
    <View style={[styles.personRow, !last && styles.divider]}>
      <Avatar name={p.name} photoUrl={p.avatar_url} seed={p.user_id} />
      <View style={styles.flex}>
        <Text variant="listName">{p.name}</Text>
        <Text variant="meta" color="dim">
          {p.ministries.join(' · ')}
        </Text>
        {p.scheduled > 0 && (
          <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.fill, { width: `${Math.max(8, (100 * p.scheduled) / max)}%` }, low && styles.fillLow]} />
          </View>
        )}
      </View>
      <View style={styles.right}>
        <Text variant="listName">
          {p.scheduled} {p.scheduled === 1 ? 'escala' : 'escalas'}
        </Text>
        <Text variant="meta" color={low ? 'danger' : 'dim'}>
          {p.confirmed_rate === null ? (p.scheduled ? 'cultos ainda vão acontecer' : 'sem escala') : `confirmou ${p.confirmed_rate}%`}
        </Text>
      </View>
    </View>
  );
}

// Gestão › Visão da igreja: o gestor (pastor ou administrador) vê todos os departamentos, culto a culto, e a frequência de cada pessoa no mês.
export default function VisaoIgreja() {
  const isManager = !!useActiveMembership()?.church.is_manager;
  const wide = useWindowDimensions().width >= 760;
  const [month, setMonth] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>('cultos');
  const key = format(month, 'yyyy-MM');
  const query = useQuery({ queryKey: manageKeys.churchOverview(key), queryFn: () => manageApi.churchOverview(key), enabled: isManager });
  const data = query.data;

  if (!isManager) {
    return (
      <FormScreen title="Visão da igreja">
        <EmptyState icon="list" message="Só os gestores da igreja veem este painel." actionLabel="Voltar" onAction={() => goBack('/gestao')} />
      </FormScreen>
    );
  }

  const serving = data?.people.filter((p) => p.scheduled > 0) ?? [];
  const idle = data?.people.filter((p) => p.scheduled === 0) ?? [];
  const max = Math.max(1, ...serving.map((p) => p.scheduled));

  const kpis = data
    ? [
        { label: 'Cultos no mês', value: String(data.summary.services) },
        { label: 'Pessoas servindo', value: String(data.summary.people_serving) },
        { label: 'Sem escala no mês', value: String(data.summary.people_idle) },
        { label: 'Confirmação média', value: data.summary.confirmed_rate === null ? '—' : `${data.summary.confirmed_rate}%` },
      ]
    : [];

  return (
    <FormScreen title="Visão da igreja" subtitle={data ? `${data.church.name} · ${data.ministries.length} ${data.ministries.length === 1 ? 'departamento' : 'departamentos'}` : undefined}>
      <View style={styles.month}>
        <IconButton icon="back" label="Mês anterior" onPress={() => setMonth((m) => addMonths(m, -1))} />
        <Text variant="sectionTitle" accessibilityLiveRegion="polite">
          {monthYear(month)}
        </Text>
        <IconButton icon="forward" label="Próximo mês" onPress={() => setMonth((m) => addMonths(m, 1))} />
      </View>

      {query.isLoading || !data ? (
        <Skeleton height={220} />
      ) : (
        <>
          <View style={styles.kpis}>
            {kpis.map((k) => (
              <Card key={k.label} style={[styles.kpi, { flexBasis: wide ? '23%' : '46%' }]}>
                <Text variant="cardTitle">{k.value}</Text>
                <Text variant="meta" color="dim">
                  {k.label}
                </Text>
              </Card>
            ))}
          </View>

          <Segmented
            options={[
              { value: 'cultos', label: 'Cultos' },
              { value: 'pessoas', label: 'Pessoas' },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'cultos' ? (
            data.services.length === 0 ? (
              <EmptyState icon="calendar" message="Nenhuma escala publicada neste mês." />
            ) : (
              <View style={styles.list}>
                {data.services.map((s) => {
                  const d = parseISO(s.starts_at);
                  return (
                    <Card key={s.starts_at} style={styles.service}>
                      <View style={styles.serviceHead}>
                        <View style={styles.flex}>
                          <Text variant="cardLabel" color="orangeText">
                            {shortDate(d)} · {hour(d)}
                          </Text>
                          <Text variant="eventTitle">{s.title}</Text>
                        </View>
                        <Count confirmed={s.confirmed} total={s.total} />
                      </View>
                      {s.departments.map((dep) => (
                        <Department key={dep.event_id} d={dep} />
                      ))}
                    </Card>
                  );
                })}
              </View>
            )
          ) : (
            <View style={styles.list}>
              <Text variant="meta" color="dim">
                Escalas publicadas no mês, somando todos os departamentos. A porcentagem de quem confirmou conta só os cultos que já aconteceram.
              </Text>
              {serving.length === 0 ? (
                <EmptyState icon="user" message="Ninguém foi escalado neste mês." />
              ) : (
                <View>
                  {serving.map((p, i) => (
                    <PersonRow key={p.user_id} p={p} max={max} last={i === serving.length - 1} />
                  ))}
                </View>
              )}
              {idle.length > 0 && (
                <>
                  <Text variant="sectionTitle" style={styles.idleTitle}>
                    Sem escala neste mês ({idle.length})
                  </Text>
                  <View>
                    {idle.map((p, i) => (
                      <PersonRow key={p.user_id} p={p} max={max} last={i === idle.length - 1} />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  month: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  kpi: { flexGrow: 1, gap: 2, paddingVertical: space.md },
  list: { gap: space.md },
  service: { gap: space.xs },
  serviceHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.xs },
  dept: { borderTopWidth: 1, borderTopColor: colors.line },
  deptHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  people: { paddingBottom: space.md, gap: space.sm },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  count: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.pill },
  countOk: { backgroundColor: colors.successBg },
  countWait: { backgroundColor: colors.ivory },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  right: { alignItems: 'flex-end', gap: 2 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.ivory, marginTop: space.xs, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.brand },
  fillLow: { backgroundColor: colors.danger },
  idleTitle: { marginTop: space.md },
});
