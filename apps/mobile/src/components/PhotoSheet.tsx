import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Text } from '@/components/ui';
import { type PhotoSource, pickPhoto } from '@/lib/photo';
import { space } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Envia a foto escolhida; devolve quando terminar. */
  onUpload: (form: FormData) => Promise<unknown>;
  /** Quando já existe foto: mostra "Remover foto". */
  onRemove?: () => Promise<unknown>;
};

// Trocar foto: tirar agora, escolher da galeria ou remover.
export function PhotoSheet({ visible, onClose, title, onUpload, onRemove }: Props) {
  const [busy, setBusy] = useState<PhotoSource | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: PhotoSource | 'remove') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'remove') {
        await onRemove?.();
      } else {
        const form = await pickPhoto(kind);
        if (!form) return;
        await onUpload(form);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível trocar a foto. Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.actions}>
        {/* No computador não há câmera para "tirar foto": só escolher um arquivo. */}
        {Platform.OS !== 'web' || isTouch() ? (
          <Button label="Tirar foto" variant="secondary" onPress={() => run('camera')} loading={busy === 'camera'} />
        ) : null}
        <Button label={Platform.OS === 'web' && !isTouch() ? 'Escolher imagem' : 'Escolher da galeria'} variant="secondary" onPress={() => run('library')} loading={busy === 'library'} />
        {!!onRemove && <Button label="Remover foto" variant="secondary" onPress={() => run('remove')} loading={busy === 'remove'} />}
        {!!error && (
          <Text variant="meta" color="orangeText" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}

function isTouch() {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
}

const styles = StyleSheet.create({
  actions: { gap: space.sm, marginTop: space.lg },
});
