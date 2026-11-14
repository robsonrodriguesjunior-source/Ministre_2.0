import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Avatar, Card, EmptyState, MenuRow, Text } from '@/components/ui';
import { manageApi, manageKeys } from '@/features/manage/api';
import { useActiveMembership } from '@/stores/session';
import { space } from '@/theme/tokens';
import { goBack } from '@/lib/nav';

const ITEMS = [
  { icon: 'user', label: 'Membros', subtitle: 'Papel, funções e remover', href: '/gestao/membros' },
  { icon: 'plus', label: 'Convidar', subtitle: 'Código e link para mandar no WhatsApp', href: '/gestao/convites' },
  { icon: 'music', label: 'Funções', subtitle: 'Vocal, Violão… criar, ordenar e arquivar', href: '/gestao/funcoes' },
  { icon: 'calendar', label: 'Tipos de culto', subtitle: 'Dia, horário e local padrão', href: '/gestao/tipos' },
  { icon: 'unavailable', label: 'Indisponibilidades', subtitle: 'Quem não pode, mês a mês', href: '/gestao/indisponibilidades' },
  { icon: 'edit', label: 'Ministério', subtitle: 'Nome, logo, local e dias de culto', href: '/gestao/ministerio' },
] as const;

// Gestão do ministério (5.10, só líderes). No computador, os atalhos ficam em grade.
export default function Gestao() {
  const isLeader = useActiveMembership()?.role === 'leader';
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
});
