import { type Href, router } from 'expo-router';

/**
 * Voltar com segurança: se a tela foi aberta direto pelo endereço (link, atualizar a página),
 * não há tela anterior, então vai para `fallback`.
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
