import { router } from 'expo-router';

import type { QuickActionId } from './ActionSheet';

// Ações do botão + (barra de abas no celular, menu lateral no computador).
export function handleQuickAction(id: QuickActionId) {
  if (id === 'new-event') router.push('/escala/nova');
  else if (id === 'unavailable') router.push('/indisponibilidade');
  else if (id === 'my-events') router.navigate({ pathname: '/agenda', params: { mine: '1' } });
  else if (id === 'new-announcement') router.push('/aviso/novo');
  else router.push('/musica/editar');
}
