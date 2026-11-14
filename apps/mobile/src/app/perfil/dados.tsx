import { useState } from 'react';

import { FormScreen } from '@/components/FormScreen';
import { Button, Notice, TextField } from '@/components/ui';
import { meApi } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/stores/session';
import { goBack } from '@/lib/nav';

// Perfil › Meus dados: nome e celular. O e-mail é o login e não muda por aqui.
export default function MeusDados() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return setErrors({ name: 'Digite seu nome.' });
    setSaving(true);
    setErrors({});
    setError(null);
    try {
      setUser((await meApi.update({ name: name.trim(), phone: phone.trim() || null })).data);
      goBack('/perfil');
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors({ name: e.field('name'), phone: e.field('phone') });
      else setError(e instanceof ApiError ? e.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Meus dados"
      footer={
        <>
          {!!error && <Notice tone="error" message={error} />}
          <Button label="Salvar" onPress={save} loading={saving} />
        </>
      }
    >
      <TextField label="Nome" value={name} onChangeText={setName} autoComplete="name" maxLength={120} error={errors.name} />
      <TextField label="Celular" value={phone} onChangeText={setPhone} placeholder="(11) 99999-0000" keyboardType="phone-pad" autoComplete="tel" maxLength={30} error={errors.phone} hint="Opcional. Só os líderes do ministério veem." />
      <TextField label="E-mail" value={user?.email ?? ''} editable={false} hint="É o seu login; não dá para trocar por aqui." />
    </FormScreen>
  );
}
