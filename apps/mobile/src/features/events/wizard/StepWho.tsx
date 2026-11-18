import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, BottomSheet, Icon, ListRow, Notice, Skeleton, Text } from '@/components/ui';
import { shortDate } from '@/lib/dates';
import { colors, radius, space, weight } from '@/theme/tokens';

import type { Availability } from '../types';

export type TeamPick = { member_id: number; position_id: number; name: string; user_id: number; avatar_url: string | null };

type Props = {
  date: Date;
  availability: Availability | undefined;
  loading: boolean;
  team: TeamPick[];
  onChange: (team: TeamPick[]) => void;
};

// Passo 2: "Quem vai servir?" — uma linha por função; quem não pode no dia não aparece para escolher.
export function StepWho({ date, availability, loading, team, onChange }: Props) {
  const [picking, setPicking] = useState<number | null>(null);
  const position = availability?.positions.find((p) => p.id === picking);

  // Quem marcou indisponibilidade (em qualquer função), uma vez cada.
  const blocked = new Map<number, string>();
  availability?.positions.forEach((p) => p.members.forEach((m) => m.unavailable && blocked.set(m.member_id, m.name)));

  const remove = (member_id: number, position_id: number) =>
    onChange(team.filter((t) => !(t.member_id === member_id && t.position_id === position_id)));

  return (
    <View style={styles.wrap}>
      <Text variant="question">Quem vai servir?</Text>
      <Text variant="fieldLabel" color="tabInactive" style={styles.label}>
        Equipe · {shortDate(date)}
      </Text>

      {loading || !availability ? (
        <View style={styles.loading}>
          <Skeleton height={52} />
          <Skeleton height={52} />
          <Skeleton height={52} />
        </View>
      ) : (
        availability.positions.map((p) => {
          const picked = team.filter((t) => t.position_id === p.id);
          return (
            <View key={p.id} style={styles.row}>
              <Text variant="bodySm" color="dim" style={styles.role}>
                {p.name}
              </Text>
              <View style={styles.people}>
                {picked.map((t) => (
                  <Pressable
                    key={t.member_id}
                    onPress={() => remove(t.member_id, p.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.name} no ${p.name}. Toque para tirar.`}
                    style={styles.person}
                  >
                    <Avatar name={t.name} photoUrl={t.avatar_url} seed={t.user_id} size={36} />
                    <Text variant="body" style={styles.semibold}>
                      {t.name}
                    </Text>
                    <Icon name="close" size={14} color={colors.dim} />
                  </Pressable>
                ))}
                <Pressable onPress={() => setPicking(p.id)} accessibilityRole="button" accessibilityLabel={`Escolher ${p.name}`} style={styles.choose}>
                  <Text variant="link" color="orangeText">
                    + Escolher
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {[...blocked.values()].map((name) => (
        <View key={name} style={styles.notice}>
          <Notice message={`${name} marcou que não pode neste dia.`} />
        </View>
      ))}

      <BottomSheet visible={picking !== null} onClose={() => setPicking(null)} title={position ? `Quem vai no ${position.name}?` : ''}>
        {position && position.members.filter((m) => !m.unavailable).length === 0 && (
          <Text variant="bodySm" color="dim">
            Ninguém disponível com essa função neste dia.
          </Text>
        )}
        {position?.members
          .filter((m) => !m.unavailable)
          .map((m, i, list) => {
            const already = team.some((t) => t.member_id === m.member_id && t.position_id === position.id);
            const otherRole = team.find((t) => t.member_id === m.member_id && t.position_id !== position.id);
            const note = [
              m.busy_at.length ? `já escalado às ${m.busy_at.join(', ')}` : null,
              otherRole ? 'também em outra função' : null,
            ].filter(Boolean).join(' · ');
            return (
              <ListRow
                key={m.member_id}
                name={m.name}
                subtitle={note || undefined}
                photoUrl={m.avatar_url}
                seed={m.user_id}
                divider={i < list.length - 1}
                right={already ? <Icon name="check" color={colors.orange} strokeWidth={3} /> : undefined}
                onPress={() => {
                  onChange(
                    already
                      ? team.filter((t) => !(t.member_id === m.member_id && t.position_id === position.id))
                      : [...team, { member_id: m.member_id, position_id: position.id, name: m.name, user_id: m.user_id, avatar_url: m.avatar_url }],
                  );
                  setPicking(null);
                }}
              />
            );
          })}
        {position?.members.some((m) => m.unavailable) && (
          <Text variant="meta" color="dim" style={styles.sheetNote}>
            {position.members.filter((m) => m.unavailable).map((m) => m.name).join(', ')} não aparece porque marcou que não pode.
          </Text>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.xxl },
  semibold: weight.semibold,
  label: { marginTop: 22, marginBottom: 4 },
  loading: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  role: { width: 72 },
  people: { flex: 1, gap: space.sm, alignItems: 'flex-start' },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  choose: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.orange,
    borderRadius: radius.button,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-end',
  },
  notice: { marginTop: space.md },
  sheetNote: { marginTop: space.md },
});
