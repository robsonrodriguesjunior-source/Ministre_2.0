import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, size as sizes } from '@/theme/tokens';

// Ícones de traço fino copiados de docs/design/telas-direcoes.html (viewBox 24, stroke 1.9, cantos redondos).
const glyphs = {
  home: <Path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  calendar: (
    <>
      <Rect x={4} y={5} width={16} height={15} rx={3} />
      <Path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  music: (
    <>
      <Path d="M9 18V6l10-2v12" />
      <Circle cx={6.5} cy={18} r={2.5} />
      <Circle cx={16.5} cy={16} r={2.5} />
    </>
  ),
  user: (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  bell: (
    <>
      <Path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  check: <Path d="M5 12l5 5 9-10" />,
  clock: (
    <>
      <Circle cx={12} cy={12} r={8} />
      <Path d="M12 8v4l3 2" />
    </>
  ),
  megaphone: (
    <>
      <Path d="M4 10v4h3l8 4V6L7 10z" />
      <Path d="M19 9a4 4 0 0 1 0 6" />
    </>
  ),
  unavailable: (
    <>
      <Circle cx={12} cy={12} r={8} />
      <Path d="M6.5 6.5l11 11" />
    </>
  ),
  list: <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  forward: <Path d="M9 5l7 7-7 7" />,
  more: (
    <>
      <Circle cx={5} cy={12} r={1} />
      <Circle cx={12} cy={12} r={1} />
      <Circle cx={19} cy={12} r={1} />
    </>
  ),
  search: (
    <>
      <Circle cx={11} cy={11} r={6.5} />
      <Path d="M20 20l-4.2-4.2" />
    </>
  ),
  minus: <Path d="M5 12h14" />,
  play: <Path d="M8 5.5v13l10.5-6.5z" />,
  pause: <Path d="M8 5v14M16 5v14" />,
  edit: <Path d="M5 19h4L19 9l-4-4L5 15zM13.5 6.5l4 4" />,
  link: (
    <>
      <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  sliders: <Path d="M5 7h9M18 7h1M5 17h1M10 17h9M16 5v4M8 15v4" />,
} as const;

export type IconName = keyof typeof glyphs;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = sizes.icon, color = colors.ink, strokeWidth = 1.9 }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {glyphs[name]}
    </Svg>
  );
}
