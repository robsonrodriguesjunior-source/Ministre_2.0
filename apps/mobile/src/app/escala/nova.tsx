import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomSheet, Button, EmptyState, Glow, IconButton, Notice, Skeleton, Text } from '@/components/ui';
import { eventsApi } from '@/features/events/api';
import { manageApi, manageKeys } from '@/features/manage/api';
import { ProgressBar } from '@/features/events/wizard/ProgressBar';
import { StepSongs, type SongPick } from '@/features/events/wizard/StepSongs';
import { StepWhen, type WhenState } from '@/features/events/wizard/StepWhen';
import { StepWho, type TeamPick } from '@/features/events/wizard/StepWho';
import { ApiError } from '@/lib/api';
import { isoDay } from '@/lib/dates';
import { useActiveMembership } from '@/stores/session';
import { useReduceMotion } from '@/theme/motion';
import { colors, motion, size, space } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

const EMPTY_WHEN: WhenState = {
  date: null,
  time: '19:00',
  title: '',
  location: '',
  visibility: 'official',
  hasRehearsal: false,
  rehearsalDate: null,
  rehearsalTime: '16:00',
  notes: '',
};

/** Junta o dia com "HH:MM" (horário do aparelho). Null se faltar ou estiver errado. */
function at(day: Date | null, time: string): Date | null {
  if (!day || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  if (h > 23 || m > 59) return null;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Nova escala (5.5): três perguntas, uma de cada vez. Também serve para editar (?id=).
export default function NovaEscala() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const editId = rawId ? Number(rawId) : null;
  const membership = useActiveMembership();
  const qc = useQueryClient();
  const reduce = useReduceMotion();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [when, setWhen] = useState<WhenState>({ ...EMPTY_WHEN, location: membership?.ministry.default_location ?? '' });
  const [team, setTeam] = useState<TeamPick[]>([]);
  const [songs, setSongs] = useState<SongPick[]>([]);
  const [dirty, setDirty] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedEdit, setLoadedEdit] = useState(false);

  // Dias de culto do ministério (Gestão › Ministério) para sugerir as datas.
  const ministry = useQuery({ queryKey: manageKeys.ministry, queryFn: manageApi.ministry, enabled: membership?.role === 'leader' });
  const songList = useQuery({ queryKey: ['songs-options'], queryFn: eventsApi.songs, enabled: step === 3 });
  const existing = useQuery({ queryKey: ['event', editId], queryFn: () => eventsApi.get(editId!), enabled: !!editId });
  const date = when.date;
  const availability = useQuery({
    queryKey: ['availability', date ? isoDay(date) : null, editId],
    queryFn: () => eventsApi.availability(isoDay(date!), editId ?? undefined),
    enabled: step >= 2 && !!date,
  });

  // Editar: preenche o assistente com a escala existente (uma vez).
  const ev = existing.data?.data;
  if (ev && !loadedEdit) {
    const d = new Date(ev.starts_at);
    const r = ev.rehearsal_at ? new Date(ev.rehearsal_at) : null;
    setWhen({
      date: d,
      time: hhmm(d),
      title: ev.title,
      location: ev.location ?? '',
      visibility: ev.visibility,
      hasRehearsal: !!r,
      rehearsalDate: r,
      rehearsalTime: r ? hhmm(r) : '16:00',
      notes: ev.notes ?? '',
    });
    setTeam(ev.team.map((t) => ({ member_id: t.member_id, position_id: t.position_id, name: t.name, user_id: t.user_id, avatar_url: t.avatar_url })));
    setSongs(ev.songs.map((s) => ({ song_id: s.song_id, title: s.title, key: s.key })));
    setLoadedEdit(true);
  }

  // Ao trocar a data, quem não pode na data nova sai da equipe (não é mostrado nem salvo).
  const blockedIds = new Set(availability.data?.positions.flatMap((p) => p.members.filter((m) => m.unavailable).map((m) => m.member_id)) ?? []);
  const activeTeam = team.filter((t) => !blockedIds.has(t.member_id));

  if (membership && membership.role !== 'leader') {
    return (
      <SafeAreaView style={styles.safe}>
        <Glow calm />
        <EmptyState icon="calendar" message="Só líderes do ministério montam escalas." actionLabel="Voltar" onAction={() => goBack('/agenda')} />
      </SafeAreaView>
    );
  }

  const start = at(when.date, when.time);
  const rehearsal = when.hasRehearsal ? at(when.rehearsalDate, when.rehearsalTime) : null;
  const firstStepError = !when.date
    ? 'Escolha a data.'
    : !start
      ? 'Confira o horário (ex.: 19:00).'
      : !when.title.trim()
        ? 'Dê um nome ao culto.'
        : when.hasRehearsal && !when.rehearsalDate
          ? 'Escolha o dia do ensaio (ou desligue o ensaio).'
          : when.hasRehearsal && !rehearsal
            ? 'Confira a hora do ensaio (ex.: 16:00).'
            : null;
  const stepError = step === 1 ? firstStepError : null;

  const go = (next: number) => {
    setError(null);
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const save = async (publish: boolean) => {
    if (!start || firstStepError) {
      go(1);
      return;
    }
    setSaving(publish ? 'publish' : 'draft');
    setError(null);
    try {
      const body = {
        title: when.title.trim(),
        starts_at: start.toISOString(),
        rehearsal_at: rehearsal ? rehearsal.toISOString() : null,
        visibility: when.visibility,
        location: when.location.trim() || null,
        notes: when.notes.trim() || null,
      };
      const saved = editId ? (await eventsApi.update(editId, body)).data : (await eventsApi.create(body)).data;
      await eventsApi.setTeam(saved.id, activeTeam.map((t) => ({ member_id: t.member_id, position_id: t.position_id })));
      await eventsApi.setSongs(saved.id, songs.map((s) => ({ song_id: s.song_id, key: s.key })));
      if (publish && saved.status === 'draft') await eventsApi.publish(saved.id);

      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['event', saved.id] });
      router.replace({ pathname: '/escala/[id]', params: { id: String(saved.id) } });
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(null);
    }
  };

  const close = () => (dirty ? setConfirmClose(true) : goBack('/agenda'));
  const entering = reduce ? undefined : (direction === 1 ? SlideInRight : SlideInLeft).duration(motion.step);
  const change = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <Glow calm />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.bar}>
          <IconButton icon="close" label="Fechar" onPress={close} />
          <Text variant="barTitle">{editId ? 'Editar escala' : 'Nova escala'}</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.progress}>
          <ProgressBar step={step} total={3} />
        </View>

        {(editId && !loadedEdit) || ministry.isLoading ? (
          <View style={styles.loading}>
            <Skeleton height={40} />
            <Skeleton height={70} />
            <Skeleton height={50} />
          </View>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View key={step} entering={entering}>
              {step === 1 && <StepWhen value={when} onChange={change(setWhen)} worshipDays={ministry.data?.data.worship_days ?? []} />}
              {step === 2 && date && (
                <StepWho date={date} availability={availability.data} loading={availability.isLoading} team={activeTeam} onChange={change(setTeam)} />
              )}
              {step === 3 && <StepSongs songs={songList.data?.data} loading={songList.isLoading} picked={songs} onChange={change(setSongs)} />}
            </Animated.View>
          </ScrollView>
        )}

        <View style={styles.footer}>
          {!!error && <Notice tone="error" message={error} />}
          {step < 3 ? (
            <Button
              label="Continuar"
              disabled={!!stepError}
              accessibilityHint={stepError ?? undefined}
              onPress={() => go(step + 1)}
            />
          ) : (
            <Button label={ev?.status === 'published' ? 'Salvar alterações' : 'Publicar escala'} onPress={() => save(true)} loading={saving === 'publish'} />
          )}
          <View style={styles.row}>
            {step > 1 && <Button label="Voltar" variant="secondary" onPress={() => go(step - 1)} style={styles.flex} />}
            {(!ev || ev.status === 'draft') && (
              <Button label="Salvar rascunho" variant="secondary" onPress={() => save(false)} loading={saving === 'draft'} disabled={!start || !when.title.trim()} style={styles.flex} />
            )}
          </View>
          {!!stepError && (
            <Text variant="meta" color="dim" style={styles.hint}>
              {stepError}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={confirmClose} onClose={() => setConfirmClose(false)} title="Descartar esta escala?">
        <Text variant="bodySm" color="inkSoft">
          O que você preencheu será perdido.
        </Text>
        <View style={styles.sheetActions}>
          <Button label="Descartar" onPress={() => { setConfirmClose(false); goBack('/agenda'); }} />
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
  progress: { paddingHorizontal: space.lg, marginTop: space.lg },
  loading: { padding: space.lg, gap: space.md },
  content: { paddingHorizontal: space.lg, paddingTop: 26 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.lg, gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
  hint: { textAlign: 'center' },
  sheetActions: { gap: space.sm, marginTop: space.lg },
});
