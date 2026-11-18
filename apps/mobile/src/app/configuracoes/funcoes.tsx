import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { BottomSheet, Button, Icon, Notice, Skeleton, Text, TextField, Toast } from '@/components/ui';
import { type ManagedPosition, manageApi, manageKeys } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { colors, size, space } from '@/theme/tokens';

const errorOf = (e: unknown) => (e instanceof ApiError ? (e.field('name') ?? e.message) : 'Não foi possível salvar. Tente de novo.');

// Configurações › Funções (5.10): criar, renomear, ordenar e arquivar. Arquivada some das escolhas, mas o histórico fica.
export default function Funcoes() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: manageKeys.positions, queryFn: manageApi.positions });
  const all = query.data?.data ?? [];
  const active = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);

  const [name, setName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedPosition | null>(null);
  const [rename, setRename] = useState('');
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: manageKeys.positions });
    qc.invalidateQueries({ queryKey: manageKeys.members });
  };

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setAddError(null);
    try {
      await manageApi.createPosition(name.trim());
      setName('');
      refresh();
    } catch (e) {
      setAddError(errorOf(e));
    } finally {
      setBusy(false);
    }
  };

  const move = async (i: number, dir: -1 | 1) => {
    const ids = active.map((p) => p.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    qc.setQueryData(manageKeys.positions, { data: [...ids.map((id) => active.find((p) => p.id === id)!), ...archived] });
    await manageApi.reorderPositions([...ids, ...archived.map((p) => p.id)]).catch(() => undefined);
    refresh();
  };

  const save = async (patch: { name?: string; archived?: boolean }, msg: string) => {
    if (!editing) return;
    setBusy(true);
    setSheetError(null);
    try {
      await manageApi.updatePosition(editing.id, patch);
      setEditing(null);
      setToast(msg);
      refresh();
    } catch (e) {
      setSheetError(errorOf(e));
    } finally {
      setBusy(false);
    }
  };

  const open = (p: ManagedPosition) => {
    setEditing(p);
    setRename(p.name);
    setSheetError(null);
  };

  return (
    <>
      <FormScreen title="Funções">
        <View style={styles.add}>
          <TextField label="Nova função" value={name} onChangeText={setName} placeholder="Ex.: Saxofone" maxLength={40} onSubmitEditing={add} returnKeyType="done" error={addError ?? undefined} />
          {!!name.trim() && <Button label="Adicionar" variant="secondary" onPress={add} loading={busy && !editing} />}
        </View>

        {query.isLoading ? (
          <Skeleton height={200} />
        ) : (
          <View>
            <Text variant="fieldLabel" color="dim" style={styles.label}>
              Ordem em que aparecem na escala
            </Text>
            {active.map((p, i) => (
              <View key={p.id} style={[styles.row, i < active.length - 1 && styles.divider]}>
                <Pressable onPress={() => open(p)} accessibilityRole="button" accessibilityLabel={`Editar ${p.name}`} style={styles.flex}>
                  <Text variant="listName">{p.name}</Text>
                  <Text variant="meta" color="dim">
                    {p.members_count} {p.members_count === 1 ? 'pessoa' : 'pessoas'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => move(i, -1)} disabled={i === 0} accessibilityRole="button" accessibilityLabel={`Subir ${p.name}`} hitSlop={6} style={[styles.arrow, i === 0 && styles.disabled]}>
                  <View style={styles.up}>
                    <Icon name="back" size={18} />
                  </View>
                </Pressable>
                <Pressable onPress={() => move(i, 1)} disabled={i === active.length - 1} accessibilityRole="button" accessibilityLabel={`Descer ${p.name}`} hitSlop={6} style={[styles.arrow, i === active.length - 1 && styles.disabled]}>
                  <View style={styles.down}>
                    <Icon name="back" size={18} />
                  </View>
                </Pressable>
              </View>
            ))}

            {archived.length > 0 && (
              <>
                <Text variant="fieldLabel" color="dim" style={[styles.label, styles.archivedLabel]}>
                  Arquivadas
                </Text>
                {archived.map((p) => (
                  <Pressable key={p.id} onPress={() => open(p)} accessibilityRole="button" style={[styles.row, styles.divider]}>
                    <Text variant="listName" color="dim" style={styles.flex}>
                      {p.name}
                    </Text>
                    <Text variant="link" color="orange">
                      Restaurar
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}
      </FormScreen>

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.name}>
        <View style={styles.sheet}>
          {editing?.archived ? (
            <>
              <Text variant="bodySm" color="inkSoft">
                Esta função está arquivada: não aparece para escolher nas escalas nem no convite.
              </Text>
              <Button label="Restaurar função" onPress={() => save({ archived: false }, 'Função restaurada.')} loading={busy} />
            </>
          ) : (
            <>
              <TextField label="Nome" value={rename} onChangeText={setRename} maxLength={40} error={sheetError ?? undefined} />
              <Button label="Salvar nome" onPress={() => save({ name: rename.trim() }, 'Nome salvo.')} loading={busy} disabled={!rename.trim() || rename.trim() === editing?.name} />
              <Button label="Arquivar" variant="secondary" onPress={() => save({ archived: true }, 'Função arquivada.')} />
              <Text variant="meta" color="tabInactive">
                Arquivar tira a função das escolhas; as escalas antigas continuam mostrando.
              </Text>
            </>
          )}
          {!!sheetError && editing?.archived && <Notice tone="error" message={sheetError} />}
        </View>
      </BottomSheet>
      <Toast message={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  add: { gap: space.sm },
  label: { marginBottom: space.xs },
  archivedLabel: { marginTop: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  arrow: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
  up: { transform: [{ rotate: '90deg' }] },
  down: { transform: [{ rotate: '-90deg' }] },
  disabled: { opacity: 0.3 },
  sheet: { gap: space.md, marginTop: space.md },
});
