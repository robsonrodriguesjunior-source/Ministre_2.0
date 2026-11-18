import { router } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Card, EmptyState, MenuRow, Text } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { useActiveMembership } from '@/stores/session';
import { space } from '@/theme/tokens';

// Configurações do ministério (só líderes): o que define como o ministério funciona.
// O que é sobre pessoas (membros, convites, indisponibilidades) fica na Gestão.
const ITEMS = [
  { icon: 'music', label: 'Funções', subtitle: 'Cantor, Bateria, Violão, Mesa de Som… criar, renomear, ordenar e arquivar', href: '/configuracoes/funcoes' },
  { icon: 'edit', label: 'Ministério', subtitle: 'Nome, logo, local e dias de culto', href: '/configuracoes/ministerio' },
] as const;

export default function Configuracoes() {
  const membership = useActiveMembership();
  const isLeader = membership?.role === 'leader';
  const wide = useWindowDimensions().width >= 760;

  if (!isLeader) {
    return (
      <FormScreen title="Configurações">
        <EmptyState icon="sliders" message="Só líderes do ministério acessam as configurações." actionLabel="Voltar" onAction={() => goBack('/perfil')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Configurações">
      <Text variant="bodySm" color="dim">
        {membership?.ministry.name}: as funções que as pessoas exercem nas escalas e os dados do ministério.
      </Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '45%', flexGrow: 1, minWidth: 260, paddingVertical: space.xs },
});
