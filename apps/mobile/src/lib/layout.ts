import { Platform, useWindowDimensions } from 'react-native';

import { size } from '@/theme/tokens';

/**
 * Computador (manual Light, seção 05): a partir de 1024 px de largura, na versão web,
 * o app usa menu lateral + cabeçalho em vez da barra de abas. Abaixo disso, fica o layout de celular.
 */
export function useDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= size.desktopMin;
}

/** Duas colunas no Início só a partir de 1200 px (manual). */
export function useWideDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= size.desktopTwoColumns;
}
