import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Button, Card, Chip, Notice, Segmented, Skeleton, Text, Toast } from '@/components/ui';
import type { Role } from '@/features/auth/types';
import { type Invite, manageApi, manageKeys } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { shortDate } from '@/lib/dates';
import { useActiveMembership } from '@/stores/session';
import { colors, radius, space } from '@/theme/tokens';

const DAYS = [7, 30, 90];

function message(invite: Invite, ministry: string) {
  return `Você foi convidado para o ${ministry} no Ministre! Toque no link para entrar: ${invite.link} (código ${invite.code})`;
}

async function copy(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // sem permissão de copiar: segue para compartilhar
  }
  return false;
}

// O convite recém-criado: código grande e os jeitos de mandar.
function InviteCard({ invite, ministry, onToast }: { invite: Invite; ministry: string; onToast: (m: string) => void }) {
  const text = message(invite, ministry);
  return (
    <Card style={styles.card}>
      <Text variant="cardLabel" color="orange">
        Convite {invite.role === 'leader' ? 'de líder' : 'de membro'}
      </Text>
      <Text variant="code" style={styles.code} accessibilityLabel={`Código ${invite.code.split('').join(' ')}`} selectable>
        {invite.code}
      </Text>
      <Text variant="meta" color="dim" selectable>
        {invite.link}
      </Text>
      <Text variant="meta" color="tabInactive">
        Vale até {shortDate(new Date(invite.expires_at))}
      </Text>
      <Button label="Enviar pelo WhatsApp" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)} />
      <View style={styles.row}>
        <Button
          label="Copiar link"
          variant="secondary"
          style={styles.flex}
          onPress={async () => onToast((await copy(text)) ? 'Convite copiado. É só colar na conversa.' : 'Toque e segure o link acima para copiar.')}
        />
        <Button label="Compartilhar" variant="secondary" style={styles.flex} onPress={() => Share.share({ message: text }).catch(() => undefined)} />
      </View>
    </Card>
  );
}

// Gestão › Convidar (5.10): gera código e link para mandar no WhatsApp.
export default function Convites() {
  const qc = useQueryClient();
  const ministry = useActiveMembership()?.ministry.name ?? 'ministério';
  const invites = useQuery({ queryKey: manageKeys.invites, queryFn: manageApi.invites });
  const [role, setRole] = useState<Role>('member');
  const [days, setDays] = useState(30);
  const [created, setCreated] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => manageApi.createInvite({ role, days_valid: days }),
    onSuccess: (r) => {
      setCreated(r.data);
      setError(null);
      qc.invalidateQueries({ queryKey: manageKeys.invites });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Não foi possível criar o convite.'),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => manageApi.cancelInvite(id),
    onSuccess: (r, id) => {
      setToast(r.message);
      if (created?.id === id) setCreated(null);
      qc.invalidateQueries({ queryKey: manageKeys.invites });
    },
  });

  const active = (invites.data?.data ?? []).filter((i) => i.usable && i.id !== created?.id);

  return (
    <>
      <FormScreen title="Convidar">
        {created ? (
          <InviteCard invite={created} ministry={ministry} onToast={setToast} />
        ) : (
          <Card style={styles.card}>
            <Text variant="tileTitle">Novo convite</Text>
            <Text variant="fieldLabel" color="dim">
              Entra como
            </Text>
            <Segmented<Role>
              options={[
                { value: 'member', label: 'Membro' },
                { value: 'leader', label: 'Líder' },
              ]}
              value={role}
              onChange={setRole}
            />
            <Text variant="fieldLabel" color="dim">
              Vale por
            </Text>
            <View style={styles.row}>
              {DAYS.map((d) => (
                <Chip key={d} label={`${d} dias`} selected={days === d} onPress={() => setDays(d)} />
              ))}
            </View>
            {!!error && <Notice tone="error" message={error} />}
            <Button label="Criar convite" onPress={() => create.mutate()} loading={create.isPending} />
            <Text variant="meta" color="tabInactive">
              Quem abrir o link escolhe as próprias funções e já entra na equipe.
            </Text>
          </Card>
        )}
        {created && <Button label="Criar outro convite" variant="secondary" onPress={() => setCreated(null)} />}

        <View>
          <Text variant="fieldLabel" color="dim" style={styles.label}>
            Convites ativos
          </Text>
          {invites.isLoading ? (
            <Skeleton height={56} />
          ) : active.length === 0 ? (
            <Text variant="bodySm" color="dim">
              Nenhum outro convite ativo.
            </Text>
          ) : (
            active.map((i, n) => (
              <View key={i.id} style={[styles.item, n < active.length - 1 && styles.divider]}>
                <View style={styles.flex}>
                  <Text variant="listName">{i.code}</Text>
                  <Text variant="meta" color="dim">
                    {i.role === 'leader' ? 'Líder' : 'Membro'} · vale até {shortDate(new Date(i.expires_at))} · usado {i.uses} {i.uses === 1 ? 'vez' : 'vezes'}
                  </Text>
                </View>
                <Pressable onPress={() => setCreated(i)} accessibilityRole="button" hitSlop={8}>
                  <Text variant="link" color="orange">
                    Enviar
                  </Text>
                </Pressable>
                <Pressable onPress={() => cancel.mutate(i.id)} accessibilityRole="button" accessibilityLabel={`Cancelar convite ${i.code}`} hitSlop={8}>
                  <Text variant="link" color="dim">
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </FormScreen>
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.md },
  code: { textAlign: 'center', paddingVertical: space.sm, backgroundColor: colors.card2, borderRadius: radius.button, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  label: { marginBottom: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
});
