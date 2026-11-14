import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarStack, Button, Card, Icon, Pill, Text } from '@/components/ui';
import { longDateTime, relativeDays } from '@/lib/dates';
import { colors, space } from '@/theme/tokens';

import { DeclineSheet } from './DeclineSheet';
import { myStatus } from './status';
import type { EventSummary } from './types';
import { useRespond } from './useRespond';

// Cartão "Próximo culto" do Início (5.2), medidas de telas-direcoes.html.
export function NextEventCard({ event }: { event: EventSummary }) {
  const date = new Date(event.starts_at);
  const status = myStatus(event.mine);
  const { confirm, decline } = useRespond();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  // Mantém o botão na tela até a animação de "Confirmado" terminar.
  const [justConfirmed, setJustConfirmed] = useState(false);
  const first = event.mine[0];
  const positions = event.mine.map((m) => m.position).join(' + ');
  const answered = status === 'confirmed' || status === 'declined';

  return (
    <>
      <Card
        onPress={() => router.push({ pathname: '/escala/[id]', params: { id: String(event.id) } })}
        accessibilityLabel={`Próximo culto: ${event.title}, ${longDateTime(date)}`}
        style={styles.card}
      >
        <View style={styles.row}>
          <Text variant="cardLabel" color="orange">
            {event.is_rehearsal ? 'Próximo ensaio' : 'Próximo culto'}
          </Text>
          <Pill label={relativeDays(date)} tone="wait" />
        </View>
        <Text variant="cardTitle" style={styles.title}>
          {event.title}
        </Text>
        <View style={styles.meta}>
          <Icon name="calendar" size={16} color={colors.dim} />
          <Text variant="bodySm" color="inkSoft">
            {longDateTime(date)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Icon name="music" size={16} color={colors.dim} />
          <Text variant="bodySm" color="inkSoft">
            Você: {positions}
          </Text>
        </View>
        <View style={styles.hr} />
        <View style={styles.row}>
          <AvatarStack people={event.faces.map((f) => ({ name: f.name, photoUrl: f.avatar_url, seed: f.user_id }))} />
          <Text variant="meta" color="dim">
            {event.team_count} {event.team_count === 1 ? 'pessoa' : 'pessoas'} na equipe
          </Text>
        </View>

        {answered && !changing && !justConfirmed ? (
          <View style={styles.answered}>
            {status === 'confirmed' ? (
              <Pill label="Presença confirmada" tone="ok" />
            ) : (
              <Pill label="Você avisou que não pode" tone="declined" />
            )}
            <Pressable onPress={() => setChanging(true)} accessibilityRole="button" hitSlop={10}>
              <Text variant="link" color="orange">
                Mudar resposta
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.buttons}>
            <Button
              label="Confirmar"
              confirmed={justConfirmed}
              confirmedLabel="Confirmado"
              loading={confirm.isPending}
              onPress={() =>
                first &&
                confirm.mutate(first.assignment_id, {
                  onSuccess: () => {
                    setJustConfirmed(true);
                    setTimeout(() => {
                      setJustConfirmed(false);
                      setChanging(false);
                    }, 1200);
                  },
                })
              }
              style={styles.wide}
            />
            <Button label="Não posso" variant="secondary" onPress={() => setDeclineOpen(true)} style={styles.narrow} />
          </View>
        )}
      </Card>

      <DeclineSheet
        visible={declineOpen}
        onClose={() => setDeclineOpen(false)}
        eventTitle={event.title}
        onDecline={async (reason) => {
          if (!first) return;
          await decline.mutateAsync({ assignmentId: first.assignment_id, reason });
          setChanging(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginVertical: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  hr: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
  buttons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  wide: { flex: 1.3 },
  narrow: { flex: 1 },
  answered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md },
});
