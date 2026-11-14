import { useState } from 'react';

import { type Accidental, accidentalFor, semitonesBetween, transposeKey } from './chordpro';

/**
 * Tom em que a cifra aparece. Começa no tom pedido (ex.: o tom da escala) e o músico pode subir ou descer.
 * Sustenido ou bemol segue o costume do tom, até a pessoa escolher um dos dois.
 */
export function useTranspose(originalKey: string, startKey?: string | null) {
  const [semitones, setSemitones] = useState(() => (startKey ? semitonesBetween(originalKey, startKey) : 0));
  const [chosen, setChosen] = useState<Accidental | null>(null);

  const usual = transposeKey(originalKey, semitones);
  const accidental = chosen ?? (startKey && semitones === semitonesBetween(originalKey, startKey) ? accidentalFor(startKey) : accidentalFor(usual));
  const keyLabel = transposeKey(originalKey, semitones, accidental);

  return {
    semitones: ((semitones % 12) + 12) % 12,
    keyLabel,
    accidental,
    setAccidental: setChosen,
    transpose: (step: 1 | -1) => setSemitones((s) => s + step),
  };
}
