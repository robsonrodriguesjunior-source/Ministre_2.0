import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { StageSet } from './types';

// Guarda no aparelho o repertório das escalas abertas no Modo Palco, para funcionar sem internet.
// Web: armazenamento do navegador. App: um arquivo por escala na pasta do app.
// Se o aparelho não deixar guardar, o Modo Palco continua funcionando com internet.

const PREFIX = 'ministre-palco-';
const INDEX = `${PREFIX}index`;
const MAX_SETS = 12; // as escalas mais recentes; as antigas saem

type IndexEntry = { key: string; title: string; starts_at: string | null; count: number; saved_at: string };

async function read(name: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(name) ?? null;
    const file = new File(Paths.document, `${name}.json`);
    return file.exists ? await file.text() : null;
  } catch {
    return null;
  }
}

async function write(name: string, value: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (value === null) globalThis.localStorage?.removeItem(name);
      else globalThis.localStorage?.setItem(name, value);
      return;
    }
    const file = new File(Paths.document, `${name}.json`);
    if (value === null) {
      if (file.exists) file.delete();
    } else {
      await file.write(value);
    }
  } catch {
    // sem espaço ou bloqueado: segue sem guardar
  }
}

function parse<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Nome do repertório guardado: por escala ou por música avulsa. */
export const stageKey = (p: { eventId?: number | null; songId?: number | null }) =>
  p.eventId ? `event-${p.eventId}` : `song-${p.songId}`;

export async function saveStageSet(key: string, set: StageSet): Promise<void> {
  await write(PREFIX + key, JSON.stringify(set));
  const index = (parse<IndexEntry[]>(await read(INDEX)) ?? []).filter((e) => e.key !== key);
  index.unshift({ key, title: set.title, starts_at: set.starts_at, count: set.songs.length, saved_at: set.saved_at });
  for (const old of index.splice(MAX_SETS)) await write(PREFIX + old.key, null);
  await write(INDEX, JSON.stringify(index));
}

export async function loadStageSet(key: string): Promise<StageSet | null> {
  return parse<StageSet>(await read(PREFIX + key));
}

/** Escalas guardadas, para abrir o Modo Palco quando estiver sem internet. */
export async function savedStageSets(): Promise<IndexEntry[]> {
  return (parse<IndexEntry[]>(await read(INDEX)) ?? []).filter((e) => e.key.startsWith('event-'));
}

// ---- Preferências do Modo Palco por música (velocidade da rolagem) ----

const SPEED = `${PREFIX}speed`;

export async function loadSpeeds(): Promise<Record<string, number>> {
  return parse<Record<string, number>>(await read(SPEED)) ?? {};
}

export async function saveSpeed(songId: number, factor: number): Promise<void> {
  const all = await loadSpeeds();
  all[String(songId)] = factor;
  await write(SPEED, JSON.stringify(all));
}
