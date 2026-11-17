import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Props = {
  /** Brilho mais fraco (telas de leitura, como cifra e formulários longos). */
  calm?: boolean;
};

// Fundo do "Vidro escuro": um brilho laranja no alto à esquerda e um azul no meio à direita.
// Fica atrás do conteúdo e não recebe toques.
export function Glow({ calm = false }: Props) {
  const strong = calm ? 0.22 : 0.5;
  const blue = calm ? 0.3 : 0.55;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="glowOrange" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.glowOrange} stopOpacity={strong} />
            <Stop offset="0.65" stopColor={colors.glowOrange} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.glowBlue} stopOpacity={blue} />
            <Stop offset="0.65" stopColor={colors.glowBlue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Centros afastados da borda: o brilho some antes dela (sem corte reto no computador). */}
        <Circle cx={150} cy={130} r={220} fill="url(#glowOrange)" />
        <Circle cx="86%" cy={480} r={200} fill="url(#glowBlue)" />
      </Svg>
    </View>
  );
}
