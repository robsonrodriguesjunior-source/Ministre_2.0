import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWeeks } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet, Button, Chip, Icon, type IconName, Notice, Text } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import { colors, space } from '@/theme/tokens';

import { eventsApi } from './api';
import type { EventDetail } from './types';

type Mode = 'menu' | 'duplicate' | 'cancel' | 'delete';

function Item({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <Icon name={icon} color={danger ? colors.orange : colors.ink} />
      <Text variant="body" color={danger ? 'orange' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

// Menu ⋯ da escala (só líder): Editar, Duplicar para outra data, Cancelar culto, Excluir.
export function EventMenu({ event, visible, onClose, onToast }: { event: EventDetail; visible: boolean; onClose: () => void; onToast: (m: string) => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('menu');
  const [weeks, setWeeks] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const date = new Date(event.starts_at);

  const close = () => {
    setMode('menu');
    setError(null);
    onClose();
  };
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['events'] });
    qc.invalidateQueries({ queryKey: ['home'] });
    qc.invalidateQueries({ queryKey: ['event', event.id] });
  };
  const fail = (e: unknown) => setError(e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Algo deu errado.');

  const duplicate = useMutation({
    mutationFn: () => eventsApi.duplicate(event.id, addWeeks(date, weeks).toISOString()),
    onSuccess: ({ data }) => {
      refresh();
      close();
      router.push({ pathname: '/escala/[id]', params: { id: String(data.id) } });
    },
    onError: fail,
  });
  const cancel = useMutation({
    mutationFn: () => eventsApi.cancel(event.id),
    onSuccess: () => {
      refresh();
      close();
      onToast('Culto cancelado. A equipe foi avisada.');
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => eventsApi.remove(event.id),
    onSuccess: () => {
      refresh();
      close();
      router.back();
    },
    onError: fail,
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={mode === 'duplicate' ? 'Duplicar para outra data' : mode === 'cancel' ? 'Cancelar culto?' : mode === 'delete' ? 'Excluir escala?' : event.title}
    >
      {!!error && <Notice tone="error" message={error} />}

      {mode === 'menu' && (
        <View>
          <Item icon="list" label="Editar" onPress={() => { close(); router.push({ pathname: '/escala/nova', params: { id: String(event.id) } }); }} />
          <Item icon="calendar" label="Duplicar para outra data" onPress={() => setMode('duplicate')} />
          {event.status !== 'cancelled' && <Item icon="unavailable" label="Cancelar culto" onPress={() => setMode('cancel')} />}
          <Item icon="close" label="Excluir" danger onPress={() => setMode('delete')} />
        </View>
      )}

      {mode === 'duplicate' && (
        <View style={styles.block}>
          <Text variant="bodySm" color="inkSoft">
            A cópia leva a equipe, as músicas e o roteiro, e fica como rascunho. Quem não puder na nova data fica de fora.
          </Text>
          <View style={styles.chips}>
            {[1, 2, 3, 4].map((w) => (
              <Chip key={w} label={shortDate(addWeeks(date, w))} selected={weeks === w} onPress={() => setWeeks(w)} />
            ))}
          </View>
          <Button label="Duplicar" onPress={() => duplicate.mutate()} loading={duplicate.isPending} />
        </View>
      )}

      {mode === 'cancel' && (
        <View style={styles.block}>
          <Text variant="bodySm" color="inkSoft">
            A escala continua na agenda como cancelada e quem estava escalado é avisado.
          </Text>
          <Button label="Cancelar culto" onPress={() => cancel.mutate()} loading={cancel.isPending} />
          <Button label="Voltar" variant="secondary" onPress={() => setMode('menu')} />
        </View>
      )}

      {mode === 'delete' && (
        <View style={styles.block}>
          <Text variant="bodySm" color="inkSoft">
            A escala some da agenda de todos. Isso não pode ser desfeito.
          </Text>
          <Button label="Excluir escala" onPress={() => remove.mutate()} loading={remove.isPending} />
          <Button label="Voltar" variant="secondary" onPress={() => setMode('menu')} />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pressed: { opacity: 0.7 },
  block: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
