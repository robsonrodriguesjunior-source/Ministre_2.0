import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormScreen } from '@/components/FormScreen';
import { Button, Notice, TextField } from '@/components/ui';
import { authApi } from '@/features/auth/api';
import { useApiForm } from '@/features/auth/useApiForm';
import { useSession } from '@/stores/session';

const emailSchema = z.object({
  email: z.string().trim().min(1, 'Preencha o e-mail.').email('Informe um e-mail válido.'),
});
const resetSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'O código tem 6 números.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
});

// Esqueci a senha (5.1): 1) e-mail recebe um código de 6 dígitos; 2) código + senha nova.
export default function EsqueciSenha() {
  const [email, setEmail] = useState<string | null>(null);
  return email ? <ResetStep email={email} onBack={() => setEmail(null)} /> : <EmailStep onSent={setEmail} />;
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const { control, handleSubmit, setError, formState } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const { formError, run } = useApiForm(setError, ['email']);

  const submit = handleSubmit((values) =>
    run(async () => {
      await authApi.forgot(values.email.trim());
      onSent(values.email.trim());
    }),
  );

  return (
    <FormScreen
      question="Esqueci a senha"
      subtitle="Mandamos um código de 6 números para o seu e-mail."
      footer={<Button label="Enviar código" onPress={submit} loading={formState.isSubmitting} />}
    >
      {!!formError && <Notice tone="error" message={formError} />}
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
            onSubmitEditing={() => submit()}
          />
        )}
      />
    </FormScreen>
  );
}

function ResetStep({ email, onBack }: { email: string; onBack: () => void }) {
  const signIn = useSession((s) => s.signIn);
  const { control, handleSubmit, setError, formState } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '' },
  });
  const { formError, run } = useApiForm(setError, ['code', 'password']);

  const submit = handleSubmit((values) =>
    run(async () => {
      const { token, user } = await authApi.reset(email, values.code.trim(), values.password);
      await signIn(token, user);
    }),
  );

  return (
    <FormScreen
      question="Crie uma senha nova"
      subtitle={`Se houver uma conta com ${email}, o código chega em instantes. Confira também o spam.`}
      footer={
        <>
          <Button label="Salvar senha nova" onPress={submit} loading={formState.isSubmitting} />
          <Button label="Usar outro e-mail" variant="secondary" onPress={onBack} />
        </>
      }
    >
      {!!formError && <Notice tone="error" message={formError} />}
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label="Código"
            value={field.value}
            onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 6))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            placeholder="000000"
            maxLength={6}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Senha nova"
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
    </FormScreen>
  );
}
