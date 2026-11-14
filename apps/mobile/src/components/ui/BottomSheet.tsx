import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { duration, easeOut, useReduceMotion } from '@/theme/motion';
import { colors, motion, radius, size, space } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

const OFFSCREEN = 600;

// Painel que sobe de baixo: `card`, raio 28 no topo, alça 40×5; o fundo escurece para rgba(0,0,0,.62).
// Feito com Reanimated (funciona igual no app e no navegador). Toque fora ou na alça fecha.
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const reduce = useReduceMotion();
  const insets = useSafeAreaInsets();
  // Ao fechar, o painel continua montado (closing) até a animação de descida terminar.
  const [closing, setClosing] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    setClosing(!visible);
  }
  const mounted = visible || closing;
  const progress = useSharedValue(0);

  useEffect(() => {
    const d = duration(motion.plus, reduce);
    if (visible) {
      progress.value = withTiming(1, { duration: d, easing: easeOut });
    } else {
      progress.value = withTiming(0, { duration: d, easing: easeOut }, (done) => {
        if (done) runOnJS(setClosing)(false);
      });
    }
  }, [visible, reduce, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * OFFSCREEN }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar painel" />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { paddingBottom: space.xxl + insets.bottom }, sheetStyle]}
          accessibilityViewIsModal
        >
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={styles.handleArea}>
            <View style={styles.handle} />
          </Pressable>
          {!!title && (
            <Text variant="sheetTitle" style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.backdrop,
  },
  sheet: {
    width: '100%',
    maxWidth: size.maxContentWidth,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.lg,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: space.md,
  },
  handle: {
    width: size.sheetHandleW,
    height: size.sheetHandleH,
    borderRadius: size.sheetHandleH,
    backgroundColor: colors.lineStrong,
  },
  title: {
    marginBottom: space.md,
  },
});
