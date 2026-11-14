import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Chip, Notice, Text } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { space } from '@/theme/tokens';

const REASONS = ['Viagem', 'Trabalho', 'Saúde', 'Outro'];

type Props = {
  visible: boolean;
  onClose: () => void;
  eventTitle: string;
  onDecline: (reason?: string) => Promise<unknown>;
};

// "Não posso" (5.2): motivo opcional e o líder é avisado.
export function DeclineSheet({ visible, onClose, eventTitle, onDecline }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await onDecline(reason ?? undefined);
      setReason(null);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível avisar agora. Tente de novo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Não posso ir">
      <Text variant="bodySm" color="inkSoft">
        {eventTitle}. O líder vai ser avisado. Quer dizer o motivo?
      </Text>
      <View style={styles.chips}>
        {REASONS.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(reason === r ? null : r)} />
        ))}
      </View>
      {!!error && <Notice tone="error" message={error} />}
      <View style={styles.actions}>
        <Button label="Avisar o líder" onPress={send} loading={sending} />
        <Button label="Voltar" variant="secondary" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginVertical: space.lg,
  },
  actions: {
    gap: space.sm,
    marginTop: space.md,
  },
});
