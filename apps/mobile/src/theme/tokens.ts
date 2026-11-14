// Tokens de design do Ministre (docs/ESPECIFICACAO.md, seção 3).
// Nunca use cor ou tamanho solto num componente: use sempre um token daqui.
// Etapa 0: só as cores. Tipografia, espaçamentos e raios entram na Etapa 1.

export const colors = {
  bg: '#0C0C0D',
  card: '#18181A',
  card2: '#222225',
  line: '#26262A',
  lineStrong: '#3A3A3F',
  tabBar: '#111113',
  ink: '#FFFFFF',
  inkSoft: '#C9C9CE',
  dim: '#9B9BA1',
  tabInactive: '#77777D',
  orange: '#F7731C',
  orangeSoft: 'rgba(247,115,28,0.14)',
  orangeBorder: 'rgba(247,115,28,0.55)',
  onOrange: '#0C0C0D',
  stageBg: '#050505',
} as const;

export type ColorToken = keyof typeof colors;
