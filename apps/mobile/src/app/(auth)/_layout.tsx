import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

// Boas-vindas é sempre a primeira tela de quem não entrou na conta.
export const unstable_settings = { initialRouteName: 'boas-vindas' };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="boas-vindas" />
      <Stack.Screen name="entrar" />
      <Stack.Screen name="criar-conta" />
      <Stack.Screen name="esqueci-senha" />
    </Stack>
  );
}
