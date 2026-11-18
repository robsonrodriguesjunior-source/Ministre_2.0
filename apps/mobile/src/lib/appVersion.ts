import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Versão do app e atualização automática na web.
// Na web, cada publicação gera arquivos com um código novo no nome (__common-<código>.js, entry-<código>.js).
// Comparando o código da página aberta com o do servidor, dá para saber se saiu versão nova.

const MAIN_FILES = /\/_expo\/static\/js\/web\/(?:__common|entry)-([0-9a-f]+)\.js/g;

/** "11bfb4c-0b70d08": códigos dos arquivos principais (vazio fora da web). */
function fingerprint(html: string) {
  return [...html.matchAll(MAIN_FILES)].map((m) => m[1].slice(0, 7)).sort().join('-');
}

function currentFingerprint() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return '';
  return fingerprint([...document.querySelectorAll('script[src]')].map((s) => `"${s.getAttribute('src')}"`).join(' '));
}

/** "1.0.0 · 11bfb4c" na web; "1.0.0" no app instalado. */
export function appVersion() {
  const v = Constants.expoConfig?.version ?? '1.0.0';
  const web = currentFingerprint().split('-')[0];
  return web ? `${v} · ${web}` : v;
}

/**
 * Web: quando a pessoa volta para a aba (depois de pelo menos 30 s fora), confere no servidor se saiu
 * versão nova e, se saiu, recarrega sozinho. Não recarrega com a aba aberta e em uso (não perde o que
 * estava sendo digitado). Devolve a função que para de vigiar.
 */
export function watchForNewVersion(): () => void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => undefined;
  const mine = currentFingerprint();
  if (!mine) return () => undefined;
  let hiddenAt = 0;
  const onVisibility = async () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    if (!hiddenAt || Date.now() - hiddenAt < 30_000) return;
    try {
      const html = await (await fetch('/', { cache: 'no-store' })).text();
      const latest = fingerprint(html);
      if (latest && latest !== mine) location.reload();
    } catch {
      // Sem internet: segue com a versão guardada.
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}
