// Tokens de design do Ministre (docs/ESPECIFICACAO.md, seção 3; medidas de docs/design/telas-direcoes.html).
// Nunca use cor ou tamanho solto num componente: use sempre um token daqui.
// Tema escuro é o único da v1; o tema claro entra depois trocando só `colors`.

import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#0C0C0D',
  card: '#18181A',
  card2: '#222225',
  line: '#26262A',
  lineStrong: '#3A3A3F',
  tabBar: '#111113',
  ink: '#FFFFFF',
  inkSoft: '#C9C9CE',
  inkMuted: '#D4D4D8', // rótulo dos atalhos (QuickAction)
  dim: '#9B9BA1',
  tabInactive: '#77777D',
  orange: '#F7731C',
  orangeSoft: 'rgba(247,115,28,0.14)',
  orangeBorder: 'rgba(247,115,28,0.55)',
  onOrange: '#0C0C0D',
  stageBg: '#050505',
  backdrop: 'rgba(0,0,0,0.62)',
  transparent: 'transparent',
} as const;

// Tons terrosos fixos para avatar sem foto (mesma lista do design).
export const avatarTones = ['#8C6A52', '#5D6A74', '#9A7B60', '#4E4743', '#76606C', '#A0846A', '#6A5A4C'] as const;

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
  mono: 'monospace',
} as const;

// Escala tipográfica (seção 3.2). fontFamily já carrega o peso; não use fontWeight junto.
export const type = {
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -0.5 },
  cardTitle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.2 },
  headerTitle: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.2 },
  greetingName: { fontFamily: fonts.extrabold, fontSize: 17 },
  barTitle: { fontFamily: fonts.bold, fontSize: 16 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15 },
  listName: { fontFamily: fonts.bold, fontSize: 14 },
  eventTitle: { fontFamily: fonts.bold, fontSize: 14.5 },
  body: { fontFamily: fonts.regular, fontSize: 14.5 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13.5 },
  meta: { fontFamily: fonts.regular, fontSize: 12.5 },
  link: { fontFamily: fonts.semibold, fontSize: 13 },
  button: { fontFamily: fonts.bold, fontSize: 14.5 },
  segment: { fontFamily: fonts.bold, fontSize: 13 },
  cardLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase' },
  pill: { fontFamily: fonts.bold, fontSize: 11.5 },
  quickAction: { fontFamily: fonts.semibold, fontSize: 11.5 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 10.5 },
  dayLetter: { fontFamily: fonts.semibold, fontSize: 11 },
  dayNumber: { fontFamily: fonts.bold, fontSize: 16 },
  weekday: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.6 },
  eventDay: { fontFamily: fonts.extrabold, fontSize: 20 },
  dateDay: { fontFamily: fonts.extrabold, fontSize: 24 },
  dateMonth: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6 },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.4 },
  tileTitle: { fontFamily: fonts.bold, fontSize: 15 },
  tileSub: { fontFamily: fonts.regular, fontSize: 12 },
  logo: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1 },
  question: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.6, lineHeight: 30 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase' },
  input: { fontFamily: fonts.medium, fontSize: 15 },
  chip: { fontFamily: fonts.semibold, fontSize: 14 },
  code: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: 6 },
} satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  segmentIndicator: 9,
  button: 12,
  tag: 14,
  eventRow: 16,
  quickAction: 16,
  pill: 20,
  card: 22,
  sheet: 28,
  round: 999,
} as const;

export const size = {
  touch: 44, // área mínima de toque
  button: 44,
  iconButton: 38,
  icon: 20,
  iconTab: 22,
  iconQuick: 22,
  quickAction: 52,
  avatarList: 38,
  avatarHeader: 40,
  avatarNote: 34,
  avatarStack: 26,
  dateBadgeW: 56,
  dateBadgeH: 60,
  eventDateCol: 46,
  tabBar: 72,
  plusButton: 50,
  plusRing: 5,
  plusLift: 26,
  dot: 5,
  notifyDot: 7,
  sheetHandleW: 40,
  sheetHandleH: 5,
  fixedCtaBottom: 88, // CTA fixo acima da barra de abas
  input: 50,
  checkbox: 24,
  maxContentWidth: 480, // no computador, o app fica numa coluna central
} as const;

// Durações das animações (seção 3.4), em ms.
export const motion = {
  confirm: 300,
  segment: 250,
  plus: 350,
  step: 300,
  drag: 200,
  listItem: 700,
  listStagger: 150,
} as const;

export type ColorToken = keyof typeof colors;
