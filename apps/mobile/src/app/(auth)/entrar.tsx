import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable } from 'react-native';
import { z } from 'zod';

import { FormScreen } from '@/components/FormScreen';
import { Button, Notice, Text, TextField } from '@/components/ui';
import type { TextFieldRef } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { useApiForm } from '@/features/auth/useApiForm';
import { useSession } from '@/stores/session';

const schema = z.object({
  email: z.string().trim().min(1, 'Preencha o e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Preencha a senha.'),
});
type Form = z.infer<typeof schema>;

export default function Entrar() {
  const signIn = useSession((s) => s.signIn);
  const passwordRef = useRef<TextFieldRef>(null);
  const { control, handleSubmit, setError, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const { formError, run } = useApiForm(setError, ['email', 'password']);

  const submit = handleSubmit((values) =>
    run(async () => {
      const { token, user } = await authApi.login(values.email.trim(), values.password);
      await signIn(token, user);
    }),
  );

  return (
    <FormScreen
      logo
      question="Acesse sua conta"
      subtitle="Use o e-mail e a senha da sua conta."
      footer={
        <>
          <Button label="Entrar" onPress={submit} loading={formState.isSubmitting} />
          <Button label="Criar conta" variant="secondary" onPress={() => router.replace('/criar-conta')} />
        </>
      }
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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="voce@exemplo.com"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            ref={passwordRef}
            label="Senha"
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => submit()}
          />
        )}
      />
      <Pressable onPress={() => router.push('/esqueci-senha')} accessibilityRole="link" hitSlop={10} style={{ alignSelf: 'center' }}>
        <Text variant="link" color="orangeText">
          Esqueci a senha
        </Text>
      </Pressable>
    </FormScreen>
  );
}
