import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { BottomSheet, Button, Checkbox, Chip, EmptyState, IconButton, Notice, Pill, Skeleton, Text, TextField, Toast } from '@/components/ui';
import { type ManagedEventType, manageApi, manageKeys, WEEKDAYS, WEEKDAYS_SHORT } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { useActiveMembership } from '@/stores/session';
import { colors, space } from '@/theme/tokens';

type Draft = Omit<ManagedEventType, 'id'>;

const describe = (t: ManagedEventType) =>
  [t.weekday !== null ? WEEKDAYS[t.weekday] : 'Sem dia fixo', t.default_time?.replace(':', 'h'), t.default_location].filter(Boolean).join(' · ');

// Gestão › Tipos de culto (5.10): alimentam os chips de data e horário do passo 1 da escala.
export default function Tipos() {
  const qc = useQueryClient();
  const place = useActiveMembership()?.ministry.default_location ?? '';
  const query = useQuery({ queryKey: manageKeys.eventTypes, queryFn: manageApi.eventTypes });
  const types = query.data?.data ?? [];

  const [editing, setEditing] = useState<ManagedEventType | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', weekday: 0, default_time: '19:00', default_location: place, is_rehearsal: false });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const open = (t: ManagedEventType | 'new') => {
    setEditing(t);
    setDraft(t === 'new' ? { name: '', weekday: 0, default_time: '19:00', default_location: place, is_rehearsal: false } : { ...t });
    setErrors({});
    setError(null);
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const run = async (kind: 'save' | 'remove') => {
    if (!editing) return;
    setBusy(kind);
    setErrors({});
    setError(null);
    try {
      if (kind === 'remove' && editing !== 'new') {
        setToast((await manageApi.removeEventType(editing.id)).message);
      } else {
        const body = { ...draft, name: draft.name.trim(), default_time: draft.default_time || null, default_location: draft.default_location?.trim() || null };
        if (editing === 'new') await manageApi.createEventType(body);
        else await manageApi.updateEventType(editing.id, body);
        setToast('Tipo de culto salvo.');
      }
      setEditing(null);
      qc.invalidateQueries({ queryKey: manageKeys.eventTypes });
      qc.invalidateQueries({ queryKey: manageKeys.ministry });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors({ name: e.field('name'), default_time: e.field('default_time'), default_location: e.field('default_location') });
      } else {
        setError(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <FormScreen title="Tipos de culto" action={<IconButton icon="plus" label="Novo tipo de culto" onPress={() => open('new')} />}>
        {query.isLoading ? (
          <Skeleton height={180} />
        ) : types.length === 0 ? (
          <EmptyState icon="calendar" message="Nenhum tipo de culto ainda." actionLabel="Criar tipo de culto" onAction={() => open('new')} />
        ) : (
          <View>
            {types.map((t, i) => (
              <Pressable key={t.id} onPress={() => open(t)} accessibilityRole="button" style={[styles.row, i < types.length - 1 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="listName">{t.name}</Text>
                  <Text variant="meta" color="dim">
                    {describe(t)}
                  </Text>
                </View>
                {t.is_rehearsal && <Pill label="Ensaio" />}
              </Pressable>
            ))}
          </View>
        )}
      </FormScreen>

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo tipo de culto' : 'Editar tipo de culto'}>
        <View style={styles.sheet}>
          <TextField label="Nome" value={draft.name} onChangeText={(v) => set('name', v)} placeholder="Ex.: Culto da Família" maxLength={60} error={errors.name} />
          <Text variant="fieldLabel" color="dim">
            Dia da semana
          </Text>
          <View style={styles.chips}>
            {WEEKDAYS_SHORT.map((d, i) => (
              <Chip key={d} label={d} selected={draft.weekday === i} onPress={() => set('weekday', i)} />
            ))}
            <Chip label="Sem dia fixo" selected={draft.weekday === null} onPress={() => set('weekday', null)} />
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <TextField label="Horário" value={draft.default_time ?? ''} onChangeText={(v) => set('default_time', v)} placeholder="19:00" maxLength={5} keyboardType="numbers-and-punctuation" error={errors.default_time} />
            </View>
            <View style={styles.flex}>
              <TextField label="Local" value={draft.default_location ?? ''} onChangeText={(v) => set('default_location', v)} placeholder="Templo" maxLength={120} error={errors.default_location} />
            </View>
          </View>
          <Checkbox checked={draft.is_rehearsal} onChange={(v) => set('is_rehearsal', v)} accessibilityLabel="É ensaio" label={<Text variant="body">É ensaio</Text>} />
          {!!error && <Notice tone="error" message={error} />}
          <Button label="Salvar" onPress={() => run('save')} loading={busy === 'save'} disabled={!draft.name.trim()} />
          {editing !== 'new' && <Button label="Remover tipo de culto" variant="secondary" onPress={() => run('remove')} loading={busy === 'remove'} />}
        </View>
      </BottomSheet>
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  sheet: { gap: space.md, marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pair: { flexDirection: 'row', gap: space.md },
});
