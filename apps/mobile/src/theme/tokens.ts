// Tokens de design do Ministre: visual "Light" do manual da marca (MINISTRE_Light_Especificacao_Claude.docx, seção 04).
// Nunca use cor ou tamanho solto num componente: use sempre um token daqui.
// O modo escuro ficou fora desta etapa (decisão do manual).

import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#FAFAF9', // fundo principal
  card: '#FFFFFF', // superfície
  card2: '#F5F2E9', // marfim: fundos de ícone, campos, segmentado
  line: '#E1DDD5', // borda
  lineStrong: '#CBC5B9',
  tabBar: '#FFFFFF',
  ink: '#0B1F3B', // marca / texto forte (azul-marinho)
  inkSoft: '#2A3B52',
  inkMuted: '#2A3B52', // rótulo dos atalhos (QuickAction)
  dim: '#526174', // texto secundário
  tabInactive: '#5B6878',
  // "orange" = ação: laranja escuro com texto branco (contraste AA). O laranja da marca fica em `brand`.
  orange: '#B83B10',
  orangeSoft: '#FCEDE5', // destaque suave
  orangeBorder: 'rgba(184,59,16,0.35)',
  onOrange: '#FFFFFF',
  brand: '#E5571F', // laranja da bandeira (só decoração: nunca texto pequeno)
  ivory: '#F5F2E9',
  success: '#166534',
  successBg: '#EAF6EC',
  danger: '#B42318',
  dangerBg: '#FDECEA',
  stageBg: '#FAFAF9',
  backdrop: 'rgba(11,31,59,0.45)',
  transparent: 'transparent',
} as const;

// Tons fixos para avatar sem foto (texto branco por cima; todos com contraste AA).
export const avatarTones = ['#8C5A3C', '#3F5670', '#7A5C45', '#4E4743', '#6B4F5E', '#5C6B4A', '#6A5A4C'] as const;

// Inter (manual: pesos 400/500/600/700). "extrabold" ficou como 700 para não exagerar no negrito.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_700Bold',
  // Cifras: monoespaçada do sistema (Menlo no iOS, monospace no Android e na web).
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
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
  // Músicas e cifra (5.7) e Modo Palco (5.8).
  songTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  songName: { fontFamily: fonts.semibold, fontSize: 15 },
  songHeader: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.6 },
  lyric: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  chord: { fontFamily: fonts.mono, fontWeight: '700', fontSize: 15, lineHeight: 20 },
  section: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  stageTitle: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: -0.8 },
  stageLyric: { fontFamily: fonts.semibold, fontSize: 23, lineHeight: 29 },
  editor: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 21 },
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
  eventRow: 12,
  quickAction: 12,
  pill: 20,
  key: 10, // selo do tom
  card: 16, // manual: 12–16 em cards
  sheet: 20,
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
  maxWideWidth: 1040, // Gestão do líder no computador
  stagePlay: 72, // play/pause do Modo Palco
  stageSide: 52, // ‹ › do Modo Palco
  stageFade: 60, // degradê no alto e embaixo da letra
  progress: 3, // barra de progresso fina
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
