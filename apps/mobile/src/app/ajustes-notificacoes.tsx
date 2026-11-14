import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Switch, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Card, Skeleton, Text } from '@/components/ui';
import { notificationKeys, notificationsApi, type PushPrefs } from '@/features/notifications/api';
import { PushCard } from '@/features/notifications/PushCard';
import { useActiveMembership } from '@/stores/session';
import { colors, space } from '@/theme/tokens';

const OPTIONS: { key: keyof PushPrefs; title: string; body: string; leaderOnly?: boolean }[] = [
  { key: 'escalas', title: 'Escalas', body: 'Quando você for escalado, sair de uma escala ou ela mudar.' },
  { key: 'lembretes', title: 'Lembretes', body: '2 dias antes, se ainda não respondeu, e no dia do culto, 3 h antes.' },
  { key: 'avisos', title: 'Avisos do líder', body: 'Quando o líder mandar um aviso para a equipe.' },
  { key: 'indisponibilidade', title: 'Quando alguém não pode', body: 'Alguém da equipe avisou que não pode ir.', leaderOnly: true },
  { key: 'resumo', title: 'Resumo da semana', body: 'Toda segunda às 9h: escalas da semana e quem falta responder.', leaderOnly: true },
];

// Perfil › Notificações (5.9): o que chega no celular. O sino do app mostra tudo de qualquer jeito.
export default function AjustesNotificacoes() {
  const qc = useQueryClient();
  const isLeader = useActiveMembership()?.role === 'leader';
  const prefs = useQuery({ queryKey: notificationKeys.prefs, queryFn: notificationsApi.prefs });

  const change = useMutation({
    mutationFn: (patch: Partial<PushPrefs>) => notificationsApi.updatePrefs(patch),
    onMutate: (patch) => {
      const previous = qc.getQueryData<{ data: PushPrefs }>(notificationKeys.prefs);
      if (previous) qc.setQueryData(notificationKeys.prefs, { data: { ...previous.data, ...patch } });
      return { previous };
    },
    onError: (_e, _p, ctx) => ctx?.previous && qc.setQueryData(notificationKeys.prefs, ctx.previous),
    onSuccess: (r) => qc.setQueryData(notificationKeys.prefs, r),
  });

  return (
    <FormScreen title="Notificações">
      <PushCard />

      <View>
        <Text variant="fieldLabel" color="dim" style={styles.label}>
          O que chega no celular
        </Text>
        <Card style={styles.list}>
          {!prefs.data ? (
            <Skeleton height={160} />
          ) : (
            OPTIONS.filter((o) => isLeader || !o.leaderOnly).map((o, i, all) => (
              <View key={o.key} style={[styles.row, i < all.length - 1 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="tileTitle">{o.title}</Text>
                  <Text variant="meta" color="dim">
                    {o.body}
                  </Text>
                </View>
                <Switch
                  value={prefs.data.data[o.key]}
                  onValueChange={(v) => change.mutate({ [o.key]: v })}
                  accessibilityLabel={o.title}
                  trackColor={{ false: colors.lineStrong, true: colors.orange }}
                  thumbColor={colors.ink}
                  {...({ activeThumbColor: colors.ink } as object)}
                />
              </View>
            ))
          )}
        </Card>
        <Text variant="meta" color="tabInactive" style={styles.note}>
          Tudo continua aparecendo no sino do app.
        </Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { marginBottom: space.sm },
  list: { paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  note: { marginTop: space.sm },
});
