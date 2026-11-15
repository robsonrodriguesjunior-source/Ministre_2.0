import { addDays, format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { BottomSheet, Text, TextField } from '@/components/ui';
import { isoDay, sameDay } from '@/lib/dates';
import { colors, radius, space, type } from '@/theme/tokens';

import type { Visibility } from '../types';

export type WhenState = {
  date: Date | null;
  time: string; // "19:00"
  title: string;
  location: string;
  /** Oficial: todos veem. Temporária: só quem está escalado. */
  visibility: Visibility;
  /** Ensaio dentro da própria escala (não é uma escala à parte). */
  hasRehearsal: boolean;
  rehearsalDate: Date | null;
  rehearsalTime: string;
  /** Observações do líder para a equipe (aparecem na aba Equipe). */
  notes: string;
};

const WEEK_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const SERVICE_TIMES = ['09:00', '18:00', '19:00', '19:30'];
const REHEARSAL_TIMES = ['09:00', '16:00', '19:30'];

function DayChip({ day, selected, onPress }: { day: Date; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
      style={[styles.day, selected && styles.on]}
    >
      <Text variant="meta" color={selected ? 'onOrange' : 'dim'}>
        {WEEK_SHORT[day.getDay()]}
      </Text>
      <Text variant="sheetTitle" color={selected ? 'onOrange' : 'ink'}>
        {day.getDate()}
      </Text>
    </Pressable>
  );
}

function Choice({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${hint}`}
      style={[styles.option, selected && styles.optionOn]}
    >
      <View style={styles.flex}>
        <Text variant="body" style={styles.semibold}>
          {label}
        </Text>
        <Text variant="meta" color="dim">
          {hint}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]} />
    </Pressable>
  );
}

/** Horários em chips + "Outro" (digitado). */
function TimePicker({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (t: string) => void }) {
  const [other, setOther] = useState(!!value && !options.includes(value));
  const list = useMemo(() => [...new Set(options)].sort(), [options]);
  return (
    <>
      <View style={styles.chips}>
        {list.map((t) => {
          const on = value === t && !other;
          return (
            <Pressable
              key={t}
              onPress={() => {
                setOther(false);
                onChange(t);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${t.replace(':', 'h')}`}
              accessibilityState={{ selected: on }}
              style={[styles.hour, on && styles.on]}
            >
              <Text variant="eventTitle" color={on ? 'onOrange' : 'ink'}>
                {t.replace(':', 'h')}
              </Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setOther(true)} accessibilityRole="button" accessibilityLabel={`${label}: outro horário`} style={[styles.hour, other && styles.on]}>
          <Text variant="eventTitle" color={other ? 'onOrange' : 'ink'}>
            Outro
          </Text>
        </Pressable>
      </View>
      {other && (
        <View style={styles.gap}>
          <TextField
            label={`${label} (HH:MM)`}
            value={value}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, 4);
              onChange(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
            }}
            keyboardType="number-pad"
            placeholder="20:30"
            maxLength={5}
          />
        </View>
      )}
    </>
  );
}

type Props = { value: WhenState; onChange: (v: WhenState) => void; worshipDays: number[] };

