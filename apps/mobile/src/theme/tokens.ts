// Tokens de design do Ministre: visual "Escuro sóbrio" (aprovado em 18/11/2026; substitui o "Vidro escuro").
// Fundo escuro liso, cartões sólidos com borda fina, fonte do sistema, laranja só nas ações.
// Sem brilhos, degradês ou vidro. Nunca use cor ou tamanho solto num componente: use sempre um token daqui.

import { Platform, type TextStyle } from 'react-native';

export const colors = {
  bg: '#0E1116', // fundo principal (liso)
  card: '#161B22', // cartões, campos e botões secundários (sólido)
  card2: '#1C222B', // fundos de ícone, segmentado, seleção neutra
  surface: '#161B22', // folhas que sobem, aviso flutuante, barra de abas, menu lateral
  line: '#2A313C', // borda fina
  lineStrong: '#3A4350',
  tabBar: '#161B22',
  ink: '#F2F4F7', // texto forte
  inkSoft: '#C9CFD8',
  inkMuted: '#C9CFD8', // rótulo dos atalhos (QuickAction)
  dim: '#A3ACB9', // texto secundário
  tabInactive: '#8E97A6',
  // "orange" = ação: laranja da marca com texto branco (só botões principais e item ativo).
  orange: '#D9541C',
  orangeSoft: 'rgba(240,122,69,0.14)', // destaque suave (item ativo do menu, seleção)
  orangeBorder: 'rgba(240,122,69,0.45)',
  orangeText: '#F07A45', // laranja claro para texto e ícones sobre o fundo escuro
  onOrange: '#FFFFFF',
  brand: '#E5571F', // laranja da bandeira (logo)
  ivory: '#1F2630', // passar o mouse
  success: '#47CD89',
  successBg: 'rgba(18,183,106,0.14)',
  warning: '#FDB022',
  warningBg: 'rgba(247,144,9,0.14)',
  danger: '#F97066',
  dangerBg: 'rgba(240,68,56,0.14)',
  stageBg: '#0E1116',
  backdrop: 'rgba(0,0,0,0.6)',
  glowOrange: '#E5571F', // (sem uso no visual sóbrio: o Glow não desenha mais nada)
  glowBlue: '#2F5BA8',
  transparent: 'transparent',
} as const;

// Tons fixos para avatar sem foto: neutros e discretos (texto claro por cima, contraste AA).
export const avatarTones = ['#334155', '#3F4A5C', '#374151', '#40485A', '#3B4252', '#2F3B4C', '#454B57'] as const;

// Fonte do próprio sistema (San Francisco no iPhone, Roboto no Android, Segoe UI no Windows):
// visual mais profissional e nada para baixar. O peso vai em fontWeight (use `weight.x`).
const SYSTEM = Platform.select({ web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", default: undefined });
export const weight = {
  regular: { fontFamily: SYSTEM, fontWeight: '400' },
  medium: { fontFamily: SYSTEM, fontWeight: '500' },
  semibold: { fontFamily: SYSTEM, fontWeight: '600' },
  bold: { fontFamily: SYSTEM, fontWeight: '700' },
  extrabold: { fontFamily: SYSTEM, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

export const fonts = {
  // Cifras: monoespaçada do sistema (Menlo no iOS, monospace no Android e na web).
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

// Escala tipográfica. O peso vem de `weight` (fonte do sistema).
export const type = {
  screenTitle: { ...weight.extrabold, fontSize: 24, letterSpacing: -0.3 },
  cardTitle: { ...weight.extrabold, fontSize: 19, letterSpacing: -0.2 },
  headerTitle: { ...weight.extrabold, fontSize: 18, letterSpacing: -0.2 },
  greetingName: { ...weight.extrabold, fontSize: 16 },
  barTitle: { ...weight.bold, fontSize: 15 },
  sectionTitle: { ...weight.bold, fontSize: 14 },
  listName: { ...weight.bold, fontSize: 13.5 },
  eventTitle: { ...weight.bold, fontSize: 14 },
  body: { ...weight.regular, fontSize: 14 },
  bodySm: { ...weight.regular, fontSize: 13 },
  meta: { ...weight.regular, fontSize: 12 },
  link: { ...weight.semibold, fontSize: 13 },
  button: { ...weight.bold, fontSize: 14 },
  segment: { ...weight.bold, fontSize: 13 },
  cardLabel: { ...weight.bold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  pill: { ...weight.bold, fontSize: 11.5 },
  quickAction: { ...weight.semibold, fontSize: 11.5 },
  tabLabel: { ...weight.semibold, fontSize: 10.5 },
  dayLetter: { ...weight.semibold, fontSize: 11 },
  dayNumber: { ...weight.bold, fontSize: 16 },
  weekday: { ...weight.bold, fontSize: 10.5, letterSpacing: 0.6 },
  eventDay: { ...weight.extrabold, fontSize: 18 },
  dateDay: { ...weight.extrabold, fontSize: 21 },
  dateMonth: { ...weight.extrabold, fontSize: 11, letterSpacing: 0.6 },
  sheetTitle: { ...weight.extrabold, fontSize: 18, letterSpacing: -0.4 },
  tileTitle: { ...weight.bold, fontSize: 14 },
  tileSub: { ...weight.regular, fontSize: 12 },
  logo: { ...weight.extrabold, fontSize: 40, letterSpacing: -1 },
  question: { ...weight.extrabold, fontSize: 23, letterSpacing: -0.3, lineHeight: 28 },
  fieldLabel: { ...weight.bold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' },
  input: { ...weight.medium, fontSize: 15 },
  chip: { ...weight.semibold, fontSize: 14 },
  code: { ...weight.extrabold, fontSize: 24, letterSpacing: 6 },
  // Músicas e cifra (5.7) e Modo Palco (5.8).
  songTitle: { ...weight.semibold, fontSize: 16 },
  songName: { ...weight.semibold, fontSize: 15 },
  songHeader: { ...weight.extrabold, fontSize: 23, letterSpacing: -0.3 },
  lyric: { ...weight.semibold, fontSize: 18, lineHeight: 24 },
  chord: { fontFamily: fonts.mono, fontWeight: '700', fontSize: 15, lineHeight: 20 },
  section: { ...weight.bold, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  stageTitle: { ...weight.extrabold, fontSize: 30, letterSpacing: -0.3 },
  stageLyric: { ...weight.semibold, fontSize: 23, lineHeight: 29 },
  editor: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 21 },
  // Computador: menu lateral, cabeçalho e título grande do Início.
  nav: { ...weight.medium, fontSize: 15 },
  navActive: { ...weight.semibold, fontSize: 15 },
  headerName: { ...weight.semibold, fontSize: 15 },
  desktopTitle: { ...weight.bold, fontSize: 26, letterSpacing: -0.3 },
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
  button: 10,
  tag: 10,
  eventRow: 10,
  quickAction: 12,
  pill: 20,
  key: 10, // selo do tom
  card: 12,
  sheet: 16,
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
