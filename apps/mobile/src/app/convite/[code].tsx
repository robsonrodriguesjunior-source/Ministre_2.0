import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Button, Card, Chip, Notice, Skeleton, Text } from '@/components/ui';
import { authApi } from '@/features/auth/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/stores/session';
import { space } from '@/theme/tokens';

// Convite (link app.ministreapp.com.br/convite/CODIGO ou ministre://convite/CODIGO):
// mostra igreja e ministério, a pessoa escolhe as próprias funções e entra.
export default function Convite() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? '').toUpperCase();
  const token = useSession((s) => s.token);
  const memberships = useSession((s) => s.memberships);
  const setPendingInvite = useSession((s) => s.setPendingInvite);
  const refreshMemberships = useSession((s) => s.refreshMemberships);
  const setActiveMinistry = useSession((s) => s.setActiveMinistry);
  const [positions, setPositions] = useState<number[]>([]);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useQuery({
    queryKey: ['invite', code],
    queryFn: () => authApi.invitePreview(code),
    retry: false,
  });

  // Sem conta ainda: guarda o convite para continuar depois do login ou cadastro.
  useEffect(() => {
    if (!token && code) setPendingInvite(code);
  }, [token, code, setPendingInvite]);

  // Convite pessoal: o líder já cadastrou a pessoa (nome e funções). Vale mesmo se ela já estiver no ministério (junta tudo).
  const personal = preview.data?.member ?? null;
  const alreadyMember = !personal && memberships.some((m) => m.ministry.id === preview.data?.ministry.id);

  // Convite inválido, vencido ou de um ministério em que já está: não fica "preso" esperando.
  const dead = preview.isError || (!!token && (alreadyMember || preview.data?.usable === false));
  useEffect(() => {
    if (dead) setPendingInvite(null);
  }, [dead, setPendingInvite]);

  const join = async () => {
    setError(null);
    setJoining(true);
    try {
      const { data } = await authApi.acceptInvite(code, positions);
      await setPendingInvite(null);
      await setActiveMinistry(data.ministry.id);
      await refreshMemberships();
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError ? (e.field('code') ?? e.message) : 'Algo deu errado. Tente de novo.');
    } finally {
      setJoining(false);
    }
  };

  const footer = !preview.data ? undefined : !token ? (
    <>
      <Button label="Criar conta para entrar" onPress={() => router.push('/criar-conta')} />
      <Button label="Já tenho conta" variant="secondary" onPress={() => router.push('/entrar')} />
    </>
  ) : alreadyMember ? (
    <Button label="Abrir o ministério" onPress={() => router.replace('/')} />
  ) : (
    <Button label="Entrar no ministério" onPress={join} loading={joining} disabled={!preview.data.usable} />
  );

  return (
    <FormScreen title="Convite" footer={footer}>
      {preview.isLoading && (
        <View style={styles.loading}>
          <Skeleton height={110} rounded={22} />
          <Skeleton height={14} width="50%" />
        </View>
      )}

      {preview.isError && (
        <Notice
          tone="error"
          message={preview.error instanceof ApiError ? preview.error.message : 'Não foi possível abrir o convite.'}
        />
      )}

      {preview.data && (
        <>
          <Card>
            <Text variant="cardLabel" color="orangeText">
              {personal ? `Olá, ${personal.name.split(' ')[0]}!` : 'Convite'}
            </Text>
            <Text variant="cardTitle" style={styles.title}>
              {preview.data.ministry.name}
            </Text>
            <Text variant="bodySm" color="inkSoft">
              {preview.data.church.name}
              {preview.data.church.city ? ` · ${preview.data.church.city}` : ''}
            </Text>
            <Text variant="meta" color="dim" style={styles.role}>
              {personal
                ? `O líder já cadastrou você${personal.positions.length ? ` como ${personal.positions.join(', ')}` : ''}. É só entrar: suas escalas já estão lá.`
                : `Você entra como ${preview.data.role === 'leader' ? 'líder' : 'membro'}.`}
            </Text>
          </Card>

          {!preview.data.usable && <Notice tone="error" message="Este convite expirou ou já foi usado. Peça um novo ao líder." />}
          {alreadyMember && <Notice message="Você já faz parte deste ministério." />}
          {!!error && <Notice tone="error" message={error} />}

          {!!token && !alreadyMember && !personal && preview.data.usable && preview.data.positions.length > 0 && (
            <View style={styles.group}>
              <Text variant="sectionTitle">O que você faz na equipe?</Text>
              <Text variant="meta" color="dim">
                Escolha uma ou mais funções. O líder pode ajustar depois.
              </Text>
              <View style={styles.chips}>
                {preview.data.positions.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={positions.includes(p.id)}
                    onPress={() =>
                      setPositions((list) => (list.includes(p.id) ? list.filter((i) => i !== p.id) : [...list, p.id]))
                    }
                  />
                ))}
              </View>
            </View>
          )}

          {!token && <Notice message="Crie sua conta ou entre para aceitar o convite. Ele fica guardado." />}
        </>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: space.md,
  },
  title: {
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  role: {
    marginTop: space.md,
  },
  group: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
});
