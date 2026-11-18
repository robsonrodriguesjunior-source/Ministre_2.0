import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Avatar, Card, EmptyState, MenuRow, Text } from '@/components/ui';
import { manageApi, manageKeys } from '@/features/manage/api';
import { useActiveMembership } from '@/stores/session';
import { colors, space } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

const ITEMS = [
  { icon: 'user', label: 'Membros', subtitle: 'Papel, funções e remover', href: '/gestao/membros' },
  { icon: 'plus', label: 'Convidar', subtitle: 'Código e link para mandar no WhatsApp', href: '/gestao/convites' },
  { icon: 'unavailable', label: 'Indisponibilidades', subtitle: 'Quem não pode, mês a mês', href: '/gestao/indisponibilidades' },
  // Funções e Ministério ficam em Configurações (/configuracoes).
  { icon: 'sliders', label: 'Configurações', subtitle: 'Funções (Cantor, Bateria…) e dados do ministério', href: '/configuracoes' },
] as const;

// Gestão do ministério (5.10, só líderes). No computador, os atalhos ficam em grade.
export default function Gestao() {
  const membership = useActiveMembership();
  const isLeader = membership?.role === 'leader';
  const isManager = !!membership?.church.is_manager;
  const wide = useWindowDimensions().width >= 760;
  const ministry = useQuery({ queryKey: manageKeys.ministry, queryFn: manageApi.ministry, enabled: isLeader });
  const info = ministry.data?.data;

  if (!isLeader) {
    return (
      <FormScreen title="Gestão">
        <EmptyState icon="list" message="Só líderes do ministério acessam a gestão." actionLabel="Voltar" onAction={() => goBack('/perfil')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Gestão do ministério">
      {!!info && (
        <View style={styles.head}>
          <Avatar name={info.name} photoUrl={info.logo_url} seed={info.id} size={56} />
          <View style={styles.flex}>
            <Text variant="cardTitle">{info.name}</Text>
            <Text variant="meta" color="dim">
              {info.church} · {info.members_count} {info.members_count === 1 ? 'pessoa' : 'pessoas'}
            </Text>
          </View>
        </View>
      )}

      {isManager && (
        <Card style={styles.church}>
          <MenuRow icon="calendar" label="Visão da igreja" subtitle="Todos os departamentos, culto a culto, e a frequência de cada pessoa" onPress={() => router.push('/gestao/igreja')} divider />
          <MenuRow icon="user" label="Gestores da igreja" subtitle="Quem administra todos os departamentos (pastor ou outra pessoa)" onPress={() => router.push('/gestao/gestores')} divider={false} />
        </Card>
      )}

      {wide ? (
        <View style={styles.grid}>
          {ITEMS.map((item) => (
            <Card key={item.href} style={styles.tile}>
              <MenuRow icon={item.icon} label={item.label} subtitle={item.subtitle} onPress={() => router.push(item.href)} divider={false} />
            </Card>
          ))}
        </View>
      ) : (
        <View>
          {ITEMS.map((item, i) => (
            <MenuRow key={item.href} icon={item.icon} label={item.label} subtitle={item.subtitle} onPress={() => router.push(item.href)} divider={i < ITEMS.length - 1} />
          ))}
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '31%', flexGrow: 1, minWidth: 240, paddingVertical: space.xs },
  church: { paddingVertical: space.xs, borderColor: colors.orangeBorder, backgroundColor: colors.orangeSoft },
});
