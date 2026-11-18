import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormScreen } from '@/components/FormScreen';
import { Button, Chip, Notice, Text, TextField } from '@/components/ui';
import { authApi } from '@/features/auth/api';
import { useApiForm } from '@/features/auth/useApiForm';
import { useSession } from '@/stores/session';
import { space } from '@/theme/tokens';

// Pré-marcados (5.1).
const POSITIONS = ['Ministro', 'Vocal', 'Violão', 'Guitarra', 'Baixo', 'Teclado', 'Bateria', 'Som', 'Projeção'];
const EVENT_TYPES = ['Culto da Família', 'Culto de Oração', 'Santa Ceia', 'Ensaio'];

const schema = z.object({
  church_name: z.string().trim().min(2, 'Preencha o nome da igreja.'),
  city: z.string().trim().optional(),
  ministry_name: z.string().trim().min(2, 'Preencha o nome do ministério.'),
  positions: z.array(z.string()).min(1, 'Escolha pelo menos uma função.'),
  event_types: z.array(z.string()),
});
type Form = z.infer<typeof schema>;

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

// "Criar meu ministério": igreja, cidade, ministério, funções e tipos de culto. Quem cria vira Líder.
export default function CriarMinisterio() {
  const refreshMemberships = useSession((s) => s.refreshMemberships);
  const setActiveMinistry = useSession((s) => s.setActiveMinistry);
  const { control, handleSubmit, setError, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { church_name: '', city: '', ministry_name: 'Louvor', positions: POSITIONS, event_types: EVENT_TYPES },
  });
  const { formError, run } = useApiForm(setError, ['church_name', 'city', 'ministry_name', 'positions', 'event_types']);

  const submit = handleSubmit((values) =>
    run(async () => {
      const { data } = await authApi.createChurch({
        church_name: values.church_name.trim(),
        city: values.city?.trim() || undefined,
        ministry_name: values.ministry_name.trim(),
        positions: values.positions,
        event_types: values.event_types,
      });
      await setActiveMinistry(data.ministry.id);
      await refreshMemberships();
    }),
  );

  return (
    <FormScreen
      question="Criar meu ministério"
      subtitle="Você poderá mudar tudo isso depois, em Configurações."
      footer={<Button label="Criar ministério" onPress={submit} loading={formState.isSubmitting} />}
    >
      {!!formError && <Notice tone="error" message={formError} />}
      <Controller
        control={control}
        name="church_name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nome da igreja"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Ex.: Igreja Batista Central"
          />
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field, fieldState }) => (
          <TextField
            label="Cidade"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Ex.: São Paulo"
          />
        )}
      />
      <Controller
        control={control}
        name="ministry_name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nome do ministério"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="positions"
        render={({ field, fieldState }) => (
          <View style={styles.group}>
            <Text variant="fieldLabel" color="dim">
              Funções da equipe
            </Text>
            <View style={styles.chips}>
              {POSITIONS.map((p) => (
                <Chip key={p} label={p} selected={field.value.includes(p)} onPress={() => field.onChange(toggle(field.value, p))} />
              ))}
            </View>
            {!!fieldState.error && (
              <Text variant="meta" color="orangeText">
                {fieldState.error.message}
              </Text>
            )}
          </View>
        )}
      />
      <Controller
        control={control}
        name="event_types"
        render={({ field }) => (
          <View style={styles.group}>
            <Text variant="fieldLabel" color="dim">
              Tipos de culto
            </Text>
            <View style={styles.chips}>
              {EVENT_TYPES.map((t) => (
                <Chip key={t} label={t} selected={field.value.includes(t)} onPress={() => field.onChange(toggle(field.value, t))} />
              ))}
            </View>
          </View>
        )}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
