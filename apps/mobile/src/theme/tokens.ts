// Tokens de design do Ministre: visual "Vidro escuro" (aprovado em 17/11/2026, versão compacta).
// Fundo azul-noite com brilho laranja e azul; cartões de vidro (branco translúcido); texto claro.
// Nunca use cor ou tamanho solto num componente: use sempre um token daqui.

import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#070B16', // fundo principal (azul-noite)
  card: 'rgba(255,255,255,0.07)', // vidro: cartões, campos, botões secundários
  card2: 'rgba(255,255,255,0.06)', // vidro mais leve: fundos de ícone, segmentado
  surface: '#111A2C', // superfície opaca: folhas que sobem, aviso flutuante, barra de abas, menu lateral
  line: 'rgba(255,255,255,0.12)', // borda do vidro
  lineStrong: 'rgba(255,255,255,0.24)',
  tabBar: 'rgba(17,26,44,0.94)',
  ink: '#FFFFFF', // texto forte
  inkSoft: '#C9D1E0',
  inkMuted: '#C9D1E0', // rótulo dos atalhos (QuickAction)
  dim: '#93A0B8', // texto secundário
  tabInactive: '#8A96AD',
  // "orange" = ação: laranja da marca com texto branco.
  orange: '#E5571F',
  orangeSoft: 'rgba(229,87,31,0.18)', // destaque suave
  orangeBorder: 'rgba(255,179,142,0.45)',
  orangeText: '#FFB38E', // laranja claro para texto e ícones sobre o vidro
  onOrange: '#FFFFFF',
  brand: '#E5571F', // laranja da bandeira
  ivory: 'rgba(255,255,255,0.08)',
  success: '#4ADE80',
  successBg: 'rgba(74,222,128,0.14)',
  warning: '#FBBF24',
  warningBg: 'rgba(251,191,36,0.14)',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.14)',
  stageBg: '#070B16',
  backdrop: 'rgba(0,0,0,0.6)',
  glowOrange: '#E5571F', // brilho do fundo (alto à esquerda)
  glowBlue: '#2F5BA8', // brilho do fundo (meio à direita)
  transparent: 'transparent',
} as const;

// Tons fixos para avatar sem foto (texto branco por cima; todos com contraste AA).
export const avatarTones = ['#8C5A3C', '#3F5670', '#7A5C45', '#4E4743', '#6B4F5E', '#5C6B4A', '#6A5A4C'] as const;

// Plus Jakarta Sans (modelo Vidro escuro): 400/500/600/700/800.
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  // Cifras: monoespaçada do sistema (Menlo no iOS, monospace no Android e na web).
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

// Escala tipográfica (seção 3.2). fontFamily já carrega o peso; não use fontWeight junto.
export const type = {
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.5 },
  cardTitle: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.2 },
  headerTitle: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.2 },
  greetingName: { fontFamily: fonts.extrabold, fontSize: 16 },
  barTitle: { fontFamily: fonts.bold, fontSize: 15 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14 },
  listName: { fontFamily: fonts.bold, fontSize: 13.5 },
  eventTitle: { fontFamily: fonts.bold, fontSize: 14 },
  body: { fontFamily: fonts.regular, fontSize: 14 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13 },
  meta: { fontFamily: fonts.regular, fontSize: 12 },
  link: { fontFamily: fonts.semibold, fontSize: 13 },
  button: { fontFamily: fonts.bold, fontSize: 14 },
  segment: { fontFamily: fonts.bold, fontSize: 13 },
  cardLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  pill: { fontFamily: fonts.bold, fontSize: 11.5 },
  quickAction: { fontFamily: fonts.semibold, fontSize: 11.5 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 10.5 },
  dayLetter: { fontFamily: fonts.semibold, fontSize: 11 },
  dayNumber: { fontFamily: fonts.bold, fontSize: 16 },
  weekday: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.6 },
  eventDay: { fontFamily: fonts.extrabold, fontSize: 18 },
  dateDay: { fontFamily: fonts.extrabold, fontSize: 21 },
  dateMonth: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6 },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.4 },
  tileTitle: { fontFamily: fonts.bold, fontSize: 14 },
  tileSub: { fontFamily: fonts.regular, fontSize: 12 },
  logo: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1 },
  question: { fontFamily: fonts.extrabold, fontSize: 23, letterSpacing: -0.6, lineHeight: 28 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  input: { fontFamily: fonts.medium, fontSize: 15 },
  chip: { fontFamily: fonts.semibold, fontSize: 14 },
  code: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: 6 },
  // Músicas e cifra (5.7) e Modo Palco (5.8).
  songTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  songName: { fontFamily: fonts.semibold, fontSize: 15 },
  songHeader: { fontFamily: fonts.extrabold, fontSize: 23, letterSpacing: -0.6 },
  lyric: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  chord: { fontFamily: fonts.mono, fontWeight: '700', fontSize: 15, lineHeight: 20 },
  section: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  stageTitle: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: -0.8 },
  stageLyric: { fontFamily: fonts.semibold, fontSize: 23, lineHeight: 29 },
  editor: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 21 },
  // Computador: menu lateral, cabeçalho e título grande do Início.
  nav: { fontFamily: fonts.medium, fontSize: 15 },
  navActive: { fontFamily: fonts.semibold, fontSize: 15 },
  headerName: { fontFamily: fonts.semibold, fontSize: 15 },
  desktopTitle: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.6 },
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
  button: 14,
  tag: 14,
  eventRow: 12,
  quickAction: 12,
  pill: 20,
  key: 10, // selo do tom
  card: 18, // vidro: cantos mais arredondados
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
  // Computador (manual Light, seção 05).
  desktopMin: 1024, // a partir daqui: menu lateral + cabeçalho
  desktopTwoColumns: 1200, // Início em duas colunas
  sidebar: 248, // largura do menu lateral (manual: 232–256)
  header: 64, // altura do cabeçalho
  desktopPage: 760, // largura das telas comuns no computador
  desktopHome: 1120, // largura do Início no computador
  desktopAside: 360, // coluna auxiliar do Início (semana e avisos)
  navItem: 44,
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
