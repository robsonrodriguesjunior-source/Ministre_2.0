import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Vibração leve de confirmação. No navegador usa a vibração do Android (o iPhone não deixa sites vibrarem).
export function lightTap() {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(12);
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function success() {
  if (Platform.OS === 'web') {
    lightTap();
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
