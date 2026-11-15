import { Image } from 'expo-image';

// Logo oficial do Ministre (Logo2026, versão colorida). Nunca redesenhar: só estas imagens.
// horizontal = menu lateral e cabeçalhos largos · vertical = abertura e login · symbol = espaços pequenos.
const SOURCES = {
  horizontal: { file: require('../../../assets/brand/logo-horizontal.png'), ratio: 960 / 280 },
  vertical: { file: require('../../../assets/brand/logo-vertical.png'), ratio: 960 / 574 },
  symbol: { file: require('../../../assets/brand/simbolo.png'), ratio: 384 / 396 },
} as const;

type Props = {
  variant?: keyof typeof SOURCES;
  /** Largura em px; a altura segue a proporção do arquivo. */
  width: number;
};

export function Logo({ variant = 'horizontal', width }: Props) {
  const s = SOURCES[variant];
  return (
    <Image
      source={s.file}
      style={{ width, height: width / s.ratio }}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ministre"
    />
  );
}
