import { router } from 'expo-router';

import { EventRow, Pill } from '@/components/ui';
import { hour } from '@/lib/dates';

import { myStatus, statusPill } from './status';
import type { EventSummary } from './types';

// Linha de culto usada na Agenda e em "Próximos compromissos" do Início.
export function AgendaRow({ event }: { event: EventSummary }) {
  const date = new Date(event.starts_at);
  const status = myStatus(event.mine);
  const positions = event.mine.map((m) => m.position).join(' + ');
  const mine = status !== null;

  let right = null;
  if (event.status === 'draft') right = <Pill label="Rascunho" tone="wait" />;
  else if (event.status === 'cancelled') right = <Pill label="Cancelado" tone="declined" />;
  else if (status) right = <Pill {...statusPill(status)} />;

  const subtitle = [
    mine ? `${hour(date)} · ${positions}` : 'Você não está escalado',
    event.visibility === 'temporary' ? 'Temporária' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <EventRow
      date={date}
      title={event.title}
      subtitle={subtitle}
      mine={mine && event.status === 'published'}
      dimmed={!mine}
      right={right}
      onPress={() => router.push({ pathname: '/escala/[id]', params: { id: String(event.id) } })}
    />
  );
}
