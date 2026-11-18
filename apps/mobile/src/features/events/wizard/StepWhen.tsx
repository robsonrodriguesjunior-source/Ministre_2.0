import { addMonths, format, isValid, startOfDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Icon, Text, TextField } from '@/components/ui';
import { isoDay, monthYear, sameDay } from '@/lib/dates';
import { useDesktop } from '@/lib/layout';
import { fonts, colors, radius, space, type } from '@/theme/tokens';

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

const WEEK_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** "26/10/2026" -> Date (ou null se incompleta/inválida). */
function parseDay(text: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isValid(d) && d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
}
const fmtDay = (d: Date | null) => (d ? format(d, 'dd/MM/yyyy') : '');
/** Máscara enquanto digita: 26102026 -> 26/10/2026. */
function maskDay(t: string) {
  const v = t.replace(/\D/g, '').slice(0, 8);
  return [v.slice(0, 2), v.slice(2, 4), v.slice(4)].filter(Boolean).join('/');
}
/** Máscara enquanto digita: 1930 -> 19:30. */
function maskTime(t: string) {
  const v = t.replace(/\D/g, '').slice(0, 4);
  return v.length > 2 ? `${v.slice(0, 2)}:${v.slice(2)}` : v;
}

/**
 * Calendário do mês inteiro, compacto, com ‹ › para passar de mês. Dias fora do intervalo
 * (antes de `min` ou depois de `max`) ficam apagados. Os dias de culto do ministério ganham um ponto.
 */
