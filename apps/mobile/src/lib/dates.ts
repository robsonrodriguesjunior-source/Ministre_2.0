import { addDays, differenceInCalendarDays, format, formatDistanceToNowStrict, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Datas sempre em português e no horário do aparelho (o servidor guarda em UTC).

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "19h00" */
export const hour = (d: Date) => format(d, "HH'h'mm");

/** "Domingo, 26 de outubro · 19h00" */
export const longDateTime = (d: Date) => `${cap(format(d, "EEEE, d 'de' MMMM", { locale: ptBR }))} · ${hour(d)}`;

/** "Domingo" */
export const weekdayName = (d: Date) => cap(format(d, 'EEEE', { locale: ptBR }));

/** "Outubro 2026" */
export const monthYear = (d: Date) => cap(format(d, 'MMMM yyyy', { locale: ptBR }));

/** "Dom, 26 out" */
export const shortDate = (d: Date) => cap(format(d, 'EEE, d MMM', { locale: ptBR }).replace('.', ''));

/** "12 out" */
export const dayMonth = (d: Date) => format(d, 'd MMM', { locale: ptBR }).replace('.', '');

/** "hoje", "amanhã", "em 6 dias", "há 2 dias" */
export function relativeDays(d: Date, now = new Date()) {
  const days = differenceInCalendarDays(d, now);
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days > 1) return `em ${days} dias`;
  return days === -1 ? 'ontem' : `há ${-days} dias`;
}

/** "Bom dia", "Boa tarde", "Boa noite" pela hora local. */
export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "2 h", "5 min", "3 dias" */
export function ago(d: Date) {
  if (Date.now() - d.getTime() < 60_000) return 'agora';
  const text = formatDistanceToNowStrict(d, { locale: ptBR });
  return text.replace(' horas', ' h').replace(' hora', ' h').replace(' minutos', ' min').replace(' minuto', ' min');
}

/** Segunda a domingo da semana de `d`. */
export function weekDays(d: Date) {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "2026-10-26" (data local, sem fuso) */
export const isoDay = (d: Date) => format(d, 'yyyy-MM-dd');

export const sameDay = (a: Date, b: Date) => isoDay(a) === isoDay(b);
