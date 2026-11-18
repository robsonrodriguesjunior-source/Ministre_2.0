import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Button, Chip, EmptyState, Notice, Segmented, Text, TextField } from '@/components/ui';
import type { Role } from '@/features/auth/types';
import { type Invite, manageApi, manageKeys } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { goBack } from '@/lib/nav';
import { openWhatsApp, personalInviteText } from '@/lib/whatsapp';
import { useActiveMembership } from '@/stores/session';
import { space } from '@/theme/tokens';

/** "11987654321" -> "(11) 98765-4321" enquanto digita. */
function maskPhone(t: string) {
  const d = t.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Gestão › Cadastrar membro (18/11/2026): o líder cadastra nome, WhatsApp e funções.
// A pessoa já pode ser escalada; o convite pessoal vai pelo WhatsApp e, ao entrar, ela encontra tudo pronto.
export default function NovoMembro() {
  const qc = useQueryClient();
  const membership = useActiveMembership();
  const positions = useQuery({ queryKey: manageKeys.positions, queryFn: manageApi.positions });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState<'whats' | 'only' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; phone: string; invite: Invite } | null>(null);

  if (membership && membership.role !== 'leader') {
    return (
      <FormScreen title="Cadastrar membro">
        <EmptyState icon="user" message="Só líderes do ministério cadastram membros." actionLabel="Voltar" onAction={() => goBack('/gestao/membros')} />
      </FormScreen>
    );
  }

  const ministryName = membership?.ministry.name ?? 'ministério';
  const sendInvite = (p: { name: string; phone: string; invite: Invite }) =>
    openWhatsApp(p.phone, personalInviteText(p.name, ministryName, p.invite.link, p.invite.code));

  const save = async (withWhatsApp: boolean) => {
    if (name.trim().length < 2) {
      setError('Digite o nome da pessoa.');
      return;
    }
    setBusy(withWhatsApp ? 'whats' : 'only');
    setError(null);
    try {
      const res = await manageApi.registerMember({ name: name.trim(), phone: phone || undefined, role, position_ids: picked });
      qc.invalidateQueries({ queryKey: manageKeys.members });
      qc.invalidateQueries({ queryKey: manageKeys.positions });
      const result = { name: name.trim(), phone, invite: res.invite };
      setDone(result);
      if (withWhatsApp) sendInvite(result);
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Não foi possível cadastrar. Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setDone(null);
    setName('');
    setPhone('');
    setRole('member');
    setPicked([]);
  };

  if (done) {
    const first = done.name.split(/\s+/)[0];
    return (
      <FormScreen title="Cadastrar membro">
        <View style={styles.done}>
          <Text variant="cardTitle">Cadastro feito: {done.name}</Text>
          <Text variant="body" color="dim">
            Já dá para escalar. Quando {first} entrar no app pelo convite, encontra tudo pronto: ministério, funções e escalas.
          </Text>
          <Notice tone="info" message={`Convite: ${done.invite.link}  ·  código ${done.invite.code}`} />
          <Button label="Enviar convite no WhatsApp" onPress={() => sendInvite(done)} />
          <Button label="Cadastrar outra pessoa" variant="secondary" onPress={reset} />
          <Button label="Ver membros" variant="secondary" onPress={() => router.replace('/gestao/membros')} />
        </View>
      </FormScreen>
    );
  }

  const active = (positions.data?.data ?? []).filter((p) => !p.archived);

  return (
    <FormScreen
      title="Cadastrar membro"
      footer={
        <>
          {!!error && <Notice tone="error" message={error} />}
          <Button label="Cadastrar e convidar pelo WhatsApp" onPress={() => save(true)} loading={busy === 'whats'} disabled={!!busy} />
          <Button label="Só cadastrar" variant="secondary" onPress={() => save(false)} loading={busy === 'only'} disabled={!!busy} />
        </>
      }
    >
      <Text variant="bodySm" color="dim">
        A pessoa já pode ser escalada. Quando entrar no app pelo convite, encontra tudo pronto.
      </Text>
      <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Lucas Rocha" autoCapitalize="words" maxLength={120} />
      <TextField label="WhatsApp" value={phone} onChangeText={(t) => setPhone(maskPhone(t))} placeholder="(11) 98765-4321" keyboardType="phone-pad" maxLength={16} />

      <View style={styles.group}>
        <Text variant="fieldLabel" color="dim">
          Funções
        </Text>
        <View style={styles.chips}>
          {active.map((p) => (
            <Chip key={p.id} label={p.name} selected={picked.includes(p.id)} onPress={() => setPicked((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))} />
          ))}
          <Pressable onPress={() => router.push('/configuracoes/funcoes')} accessibilityRole="link" style={styles.newFn}>
            <Text variant="link" color="orangeText">
              + Nova função
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.group}>
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
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  newFn: { justifyContent: 'center', paddingHorizontal: space.sm, minHeight: 40 },
  done: { gap: space.md },
});
