import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';

// Curva usada nas animações do design (cubic-bezier(.2,.8,.2,1)).
export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);

// "Reduzir movimento" do sistema: as mudanças acontecem igual, só que sem animação.
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => active && setReduce(value))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return reduce;
}

// Duração ajustada: zero quando a pessoa pediu para reduzir movimento.
export function duration(ms: number, reduce: boolean) {
  return reduce ? 0 : ms;
}
