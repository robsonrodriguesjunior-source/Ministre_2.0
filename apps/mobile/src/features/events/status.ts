import type { PillTone } from '@/components/ui';

import type { AssignmentStatus } from './types';

/** Status sempre por extenso (3.5). */
export function statusPill(status: AssignmentStatus): { label: string; tone: PillTone } {
  if (status === 'confirmed') return { label: 'Confirmado', tone: 'ok' };
  if (status === 'declined') return { label: 'Não pode', tone: 'declined' };
  return { label: 'Pendente', tone: 'wait' };
}

/** A minha resposta geral numa escala (várias funções contam como uma). */
export function myStatus(mine: { status: AssignmentStatus }[]): AssignmentStatus | null {
  if (mine.length === 0) return null;
  if (mine.some((a) => a.status === 'declined')) return 'declined';
  if (mine.every((a) => a.status === 'confirmed')) return 'confirmed';
  return 'pending';
}
