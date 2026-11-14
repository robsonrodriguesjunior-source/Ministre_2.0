import { Text as RNText, type TextProps } from 'react-native';

import { colors, type ColorToken, type TypeToken, type } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeToken;
  color?: ColorToken;
};

// Texto do app: sempre com um estilo da escala tipográfica e uma cor dos tokens.
export function Text({ variant = 'body', color = 'ink', style, ...rest }: Props) {
  return <RNText {...rest} style={[type[variant], { color: colors[color] }, style]} />;
}
