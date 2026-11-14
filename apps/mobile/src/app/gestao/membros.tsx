import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { BottomSheet, Button, Chip, IconButton, ListRow, Notice, Pill, Segmented, Skeleton, Text, Toast } from '@/components/ui';
import type { Role } from '@/features/auth/types';
import { manageApi, manageKeys, type Member } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/stores/session';
import { space } from '@/theme/tokens';

// Um membro aberto: papel, funções e remover.
function MemberSheet({ member, onClose, onDone }: { member: Member | null; onClose: () => void; onDone: (msg: string) => void }) {
  const positions = useQuery({ queryKey: manageKeys.positions, queryFn: manageApi.positions, enabled: !!member });
  const [role, setRole] = useState<Role>('member');
  const [picked, setPicked] = useState<number[]>([]);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Abre já com o papel e as funções da pessoa.
  if (member && loadedFor !== member.id) {
    setRole(member.role);
    setPicked(member.positions.map((p) => p.id));
    setLoadedFor(member.id);
    setConfirmRemove(false);
    setError(null);
  }

  const run = async (kind: 'save' | 'remove') => {
    if (!member) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'save') {
        await manageApi.updateMember(member.id, { role, position_ids: picked });
        onDone('Alterações salvas.');
      } else {
        onDone((await manageApi.removeMember(member.id)).message);
      }
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <BottomSheet visible={!!member} onClose={onClose} title={member?.is_me ? `${member.name} (você)` : member?.name}>
      {!!member && (
        <View style={styles.sheet}>
          <Text variant="meta" color="dim">
            {[member.email, member.phone].filter(Boolean).join(' · ')}
          </Text>

          <Text variant="fieldLabel" color="dim">
            Papel
          </Text>
          <Segmented<Role>
            options={[
              { value: 'member', label: 'Membro' },
              { value: 'leader', label: 'Líder' },
            ]}
            value={role}
            onChange={setRole}
          />
          <Text variant="meta" color="tabInactive">
            Líderes montam escalas, mandam avisos e acessam a gestão.
          </Text>

          <Text variant="fieldLabel" color="dim">
            Funções
          </Text>
          <View style={styles.chips}>
            {(positions.data?.data ?? []).filter((p) => !p.archived).map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={picked.includes(p.id)}
                onPress={() => setPicked((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
              />
            ))}
          </View>

          {!!error && <Notice tone="error" message={error} />}
          <Button label="Salvar" onPress={() => run('save')} loading={busy === 'save'} />
          {confirmRemove ? (
            <>
              <Text variant="bodySm" color="inkSoft">
                {member.name.split(' ')[0]} sai do ministério e das escalas que ainda vão acontecer. O histórico continua.
              </Text>
              <Button label="Sim, remover" variant="secondary" onPress={() => run('remove')} loading={busy === 'remove'} />
            </>
          ) : (
            <Button label={member.is_me ? 'Sair do ministério' : 'Remover do ministério'} variant="secondary" onPress={() => setConfirmRemove(true)} />
          )}
        </View>
      )}
    </BottomSheet>
  );
}

// Gestão › Membros (5.10).
export default function Membros() {
  const qc = useQueryClient();
  const refreshMemberships = useSession((s) => s.refreshMemberships);
  const members = useQuery({ queryKey: manageKeys.members, queryFn: manageApi.members });
  const [open, setOpen] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const list = members.data?.data ?? [];

  return (
    <>
      <FormScreen title="Membros" action={<IconButton icon="plus" label="Convidar" onPress={() => router.push('/gestao/convites')} />}>
        {members.isLoading ? (
          <View style={styles.loading}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        ) : (
          <View>
            <Text variant="fieldLabel" color="tabInactive" style={styles.count}>
              {list.length} {list.length === 1 ? 'pessoa' : 'pessoas'}
            </Text>
            {list.map((m, i) => (
              <ListRow
                key={m.id}
                name={m.is_me ? `${m.name} (você)` : m.name}
                subtitle={m.positions.length ? m.positions.map((p) => p.name).join(', ') : 'Sem função'}
                photoUrl={m.avatar_url}
                seed={m.user_id}
                right={m.role === 'leader' ? <Pill label="Líder" tone="ok" /> : undefined}
                onPress={() => setOpen(m)}
                divider={i < list.length - 1}
              />
            ))}
            <Button label="Convidar pessoas" variant="secondary" onPress={() => router.push('/gestao/convites')} style={styles.invite} />
          </View>
        )}
      </FormScreen>

      <MemberSheet
        member={open}
        onClose={() => setOpen(null)}
        onDone={(msg) => {
          const wasMe = open?.is_me;
          setOpen(null);
          setToast(msg);
          qc.invalidateQueries({ queryKey: manageKeys.members });
          qc.invalidateQueries({ queryKey: manageKeys.positions });
          if (wasMe) refreshMemberships(); // mudou o meu papel: o app se ajusta (ex.: deixa de ver a gestão)
        }}
      />
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { gap: space.md },
  count: { marginBottom: space.xs },
  invite: { marginTop: space.xl },
  sheet: { gap: space.md, marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
