// Cifra no formato ChordPro: "[G]Como um rio que [D]desce o monte", "{c: Refrão}".
// Aqui ficam a leitura da cifra, a troca de tom e a conversão de "acordes em cima da letra".

/** Um pedaço da linha: o acorde (se houver) e o texto que vem logo depois dele. */
export type Piece = { chord: string | null; text: string };

/** Palavra inteira (não quebra no meio), com os acordes que caem dentro dela. */
export type Word = Piece[];

export type Line =
  | { kind: 'lyric'; words: Word[]; hasChords: boolean; plain: string }
  | { kind: 'section'; label: string }
  | { kind: 'blank' };

export type Sheet = { title: string | null; key: string | null; artist: string | null; lines: Line[] };

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const INDEX: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};

/** Os 12 tons como aparecem nos botões (o mais comum de cada um). */
export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// Tons que se escrevem com bemol (F, Bb, Eb…; e os menores Dm, Gm, Cm…).
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1, 6]);
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]);

const CHORD_RE = /^([A-G](?:#|b)?)([^/\s]*)(?:\/([A-G](?:#|b)?))?$/;
const SECTION_NAMES: Record<string, string> = {
  soc: 'Refrão', start_of_chorus: 'Refrão',
  sov: 'Verso', start_of_verse: 'Verso',
  sob: 'Ponte', start_of_bridge: 'Ponte',
};

export type Accidental = 'sharp' | 'flat';

function noteIndex(note: string): number | null {
  return INDEX[note] ?? null;
}

/** Sustenido ou bemol para escrever as notas num tom (ex.: F → bemol, E → sustenido). */
export function accidentalFor(key: string): Accidental {
  const m = /^([A-G](?:#|b)?)(m?)/.exec(key);
  if (!m) return 'sharp';
  const i = noteIndex(m[1]);
  if (i === null) return 'sharp';
  if (m[1].endsWith('b')) return 'flat';
  if (m[1].endsWith('#')) return 'sharp';
  return usualAccidental(i, !!m[2]);
}

/** Como o músico costuma escrever o tom: Bb (não A#), F# (não Gb), Eb (não D#)… */
function usualAccidental(index: number, minor: boolean): Accidental {
  return (minor ? FLAT_MINOR : FLAT_MAJOR).has(index) ? 'flat' : 'sharp';
}

function shiftNote(note: string, semitones: number, accidental: Accidental): string {
  const i = noteIndex(note);
  if (i === null) return note;
  const j = (((i + semitones) % 12) + 12) % 12;
  return (accidental === 'flat' ? NOTES_FLAT : NOTES_SHARP)[j];
}

/** É um acorde? (G, F#m7, Bb/D, C9sus4…) */
export function isChord(token: string): boolean {
  const m = CHORD_RE.exec(token);
  if (!m) return false;
  // O resto do acorde só pode ter números, m, maj, sus, dim, aug, add, +, -, º, °, (, ), parênteses e vírgulas.
  return /^(m|maj|min|sus|dim|aug|add|M|[0-9]|\+|-|º|°|\(|\)|,|b|#)*$/.test(m[2]);
}

/** Troca o tom de um acorde. Se não for acorde (ex.: "x2"), devolve como está. */
export function transposeChord(chord: string, semitones: number, accidental: Accidental): string {
  const m = CHORD_RE.exec(chord.trim());
  if (!m || semitones % 12 === 0) return chord;
  const [, root, rest, bass] = m;
  return shiftNote(root, semitones, accidental) + rest + (bass ? `/${shiftNote(bass, semitones, accidental)}` : '');
}

/** Troca o tom de um tom (ex.: "G" + 2 = "A"; "Em" + 1 = "Fm"). */
export function transposeKey(key: string, semitones: number, accidental?: Accidental): string {
  const m = /^([A-G](?:#|b)?)(m?)$/.exec(key);
  const i = m ? noteIndex(m[1]) : null;
  if (!m || i === null) return key;
  const target = (((i + semitones) % 12) + 12) % 12;
  return shiftNote(m[1], semitones, accidental ?? usualAccidental(target, !!m[2])) + m[2];
}

/** Quantos semitons do tom `from` até o tom `to` (0 a 11). */
export function semitonesBetween(from: string, to: string): number {
  const a = noteIndex(/^[A-G](?:#|b)?/.exec(from)?.[0] ?? '');
  const b = noteIndex(/^[A-G](?:#|b)?/.exec(to)?.[0] ?? '');
  if (a === null || b === null) return 0;
  return (((b - a) % 12) + 12) % 12;
}

/** Divide os pedaços em palavras: a quebra de linha só acontece entre palavras. */
function toWords(pieces: Piece[]): Word[] {
  const words: Word[] = [];
  let current: Word = [];
  for (const piece of pieces) {
    const parts = piece.text.split(/(\s+)/);
    let chord = piece.chord;
    parts.forEach((part, i) => {
      if (/^\s+$/.test(part)) {
        if (current.length) words.push(current);
        current = [];
        return;
      }
      if (part === '' && !(i === 0 && chord)) return;
      current.push({ chord, text: part });
      chord = null;
    });
  }
  if (current.length) words.push(current);
  return words;
}

/**
 * Lê a cifra. `semitones` troca o tom; `accidental` escolhe sustenido ou bemol nas notas novas.
 */
export function parseChordPro(source: string, semitones = 0, accidental: Accidental = 'sharp'): Sheet {
  const sheet: Sheet = { title: null, key: null, artist: null, lines: [] };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const directive = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i.exec(line.trim());
    if (directive) {
      const name = directive[1].toLowerCase();
      const value = directive[2] ?? '';
      if (name === 'title' || name === 't') sheet.title = value;
      else if (name === 'key') sheet.key = value;
      else if (name === 'artist' || name === 'subtitle' || name === 'st') sheet.artist = value;
      else if (['c', 'comment', 'ci', 'comment_italic', 'cb', 'comment_box'].includes(name) && value) {
        sheet.lines.push({ kind: 'section', label: value });
      } else if (SECTION_NAMES[name]) {
        sheet.lines.push({ kind: 'section', label: value || SECTION_NAMES[name] });
      }
      continue; // fim de seção e diretivas desconhecidas não aparecem
    }
    if (line.trim() === '') {
      if (sheet.lines.length && sheet.lines[sheet.lines.length - 1].kind !== 'blank') sheet.lines.push({ kind: 'blank' });
      continue;
    }

    const pieces: Piece[] = [];
    const re = /\[([^\]]*)\]/g;
    let last = 0;
    let chord: string | null = null;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line))) {
      if (match.index > last || chord !== null) pieces.push({ chord, text: line.slice(last, match.index) });
      chord = transposeChord(match[1].trim(), semitones, accidental);
      last = match.index + match[0].length;
    }
    pieces.push({ chord, text: line.slice(last) });
    const clean = pieces.filter((p) => p.chord !== null || p.text !== '');

    sheet.lines.push({
      kind: 'lyric',
      words: toWords(clean),
      hasChords: clean.some((p) => p.chord),
      plain: clean.map((p) => p.text).join('').replace(/\s+/g, ' ').trim(),
    });
  }

  while (sheet.lines.length && sheet.lines[sheet.lines.length - 1].kind === 'blank') sheet.lines.pop();
  return sheet;
}

/** A linha tem só acordes? (ex.: "G      D/F#   Em") */
function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => isChord(t) || /^\(?x\d+\)?$/i.test(t) || t === '|');
}

/** "Refrão:", "[Refrão]", "REFRÃO" viram {c: Refrão}. */
function sectionLabel(line: string): string | null {
  const m = /^\s*\[?\s*(intro|introdução|verso|estrofe|parte|pré-refrão|pre-refrão|refrão|refrao|coro|ponte|final|solo|interlúdio)\b([^\]:]*)\]?\s*:?\s*$/i.exec(line);
  if (!m) return null;
  const text = (m[1] + m[2]).trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Converte cifra no formato "acordes em cima da letra" (como nos sites de cifra) para ChordPro.
 * Cada acorde entra na letra de baixo na mesma coluna em que estava.
 */
export function chordsOverLyricsToChordPro(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');
    const section = sectionLabel(line);
    if (section) {
      out.push(`{c: ${section}}`);
      continue;
    }
    if (!isChordLine(line)) {
      out.push(line);
      continue;
    }

    // Acordes e as colunas onde começam.
    const chords: { col: number; chord: string }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) chords.push({ col: m.index, chord: m[0] });

    const next = lines[i + 1]?.replace(/\s+$/, '') ?? '';
    if (!next.trim() || isChordLine(next) || sectionLabel(next)) {
      out.push(chords.map((c) => `[${c.chord}]`).join(' ')); // linha só de acordes (introdução, solo)
      continue;
    }

    let lyric = next.padEnd(Math.max(...chords.map((c) => c.col)), ' ');
    for (const { col, chord } of [...chords].reverse()) {
      // Acorde em cima do espaço antes de uma palavra: vai para o começo da palavra.
      const at = lyric[col] === ' ' && /\S/.test(lyric[col + 1] ?? '') ? col + 1 : col;
      lyric = `${lyric.slice(0, at)}[${chord}]${lyric.slice(at)}`;
    }
    out.push(lyric.replace(/\s+$/, ''));
    i++; // a letra já foi usada
  }

  return out.join('\n');
}

/** Parece cifra "acordes em cima da letra" (e não ChordPro)? */
export function looksLikeChordsOverLyrics(source: string): boolean {
  if (/\[[A-G][^\]]*\]/.test(source)) return false;
  return source.split('\n').some((l) => l.trim() && isChordLine(l));
}
