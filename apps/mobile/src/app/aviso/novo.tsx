import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Button, Checkbox, EmptyState, Notice, Text, TextField } from '@/components/ui';
import { notificationKeys, notificationsApi } from '@/features/notifications/api';
import { ApiError } from '@/lib/api';
import { useActiveMembership } from '@/stores/session';
import { colors, radius, space, type } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

// Novo aviso (5.9): título, texto, "Fixar no topo" e "Enviar para o celular". Também edita (?id=).
export default function NovoAviso() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const editId = rawId ? Number(rawId) : null;
  const qc = useQueryClient();
  const isLeader = useActiveMembership()?.role === 'leader';

  const list = useQuery({ queryKey: notificationKeys.announcements, queryFn: notificationsApi.announcements, enabled: !!editId });
  const editing = list.data?.data.find((a) => a.id === editId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [push, setPush] = useState(true);
  const [loaded, setLoaded] = useState(!editId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (editing && !loaded) {
    setTitle(editing.title);
    setBody(editing.body);
    setPinned(editing.pinned);
    setLoaded(true);
  }

  if (!isLeader) {
    return (
      <FormScreen title="Novo aviso">
        <EmptyState icon="megaphone" message="Só líderes do ministério mandam avisos." actionLabel="Voltar" onAction={() => goBack('/avisos')} />
      </FormScreen>
    );
  }

  const save = async () => {
    const local: Record<string, string> = {};
    if (!title.trim()) local.title = 'Dê um título para o aviso.';
    if (!body.trim()) local.body = 'Escreva o aviso.';
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    setError(null);
    try {
      if (editId) await notificationsApi.updateAnnouncement(editId, { title: title.trim(), body: body.trim(), pinned });
      else await notificationsApi.createAnnouncement({ title: title.trim(), body: body.trim(), pinned, send_push: push });
      qc.invalidateQueries({ queryKey: notificationKeys.announcements });
      qc.invalidateQueries({ queryKey: ['home'] });
      goBack('/avisos');
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors({ title: e.field('title') ?? '', body: e.field('body') ?? '' });
      } else {
        setError(e instanceof ApiError ? e.message : 'Não foi possível enviar. Tente de novo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title={editId ? 'Editar aviso' : 'Novo aviso'}
      footer={
        <>
          {!!error && <Notice tone="error" message={error} />}
          <Button label={editId ? 'Salvar alterações' : push ? 'Enviar aviso' : 'Publicar aviso'} onPress={save} loading={saving} disabled={!loaded} />
        </>
      }
    >
      <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Ex.: Ensaio extra na sexta" maxLength={120} error={errors.title || undefined} />

      <View style={styles.group}>
        <Text variant="fieldLabel" color="dim">
          Aviso
        </Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          accessibilityLabel="Aviso"
          placeholder="Escreva aqui o que a equipe precisa saber."
          placeholderTextColor={colors.tabInactive}
          selectionColor={colors.orange}
          textAlignVertical="top"
          maxLength={5000}
          style={[styles.body, !!errors.body && styles.bodyError]}
        />
        {!!errors.body && (
          <Text variant="meta" color="orange">
            {errors.body}
          </Text>
        )}
      </View>

      <Checkbox
        checked={pinned}
        onChange={setPinned}
        accessibilityLabel="Fixar no topo"
        label={
          <View>
            <Text variant="tileTitle">Fixar no topo</Text>
            <Text variant="meta" color="dim">
              Fica em primeiro na lista e no Início.
            </Text>
          </View>
        }
      />
      {!editId && (
        <Checkbox
          checked={push}
          onChange={setPush}
          accessibilityLabel="Enviar para o celular da equipe"
          label={
            <View>
              <Text variant="tileTitle">Enviar para o celular da equipe</Text>
              <Text variant="meta" color="dim">
                Chega como notificação para quem ativou os avisos.
              </Text>
            </View>
          }
        />
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  body: {
    ...type.input,
    minHeight: 160,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.button,
    padding: space.lg,
    outlineStyle: 'none',
  } as object,
  bodyError: { borderColor: colors.orangeBorder },
});