// Passo 1: "Quando vai ser?" — data, horário, Oficial ou Temporária, ensaio e observações.
export function StepWhen({ value, onChange, worshipDays }: Props) {
  const [otherDate, setOtherDate] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const set = <K extends keyof WhenState>(key: K, v: WhenState[K]) => onChange({ ...value, [key]: v });

  // Próximas ocorrências dos dias de culto do ministério (ou os próximos dias, se não houver).
  const days = useMemo(() => {
    const weekdays = new Set(worshipDays);
    const list: Date[] = [];
    for (let i = 0; i < 21 && list.length < 4; i++) {
      const d = addDays(today, i);
      if (weekdays.size === 0 || weekdays.has(d.getDay())) list.push(d);
    }
    if (value.date && !list.some((d) => sameDay(d, value.date!))) list.unshift(value.date);
    return list.slice(0, 4);
  }, [worshipDays, today, value.date]);

  // Dias possíveis para o ensaio: a semana antes do culto (até o próprio dia), a partir de hoje.
  const rehearsalDays = useMemo(() => {
    if (!value.date) return [];
    const list: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(subDays(value.date, i));
      if (d >= today) list.push(d);
    }
    return list;
  }, [value.date, today]);

  const calendar = useMemo(() => Array.from({ length: 63 }, (_, i) => addDays(today, i)), [today]);

  return (
    <View style={styles.wrap}>
      <Text variant="question">Quando vai ser?</Text>

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Data
      </Text>
      <View style={styles.chips}>
        {days.map((d) => (
          <DayChip key={isoDay(d)} day={d} selected={!!value.date && sameDay(d, value.date)} onPress={() => set('date', d)} />
        ))}
      </View>
      <Pressable onPress={() => setOtherDate(true)} accessibilityRole="button" style={styles.link}>
        <Text variant="link" color="orange">
          Outra data
        </Text>
      </Pressable>

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Horário
      </Text>
      <TimePicker label="Horário" options={SERVICE_TIMES} value={value.time} onChange={(t) => set('time', t)} />

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Quem vê esta escala
      </Text>
      <Choice
        label="Escala Oficial"
        hint="Toda a equipe vê, mesmo quem não está escalado."
        selected={value.visibility === 'official'}
        onPress={() => set('visibility', 'official')}
      />
      <Choice
        label="Escala Temporária"
        hint="Só quem está escalado vê."
        selected={value.visibility === 'temporary'}
        onPress={() => set('visibility', 'temporary')}
      />

      <View style={styles.fields}>
        <TextField label="Nome do culto" value={value.title} onChangeText={(t) => set('title', t)} placeholder="Ex.: Culto da Família" />
        <TextField label="Local" value={value.location} onChangeText={(t) => set('location', t)} placeholder="Ex.: Templo" />
      </View>

      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text variant="body" style={styles.semibold}>
            Ensaio
          </Text>
          <Text variant="meta" color="dim">
            Dia e hora do ensaio para esta escala.
          </Text>
        </View>
        <Switch
          value={value.hasRehearsal}
          onValueChange={(v) => onChange({ ...value, hasRehearsal: v, rehearsalTime: value.rehearsalTime || '16:00' })}
          trackColor={{ true: colors.orange, false: colors.lineStrong }}
          thumbColor={colors.ink}
          accessibilityLabel="Tem ensaio"
        />
      </View>
      {value.hasRehearsal &&
        (!value.date ? (
          <Text variant="meta" color="orange">
            Escolha primeiro a data do culto.
          </Text>
        ) : (
          <View style={styles.rehearsal}>
            <Text variant="fieldLabel" color="tabInactive">
              Dia do ensaio
            </Text>
            <View style={styles.wrapChips}>
              {rehearsalDays.map((d) => (
                <View key={isoDay(d)} style={styles.rehearsalDay}>
                  <DayChip day={d} selected={!!value.rehearsalDate && sameDay(d, value.rehearsalDate)} onPress={() => set('rehearsalDate', d)} />
                </View>
              ))}
            </View>
            <Text variant="fieldLabel" color="tabInactive">
              Hora do ensaio
            </Text>
            <TimePicker label="Hora do ensaio" options={REHEARSAL_TIMES} value={value.rehearsalTime} onChange={(t) => set('rehearsalTime', t)} />
          </View>
        ))}

      <View style={styles.notesField}>
        <Text variant="fieldLabel" color="dim">
          Observações para a equipe
        </Text>
        <TextInput
          value={value.notes}
          onChangeText={(t) => set('notes', t)}
          multiline
          maxLength={2000}
          accessibilityLabel="Observações para a equipe"
          placeholder="Opcional. Ex.: chegar 30 minutos antes para passar o som."
          placeholderTextColor={colors.tabInactive}
          selectionColor={colors.orange}
          textAlignVertical="top"
          style={styles.notes}
        />
      </View>

      <BottomSheet visible={otherDate} onClose={() => setOtherDate(false)} title="Escolha a data">
        <View style={styles.calendar}>
          {calendar.map((d) => (
            <Pressable
              key={isoDay(d)}
              onPress={() => {
                set('date', d);
                setOtherDate(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}
              style={[styles.calDay, !!value.date && sameDay(d, value.date) && styles.on]}
            >
              <Text variant="dayLetter" color={value.date && sameDay(d, value.date) ? 'onOrange' : 'dim'}>
                {WEEK_SHORT[d.getDay()].slice(0, 1)}
              </Text>
              <Text variant="dayNumber" color={value.date && sameDay(d, value.date) ? 'onOrange' : 'ink'}>
                {d.getDate()}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.xxl },
  flex: { flex: 1 },
  semibold: { fontFamily: 'Figtree_600SemiBold' },
  label: { marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', gap: space.sm },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  day: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingVertical: space.md, alignItems: 'center' },
  rehearsalDay: { width: '22%' },
  on: { backgroundColor: colors.orange, borderColor: colors.orange },
  hour: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.eventRow, paddingVertical: space.md, alignItems: 'center' },
  link: { alignSelf: 'flex-start', paddingVertical: space.sm },
  gap: { marginTop: space.md },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.eventRow,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  optionOn: { borderColor: colors.orange },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.lineStrong },
  radioOn: { borderWidth: 5, borderColor: colors.orange },
  fields: { marginTop: space.lg, gap: space.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, marginTop: space.xl },
  rehearsal: { gap: space.md, marginTop: space.md },
  notesField: { gap: space.sm, marginTop: space.xl },
  notes: {
    ...type.input,
    minHeight: 90,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.button,
    padding: space.lg,
    outlineStyle: 'none',
  } as object,
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calDay: { width: '13.4%', alignItems: 'center', paddingVertical: 6, borderRadius: radius.tag },
});
