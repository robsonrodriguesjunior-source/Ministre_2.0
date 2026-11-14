import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Chip, Pill, Screen, SectionHeader, Text } from '@/components/ui';
import { useActiveMembership, useSession } from '@/stores/session';
import { space } from '@/theme/tokens';

// Perfil provisório (Etapa 2): quem sou, ministério ativo, papel, funções, trocar ministério e sair.
// O Perfil completo (foto, estatísticas, preferências, excluir conta) chega na Etapa 6.
export default function PerfilScreen() {
  const user = useSession((s) => s.user);
  const memberships = useSession((s) => s.memberships);
  const setActiveMinistry = useSession((s) => s.setActiveMinistry);
  const signOut = useSession((s) => s.signOut);
  const active = useActiveMembership();

  return (
    <Screen>
      <Text variant="screenTitle" accessibilityRole="header">
        Perfil
      </Text>

      <View style={styles.who}>
        <Avatar name={user?.name ?? '?'} photoUrl={user?.avatar_url} seed={user?.id} size={56} />
        <View style={styles.flex}>
          <Text variant="cardTitle">{user?.name}</Text>
          <Text variant="meta" color="dim">
            {user?.email}
          </Text>
        </View>
      </View>

      {active && (
        <Card>
          <View style={styles.between}>
            <Text variant="cardLabel" color="orange">
              Ministério
            </Text>
            <Pill label={active.role === 'leader' ? 'Líder' : 'Membro'} tone={active.role === 'leader' ? 'ok' : 'wait'} />
          </View>
          <Text variant="cardTitle" style={styles.title}>
            {active.ministry.name}
          </Text>
          <Text variant="bodySm" color="inkSoft">
            {active.church.name}
            {active.church.city ? ` · ${active.church.city}` : ''}
          </Text>
          <Text variant="meta" color="dim" style={styles.positions}>
            {active.positions.length ? `Minhas funções: ${active.positions.map((p) => p.name).join(', ')}` : 'Sem função definida ainda.'}
          </Text>
        </Card>
      )}

      {memberships.length > 1 && (
        <>
          <SectionHeader title="Trocar de ministério" />
          <View style={styles.chips}>
            {memberships.map((m) => (
              <Chip
                key={m.id}
                label={`${m.ministry.name} · ${m.church.name}`}
                selected={m.ministry.id === active?.ministry.id}
                onPress={() => setActiveMinistry(m.ministry.id)}
              />
            ))}
          </View>
        </>
      )}

      <View style={styles.actions}>
        <Button label="Entrar em outro ministério" variant="secondary" onPress={() => router.push('/convite')} />
        <Button label="Sair" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xl },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: space.sm, marginBottom: space.xs },
  positions: { marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.xxl },
});
