import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormScreen } from '@/components/FormScreen';
import { Button, Checkbox, Notice, Text, TextField } from '@/components/ui';
import { authApi } from '@/features/auth/api';
import { useApiForm } from '@/features/auth/useApiForm';
import { useSession } from '@/stores/session';

const schema = z.object({
  name: z.string().trim().min(2, 'Preencha o seu nome.'),
  email: z.string().trim().min(1, 'Preencha o e-mail.').email('Informe um e-mail válido.'),
  phone: z.string().trim().optional(),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
  terms: z.boolean().refine((v) => v, 'É preciso aceitar os Termos e a Política de Privacidade.'),
});
type Form = z.infer<typeof schema>;

// Criar conta (5.1): nome, e-mail, celular (opcional), senha e aceite dos Termos (LGPD).
export default function CriarConta() {
  const signIn = useSession((s) => s.signIn);
  const { control, handleSubmit, setError, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', terms: false },
  });
  const { formError, run } = useApiForm(setError, ['name', 'email', 'phone', 'password', 'terms']);

  const submit = handleSubmit((values) =>
    run(async () => {
      const { token, user } = await authApi.register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
        terms: values.terms,
      });
      await signIn(token, user);
    }),
  );

  return (
    <FormScreen
      question="Criar conta"
      subtitle="Leva menos de um minuto."
      footer={<Button label="Criar conta" onPress={submit} loading={formState.isSubmitting} />}
    >
      {!!formError && <Notice tone="error" message={formError} />}
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Nome"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            textContentType="name"
            placeholder="Como a equipe te chama"
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="E-mail"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="voce@exemplo.com"
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <TextField
            label="Celular (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="(11) 99999-0000"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Senha"
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            hint="Pelo menos 8 caracteres."
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      />
      <Controller
        control={control}
        name="terms"
        render={({ field, fieldState }) => (
          <>
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              accessibilityLabel="Li e aceito os Termos de Uso e a Política de Privacidade"
              label={
                <Text variant="bodySm" color="inkSoft">
                  Li e aceito os <Text variant="bodySm">Termos de Uso</Text> e a{' '}
                  <Text variant="bodySm">Política de Privacidade</Text>.
                </Text>
              }
            />
            {!!fieldState.error && (
              <Text variant="meta" color="orange">
                {fieldState.error.message}
              </Text>
            )}
          </>
        )}
      />
    </FormScreen>
  );
}
