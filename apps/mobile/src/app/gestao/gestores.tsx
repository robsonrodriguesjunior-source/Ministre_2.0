import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { BottomSheet, Button, EmptyState, ListRow, Notice, Pill, Skeleton, Text, TextField, Toast } from '@/components/ui';
import { manageApi, manageKeys, type ChurchManager } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { goBack } from '@/lib/nav';
import { useActiveMembership, useSession } from '@/stores/session';
import { space } from '@/theme/tokens';

const errorText = (e: unknown) => (e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Não foi possível salvar. Tente de novo.');

// Gestão › Gestores da igreja: quem administra todos os departamentos (o pastor ou outra pessoa).
// O líder de um departamento continua mandando só na própria equipe.
export default function GestoresIgreja() {
  const isManager = !!useActiveMembership()?.church.is_manager;
  const refreshMemberships = useSession((s) => s.refreshMemberships);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: manageKeys.churchManagers, queryFn: manageApi.churchManagers, enabled: isManager });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<ChurchManager | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!isManager) {
    return (
      <FormScreen title="Gestores da igreja">
        <EmptyState icon="list" message="Só os gestores da igreja mexem nesta lista." actionLabel="Voltar" onAction={() => goBack('/gestao')} />
      </FormScreen>
    );
  }

  const done = async (msg: string, me = false) => {
    setToast(msg);
    await qc.invalidateQueries({ queryKey: ['manage'] });
    if (me) refreshMemberships();
  };

  const add = async (p: ChurchManager) => {
    setBusy(p.user_id);
    setError(null);
    try {
      const res = await manageApi.addChurchManager(p.user_id);
      setAdding(false);
      setSearch('');
      await done(res.message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(removing.user_id);
    setError(null);
    try {
      const res = await manageApi.removeChurchManager(removing.user_id);
      const me = removing.is_me;
      setRemoving(null);
      await done(res.message, me);
      if (me) goBack('/perfil');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const managers = query.data?.data ?? [];
  const term = search.trim().toLowerCase();
  const candidates = (query.data?.candidates ?? []).filter((c) => !term || c.name.toLowerCase().includes(term));

  return (
    <>
      <FormScreen title="Gestores da igreja" footer={<Button label="Adicionar gestor" onPress={() => { setError(null); setAdding(true); }} />}>
        <Text variant="bodySm" color="dim">
          Gestores têm acesso de gestão em todos os departamentos: montam escalas, cuidam das equipes e veem a Visão da igreja. Pode ser o pastor ou outra pessoa que administra o Ministre. O líder de um departamento continua cuidando só da própria equipe.
        </Text>

        {!!error && !adding && !removing && <Notice tone="error" message={error} />}

        {query.isLoading ? (
          <Skeleton height={140} />
        ) : (
          <View>
            {managers.map((p, i) => (
              <ListRow
                key={p.user_id}
                name={p.is_me ? `${p.name} (você)` : p.name}
                subtitle={p.is_owner ? 'Criou a igreja · sempre gestor' : 'Gestor'}
                photoUrl={p.avatar_url}
                seed={p.user_id}
                onPress={p.is_owner ? undefined : () => { setError(null); setRemoving(p); }}
                right={p.is_owner ? <Pill label="Fixo" tone="ok" /> : <Text variant="link" color="orange">Tirar</Text>}
                divider={i < managers.length - 1}
              />
            ))}
          </View>
        )}
      </FormScreen>

      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="Adicionar gestor" scroll>
        <View style={styles.sheet}>
          <Text variant="meta" color="dim">
            Escolha alguém que já participa de algum departamento. A pessoa passa a ser líder em todos os departamentos.
          </Text>
          <TextField label="Buscar" value={search} onChangeText={setSearch} placeholder="Nome da pessoa" />
          {!!error && <Notice tone="error" message={error} />}
          {candidates.length === 0 ? (
            <Text variant="meta" color="dim">
              {term ? 'Ninguém com esse nome.' : 'Todas as pessoas da igreja já são gestoras.'}
            </Text>
          ) : (
            <View>
              {candidates.map((c, i) => (
                <ListRow
                  key={c.user_id}
                  name={c.name}
                  photoUrl={c.avatar_url}
                  seed={c.user_id}
                  onPress={busy ? undefined : () => add(c)}
                  right={<Text variant="link" color="orange">{busy === c.user_id ? 'Salvando…' : 'Tornar gestor'}</Text>}
                  divider={i < candidates.length - 1}
                />
              ))}
            </View>
          )}
        </View>
      </BottomSheet>

      <BottomSheet visible={!!removing} onClose={() => setRemoving(null)} title={removing?.is_me ? 'Deixar de ser gestor?' : `Tirar ${removing?.name ?? ''} dos gestores?`}>
        <View style={styles.sheet}>
          <Text variant="bodySm" color="dim">
            {removing?.is_me ? 'Você' : 'A pessoa'} volta a ter acesso só aos departamentos em que já participava, com o papel que tinha antes.
          </Text>
          {!!error && <Notice tone="error" message={error} />}
          <Button label="Tirar dos gestores" onPress={remove} loading={busy === removing?.user_id} />
          <Button label="Cancelar" variant="secondary" onPress={() => setRemoving(null)} />
        </View>
      </BottomSheet>

      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: space.md },
});