function MonthCalendar({
  value,
  onPick,
  min,
  max,
  marks = [],
  label,
}: {
  value: Date | null;
  onPick: (d: Date) => void;
  min: Date;
  max?: Date | null;
  marks?: number[];
  label: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(value ?? min));
  // Ao escolher/digitar uma data de outro mês, o calendário vai até ela (ajuste durante a renderização, sem efeito).
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value && !sameDay(startOfMonth(value), month)) setMonth(startOfMonth(value));
  }

  const cells = useMemo(() => {
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list: (Date | null)[] = Array.from({ length: month.getDay() }, () => null);
    for (let d = 1; d <= total; d++) list.push(new Date(month.getFullYear(), month.getMonth(), d));
    return list;
  }, [month]);

  const canPrev = month > startOfMonth(min);
  const canNext = !max || month < startOfMonth(max);
  const worship = new Set(marks);

  return (
    <View style={styles.cal} accessibilityLabel={label}>
      <View style={styles.calHead}>
        <Pressable
          onPress={() => canPrev && setMonth((m) => addMonths(m, -1))}
          disabled={!canPrev}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          style={[styles.arrow, !canPrev && styles.off]}
        >
          <Icon name="back" size={18} color={colors.ink} />
        </Pressable>
        <Text variant="sectionTitle">{monthYear(month)}</Text>
        <Pressable
          onPress={() => canNext && setMonth((m) => addMonths(m, 1))}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          style={[styles.arrow, !canNext && styles.off]}
        >
          <Icon name="forward" size={18} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEK_LETTER.map((l, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <Text variant="dayLetter" color="tabInactive">
              {l}
            </Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const out = d < min || (!!max && d > max);
          const on = !!value && sameDay(d, value);
          return (
            <Pressable
              key={isoDay(d)}
              disabled={out}
              onPress={() => onPick(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: out }}
              accessibilityLabel={format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              style={styles.cell}
            >
              <View style={[styles.dot, sameDay(d, min) && !on && styles.today, on && styles.on]}>
                <Text variant="bodySm" color={on ? 'onOrange' : 'ink'} style={out ? styles.out : undefined}>
                  {d.getDate()}
                </Text>
                {worship.has(d.getDay()) && !out && <View style={[styles.mark, on && styles.markOn]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Calendário + campos para digitar a data e a hora. */
function DateTimePicker({
  label,
  date,
  time,
  onDate,
  onTime,
  min,
  max,
  marks,
  timePlaceholder,
}: {
  label: string;
  date: Date | null;
  time: string;
  onDate: (d: Date | null) => void;
  onTime: (t: string) => void;
  min: Date;
  max?: Date | null;
  marks?: number[];
  timePlaceholder: string;
}) {
  const side = useDesktop();
  const [text, setText] = useState(fmtDay(date));
  // Escolheu no calendário: o campo mostra a data escolhida (ajuste durante a renderização, sem efeito).
  const [seen, setSeen] = useState(date);
  if (date !== seen) {
    setSeen(date);
    const current = parseDay(text);
    if (date && !(current && sameDay(current, date))) setText(fmtDay(date));
  }

  const typed = parseDay(text);
  const dateError =
    text.length === 10 && !typed
      ? 'Data inválida.'
      : typed && typed < min
        ? 'Essa data já passou.'
        : typed && max && typed > max
          ? 'O ensaio precisa ser até o dia do culto.'
          : undefined;

  return (
    // Tela larga (computador/tablet): data e hora ao lado do calendário. Celular: embaixo dele.
    <View style={[styles.picker, side && styles.pickerSide]}>
      <View style={side ? styles.calSide : undefined}>
        <MonthCalendar value={date} onPick={onDate} min={min} max={max} marks={marks} label={label} />
      </View>
      <View style={[styles.inputs, side && styles.inputsSide]}>
        <View style={styles.flex}>
          <TextField
            label={`${label}: data`}
            value={text}
            onChangeText={(t) => {
              const v = maskDay(t);
              setText(v);
              const d = parseDay(v);
              if (d && d >= min && (!max || d <= max)) onDate(d);
              else if (v.length < 10 && date) onDate(null);
            }}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            error={dateError}
          />
        </View>
        <View style={styles.time}>
          <TextField
            label="Hora"
            value={time}
            onChangeText={(t) => onTime(maskTime(t))}
            keyboardType="number-pad"
            placeholder={timePlaceholder}
            maxLength={5}
          />
        </View>
      </View>
    </View>
  );
}

function Choice({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
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

type Props = { value: WhenState; onChange: (v: WhenState) => void; worshipDays: number[] };

// Passo 1: "Quando vai ser?" — data e hora (calendário do mês ou digitando), Oficial ou Temporária, ensaio e observações.
export function StepWhen({ value, onChange, worshipDays }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const set = <K extends keyof WhenState>(key: K, v: WhenState[K]) => onChange({ ...value, [key]: v });

  return (
    <View style={styles.wrap}>
      <Text variant="question">Quando vai ser?</Text>

      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Data e hora do culto
      </Text>
      <DateTimePicker
        label="Culto"
        date={value.date}
        time={value.time}
        onDate={(d) => onChange({ ...value, date: d, rehearsalDate: value.rehearsalDate && d && value.rehearsalDate > d ? null : value.rehearsalDate })}
        onTime={(t) => set('time', t)}
        min={today}
        marks={worshipDays}
        timePlaceholder="19:00"
      />
      {worshipDays.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text variant="meta" color="dim">
            Dias de culto do ministério
          </Text>
        </View>
      )}

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
          onValueChange={(v) => onChange({ ...value, hasRehearsal: v })}
          trackColor={{ true: colors.orange, false: colors.lineStrong }}
          thumbColor={colors.onOrange}
          accessibilityLabel="Tem ensaio"
        />
      </View>
      {value.hasRehearsal && (
        <View style={styles.rehearsal}>
          <DateTimePicker
            label="Ensaio"
            date={value.rehearsalDate}
            time={value.rehearsalTime}
            onDate={(d) => set('rehearsalDate', d)}
            onTime={(t) => set('rehearsalTime', t)}
            min={today}
            max={value.date}
            timePlaceholder="16:00"
          />
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.xxl },
  flex: { flex: 1 },
  semibold: { fontFamily: fonts.semibold },
  label: { marginTop: 22, marginBottom: 10 },
  on: { backgroundColor: colors.orange, borderColor: colors.orange },
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
  rehearsal: { marginTop: space.md },
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
  // Calendário do mês + campos.
  picker: { gap: space.md, maxWidth: 420 },
  pickerSide: { flexDirection: 'row', alignItems: 'flex-start', maxWidth: '100%' },
  calSide: { width: 420, flexShrink: 0 },
  inputs: { flexDirection: 'row', gap: space.sm },
  inputsSide: { flex: 1, minWidth: 0 },
  time: { width: 110 },
  cal: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.eventRow, padding: space.sm, backgroundColor: colors.card },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.25 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center' } as object,
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  today: { borderColor: colors.orange },
  out: { opacity: 0.3 },
  mark: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.orange },
  markOn: { backgroundColor: colors.onOrange },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.sm },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
});
