import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eventsApi } from './api';

/** Confirmar ou "Não posso" — depois recarrega Início, Agenda e a escala. */
export function useRespond() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['home'] });
    qc.invalidateQueries({ queryKey: ['events'] });
    qc.invalidateQueries({ queryKey: ['event'] });
  };

  const confirm = useMutation({ mutationFn: (assignmentId: number) => eventsApi.confirm(assignmentId), onSuccess: refresh });
  const decline = useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: number; reason?: string }) => eventsApi.decline(assignmentId, reason),
    onSuccess: refresh,
  });

  return { confirm, decline };
}
