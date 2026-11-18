import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { PhotoSheet } from '@/components/PhotoSheet';
import { Avatar, Button, Chip, Notice, Skeleton, Text, TextField } from '@/components/ui';
import { manageApi, manageKeys, type MinistryInfo, WEEKDAYS_SHORT } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/stores/session';
import { space } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

function Form({ info }: { info: MinistryInfo }) {
  const qc = useQueryClient();
  const refreshMemberships = useSession((s) => s.refreshMemberships);
  const [name, setName] = useState(info.name);
  const [place, setPlace] = useState(info.default_location ?? '');
  const [days, setDays] = useState<number[]>(info.worship_days);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updated = async (data: MinistryInfo) => {
    qc.setQueryData(manageKeys.ministry, { data });
    await refreshMemberships(); // nome e logo aparecem para todo o app
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      await updated((await manageApi.updateMinistry({ name: name.trim(), default_location: place.trim() || null, worship_days: days })).data);
      goBack('/configuracoes');
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors({ name: e.field('name'), default_location: e.field('default_location') });
      else setError(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Ministério"
      footer={
        <>
          {!!error && <Notice tone="error" message={error} />}
          <Button label="Salvar" onPress={save} loading={saving} disabled={!name.trim()} />
        </>
      }
    >
      <Pressable onPress={() => setPhotoOpen(true)} accessibilityRole="button" accessibilityLabel="Trocar logo do ministério" style={styles.logo}>
        <Avatar name={name || info.name} photoUrl={info.logo_url} seed={info.id} size={88} />
        <Text variant="link" color="orangeText">
          {info.logo_url ? 'Trocar logo' : 'Colocar logo'}
        </Text>
      </Pressable>

      <TextField label="Nome do ministério" value={name} onChangeText={setName} maxLength={120} error={errors.name} />
      <TextField label="Local padrão" value={place} onChangeText={setPlace} placeholder="Ex.: Templo" maxLength={120} error={errors.default_location} hint="Já vem preenchido nas escalas novas." />

      <View style={styles.group}>
        <Text variant="fieldLabel" color="dim">
          Dias de culto
        </Text>
        <View style={styles.chips}>
          {WEEKDAYS_SHORT.map((d, i) => (
            <Chip key={d} label={d} selected={days.includes(i)} onPress={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort()))} />
          ))}
        </View>
      </View>

      <PhotoSheet
        visible={photoOpen}
        onClose={() => setPhotoOpen(false)}
        title="Logo do ministério"
        onUpload={async (form) => updated((await manageApi.logo(form)).data)}
        onRemove={info.logo_url ? async () => updated((await manageApi.removeLogo()).data) : undefined}
      />
    </FormScreen>
  );
}

// Configurações › Ministério (5.10): nome, logo, local padrão e dias de culto.
export default function Ministerio() {
  const query = useQuery({ queryKey: manageKeys.ministry, queryFn: manageApi.ministry });
  const info = query.data?.data;
  if (!info) {
    return (
      <FormScreen title="Ministério">
        <Skeleton height={88} width={88} rounded={44} />
        <Skeleton height={50} />
        <Skeleton height={50} />
      </FormScreen>
    );
  }
  return <Form key={info.id} info={info} />;
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', gap: space.sm },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
