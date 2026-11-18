type Props = {
  /** Mantido por compatibilidade (o visual sóbrio não tem brilho). */
  calm?: boolean;
};

// Visual "Escuro sóbrio" (18/11/2026): fundo liso, sem brilho colorido. A peça continua existindo
// para as telas que já a usam, mas não desenha nada.
export function Glow(_props: Props) {
  return null;
}
