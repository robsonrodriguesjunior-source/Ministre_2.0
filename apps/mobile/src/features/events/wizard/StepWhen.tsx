import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { BottomSheet, Text, TextField } from '@/components/ui';
import { isoDay, sameDay } from '@/lib/dates';
import { colors, radius, space, type } from '@/theme/tokens';

import type { EventType } from '../types';

export type WhenState = {
  date: Date | null;
  time: string; // "19:00"
  typeId: number | null;
  title: string;
  location: string;
  isRehearsal: boolean;
  /** Observações do líder para a equipe (aparecem na aba Equipe). */
  notes: string;
};

const WEEK_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

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

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[styles.option, selected && styles.optionOn]}
    >
      <Text variant="body" style={styles.semibold}>
        {label}
      </Text>
      {selected && <View style={styles.radio} />}
    </Pressable>
  );
}

// Passo 1: "Quando vai ser?" — escolher em vez de digitar.
export function StepWhen({ value, onChange, types }: { value: WhenState; onChange: (v: WhenState) => void; types: EventType[] }) {
  const [otherDate, setOtherDate] = useState(false);
  const [otherTime, setOtherTime] = useState(false);
  const today = useMemo(() => new Date(), []);

  // Próximas ocorrências dos dias de culto (ou os próximos dias, se não houver tipos com dia).
  const days = useMemo(() => {
    const weekdays = new Set(types.map((t) => t.weekday).filter((w): w is number => w !== null));
    const list: Date[] = [];
    for (let i = 0; i < 21 && list.length < 4; i++) {
      const d = addDays(today, i);
      if (weekdays.size === 0 || weekdays.has(d.getDay())) list.push(d);
    }
    if (value.date && !list.some((d) => sameDay(d, value.date!))) list.unshift(value.date);
    return list.slice(0, 4);
  }, [types, today, value.date]);

  const times = useMemo(() => {
    const set = new Set<string>(['09:00', '19:00']);
    types.forEach((t) => t.default_time && set.add(t.default_time));
    if (value.time) set.add(value.time);
    return [...set].sort().slice(0, 3);
  }, [types, value.time]);

  const pickType = (t: EventType) =>
    onChange({
      ...value,
      typeId: t.id,
      title: t.name,
      time: t.default_time ?? value.time,
      location: t.default_location ?? value.location,
      isRehearsal: t.is_rehearsal,
    });

  const calendar = useMemo(() => Array.from({ length: 63 }, (_, i) => addDays(today, i)), [today]);

  return (
    <View style={styles.wrap}>
      <Text variant="question">Quando vai ser?</Text>

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Data
      </Text>
      <View style={styles.chips}>
        {days.map((d) => (
          <DayChip key={isoDay(d)} day={d} selected={!!value.date && sameDay(d, value.date)} onPress={() => onChange({ ...value, date: d })} />
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
      <View style={styles.chips}>
        {times.map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              setOtherTime(false);
              onChange({ ...value, time: t });
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: value.time === t && !otherTime }}
            style={[styles.hour, value.time === t && !otherTime && styles.on]}
          >
            <Text variant="eventTitle" color={value.time === t && !otherTime ? 'onOrange' : 'ink'}>
              {t.replace(':', 'h')}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setOtherTime(true)} accessibilityRole="button" style={[styles.hour, otherTime && styles.on]}>
          <Text variant="eventTitle" color={otherTime ? 'onOrange' : 'ink'}>
            Outro
          </Text>
        </Pressable>
      </View>
      {otherTime && (
        <View style={styles.gap}>
          <TextField
            label="Horário (HH:MM)"
            value={value.time}
            onChangeText={(t) => {
              const digits = t.replace(/\D/g, '').slice(0, 4);
              onChange({ ...value, time: digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits });
            }}
            keyboardType="number-pad"
            placeholder="20:30"
            maxLength={5}
          />
        </View>
      )}

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Tipo de culto
      </Text>
      {types.map((t) => (
        <Option key={t.id} label={t.name} selected={value.typeId === t.id} onPress={() => pickType(t)} />
      ))}

      <View style={styles.fields}>
        <TextField label="Nome do culto" value={value.title} onChangeText={(t) => onChange({ ...value, title: t })} placeholder="Ex.: Culto da Família" />
        <TextField label="Local" value={value.location} onChangeText={(t) => onChange({ ...value, location: t })} placeholder="Ex.: Templo" />
        <View style={styles.switchRow}>
          <Text variant="body">É ensaio?</Text>
          <Switch
            value={value.isRehearsal}
            onValueChange={(v) => onChange({ ...value, isRehearsal: v })}
            trackColor={{ true: colors.orange, false: colors.lineStrong }}
            thumbColor={colors.ink}
            accessibilityLabel="É ensaio?"
          />
        </View>
        <View style={styles.notesField}>
          <Text variant="fieldLabel" color="dim">
            Observações para a equipe
          </Text>
          <TextInput
            value={value.notes}
            onChangeText={(t) => onChange({ ...value, notes: t })}
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
      </View>

      <BottomSheet visible={otherDate} onClose={() => setOtherDate(false)} title="Escolha a data">
        <View style={styles.calendar}>
          {calendar.map((d) => (
            <Pressable
              key={isoDay(d)}
              onPress={() => {
                onChange({ ...value, date: d });
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
  notesField: { gap: space.sm },
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
  wrap: { paddingBottom: space.xxl },
  semibold: { fontFamily: 'Figtree_600SemiBold' },
  label: { marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', gap: space.sm },
  day: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingVertical: space.md, alignItems: 'center' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionOn: { borderColor: colors.orange },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 5, borderColor: colors.orange },
  fields: { marginTop: space.lg, gap: space.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calDay: { width: '13.4%', alignItems: 'center', paddingVertical: 6, borderRadius: radius.tag },
});
