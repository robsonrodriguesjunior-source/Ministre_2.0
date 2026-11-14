import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { BottomSheet, Button, Card, Chip, EmptyState, Icon, Notice, Segmented, Skeleton, Text, Toast } from '@/components/ui';
import { eventKeys, eventsApi } from '@/features/events/api';
import type { Conflict, Unavailability } from '@/features/events/types';
import { ApiError } from '@/lib/api';
import { isoDay, longDateTime, sameDay } from '@/lib/dates';
import { colors, radius, space } from '@/theme/tokens';

const REASONS = ['Viagem', 'Trabalho', 'Saúde', 'Outro'];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const fmt = (iso: string) => format(parseISO(iso), "EEE, d 'de' MMM", { locale: ptBR });

function describe(u: Unavailability) {
  if (u.recurrence_weekday !== null) return `Toda ${WEEKDAYS[u.recurrence_weekday]}`;
  return u.starts_on === u.ends_on ? fmt(u.starts_on) : `${fmt(u.starts_on)} até ${fmt(u.ends_on)}`;
}

function DayPicker({ value, onChange, min }: { value: Date | null; onChange: (d: Date) => void; min: Date }) {
  const days = useMemo(() => Array.from({ length: 63 }, (_, i) => addDays(min, i)), [min]);
  return (
    <View style={styles.calendar}>
      {days.map((d) => {
        const on = !!value && sameDay(d, value);
        return (
          <Pressable
            key={isoDay(d)}
            onPress={() => onChange(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}
            style={[styles.calDay, on && styles.on]}
          >
            <Text variant="dayLetter" color={on ? 'onOrange' : 'dim'}>
              {format(d, 'EEEEE', { locale: ptBR }).toUpperCase()}
            </Text>
            <Text variant="dayNumber" color={on ? 'onOrange' : 'ink'}>
              {d.getDate()}
            </Text>
            {d.getDate() === 1 && (
              <Text variant="pill" color={on ? 'onOrange' : 'orange'}>
                {format(d, 'MMM', { locale: ptBR })}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// Indisponibilidade (5.6): as minhas datas em que não posso servir.
export default function Indisponibilidade() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: eventKeys.unavailabilities, queryFn: eventsApi.unavailabilities });
  const today = useMemo(() => new Date(), []);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'dia' | 'periodo'>('dia');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [weekly, setWeekly] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setOpen(false);
    setStart(null);
    setEnd(null);
    setReason(null);
    setWeekly(false);
    setConflicts(null);
    setError(null);
    setMode('dia');
  };
  const payload = () => ({
    starts_on: isoDay(start!),
    ends_on: mode === 'periodo' && end ? isoDay(end) : undefined,
    repeat_weekly: mode === 'dia' ? weekly : false,
    reason: reason ?? undefined,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: eventKeys.unavailabilities });
    qc.invalidateQueries({ queryKey: ['events'] });
    qc.invalidateQueries({ queryKey: ['home'] });
  };

  // Primeiro confere se já estou escalado nessas datas; se sim, pergunta se avisa o líder.
  const submit = async (declineConflicts?: boolean) => {
    if (!start) return setError('Escolha a data.');
    if (mode === 'periodo' && !end) return setError('Escolha até quando.');
    setBusy(true);
    setError(null);
    try {
      if (declineConflicts === undefined) {
        const found = (await eventsApi.conflicts(payload())).data;
        if (found.length) {
          setConflicts(found);
          setBusy(false);
          return;
        }
      }
      const res = await eventsApi.markUnavailable({ ...payload(), decline_conflicts: !!declineConflicts });
      refresh();
      reset();
      setToast(res.declined ? 'Marcado. O líder foi avisado de que você não pode.' : 'Indisponibilidade marcada.');
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  const remove = useMutation({
    mutationFn: (id: number) => eventsApi.removeUnavailability(id),
    onSuccess: () => {
      refresh();
      setToast('Indisponibilidade removida.');
    },
  });

  return (
    <>
      <FormScreen
        title="Indisponibilidade"
        footer={<Button label="Marcar indisponibilidade" onPress={() => setOpen(true)} />}
      >
        <Text variant="bodySm" color="dim">
          Nos dias marcados aqui, o líder não consegue te escalar.
        </Text>
        {list.isLoading ? (
          <View style={styles.gap}>
            <Skeleton height={60} rounded={radius.eventRow} />
            <Skeleton height={60} rounded={radius.eventRow} />
          </View>
        ) : list.data?.data.length ? (
          <View style={styles.gap}>
            {list.data.data.map((u) => (
              <View key={u.id} style={styles.item}>
                <Icon name="unavailable" color={colors.orange} />
                <View style={styles.flex}>
                  <Text variant="eventTitle">{describe(u)}</Text>
                  {!!u.reason && (
                    <Text variant="meta" color="dim">
                      {u.reason}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => remove.mutate(u.id)} accessibilityRole="button" accessibilityLabel={`Remover ${describe(u)}`} hitSlop={10}>
                  <Text variant="link" color="orange">
                    Remover
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Card>
            <EmptyState icon="calendar" message="Você não marcou nenhuma data." />
          </Card>
        )}
      </FormScreen>
      <Toast message={toast} onHide={() => setToast(null)} bottom={110} />

      <BottomSheet visible={open && !conflicts} onClose={reset} title="Não posso ir">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setEnd(null);
          }}
          options={[
            { value: 'dia', label: 'Um dia' },
            { value: 'periodo', label: 'Período' },
          ]}
        />
        <Text variant="fieldLabel" color="dim" style={styles.label}>
          {mode === 'dia' ? 'Dia' : start && !end ? 'Até quando?' : 'De quando?'}
        </Text>
        <DayPicker
          value={mode === 'periodo' && start && !end ? null : (end ?? start)}
          min={mode === 'periodo' && start && !end ? start : today}
          onChange={(d) => (mode === 'periodo' && start && !end ? setEnd(d) : (setStart(d), setEnd(null)))}
        />
        {!!start && (
          <Text variant="bodySm" color="inkSoft" style={styles.label}>
            {mode === 'periodo' ? `${format(start, "d 'de' MMM", { locale: ptBR })}${end ? ` até ${format(end, "d 'de' MMM", { locale: ptBR })}` : ' até…'}` : format(start, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </Text>
        )}
        {mode === 'dia' && (
          <View style={styles.switchRow}>
            <Text variant="body">{start ? `Repetir toda ${WEEKDAYS[start.getDay()]}` : 'Repetir toda semana'}</Text>
            <Switch value={weekly} onValueChange={setWeekly} trackColor={{ true: colors.orange, false: colors.lineStrong }} thumbColor={colors.ink} accessibilityLabel="Repetir toda semana" />
          </View>
        )}
        <View style={styles.chips}>
          {REASONS.map((r) => (
            <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(reason === r ? null : r)} />
          ))}
        </View>
        {!!error && <Notice tone="error" message={error} />}
        <View style={styles.actions}>
          <Button label="Salvar" onPress={() => submit()} loading={busy} />
        </View>
      </BottomSheet>

      <BottomSheet visible={!!conflicts} onClose={() => setConflicts(null)} title="Você já está escalado">
        {conflicts?.map((c) => (
          <Text key={c.event_id} variant="bodySm" color="inkSoft" style={styles.conflict}>
            Você está escalado no <Text variant="bodySm">{c.title}</Text> ({longDateTime(new Date(c.starts_at))}) como {c.position}.
          </Text>
        ))}
        <Text variant="body" style={styles.label}>
          Quer avisar o líder que não pode?
        </Text>
        <View style={styles.actions}>
          <Button label="Sim, avisar o líder" onPress={() => submit(true)} loading={busy} />
          <Button label="Só marcar, sem avisar" variant="secondary" onPress={() => submit(false)} />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.eventRow,
    padding: space.md,
  },
  label: { marginTop: space.lg, marginBottom: space.sm },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calDay: { width: '13.4%', alignItems: 'center', paddingVertical: 6, borderRadius: radius.tag },
  on: { backgroundColor: colors.orange },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  actions: { gap: space.sm, marginTop: space.lg },
  conflict: { marginBottom: space.sm },
});
