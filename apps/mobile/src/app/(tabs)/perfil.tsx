import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoSheet } from '@/components/PhotoSheet';
import { Avatar, Card, Chip, Icon, MenuRow, Pill, Screen, SectionHeader, Text } from '@/components/ui';
import { appVersion } from '@/lib/appVersion';
import { manageKeys, meApi } from '@/features/manage/api';
import { useActiveMembership, useSession } from '@/stores/session';
import { colors, radius, space } from '@/theme/tokens';

// Perfil (5.10): foto, dados, funções, números do ano, atalhos, gestão (líder) e conta.
export default function PerfilScreen() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const memberships = useSession((s) => s.memberships);
  const setActiveMinistry = useSession((s) => s.setActiveMinistry);
  const signOut = useSession((s) => s.signOut);
  const active = useActiveMembership();
  const isLeader = active?.role === 'leader';
  const [photoOpen, setPhotoOpen] = useState(false);

  const stats = useQuery({ queryKey: [...manageKeys.stats, active?.ministry.id], queryFn: meApi.stats, enabled: !!active });
  const s = stats.data?.data;
  const statsText = s
    ? [
        `${s.events} ${s.events === 1 ? 'escala' : 'escalas'} em ${s.year}`,
        s.confirmed_rate !== null ? `${s.confirmed_rate}% de presença confirmada` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <Screen refreshing={stats.isRefetching} onRefresh={() => stats.refetch()}>
      <Text variant="screenTitle" accessibilityRole="header">
        Perfil
      </Text>

      <View style={styles.who}>
        <Pressable onPress={() => setPhotoOpen(true)} accessibilityRole="button" accessibilityLabel="Trocar foto de perfil" style={styles.photo}>
          <Avatar name={user?.name ?? '?'} photoUrl={user?.avatar_url} seed={user?.id} size={72} />
          <View style={styles.camera}>
            <Icon name="edit" size={14} color={colors.onOrange} strokeWidth={2.4} />
          </View>
        </Pressable>
        <View style={styles.flex}>
          <Text variant="cardTitle">{user?.name}</Text>
          <Text variant="meta" color="dim">
            {user?.email}
          </Text>
          {!!user?.phone && (
            <Text variant="meta" color="dim">
              {user.phone}
            </Text>
          )}
        </View>
      </View>

      {active && (
        <Card>
          <View style={styles.between}>
            <Text variant="cardLabel" color="orangeText">
              Ministério
            </Text>
            <Pill label={isLeader ? 'Líder' : 'Membro'} tone={isLeader ? 'ok' : 'wait'} />
          </View>
          <View style={styles.ministry}>
            {!!active.ministry.logo_url && <Avatar name={active.ministry.name} photoUrl={active.ministry.logo_url} size={40} />}
            <View style={styles.flex}>
              <Text variant="cardTitle">{active.ministry.name}</Text>
              <Text variant="bodySm" color="inkSoft">
                {active.church.name}
                {active.church.city ? ` · ${active.church.city}` : ''}
              </Text>
            </View>
          </View>
          <Text variant="meta" color="dim" style={styles.positions}>
            {active.positions.length ? `Minhas funções: ${active.positions.map((p) => p.name).join(', ')}` : 'Sem função definida ainda.'}
          </Text>
          {!!statsText && (
            <Text variant="meta" color="inkSoft" style={styles.stats}>
              {statsText}
            </Text>
          )}
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

      {isLeader && (
        <>
          <SectionHeader title="Liderança" />
          <MenuRow icon="list" label="Gestão do ministério" subtitle="Membros, convites e indisponibilidades" onPress={() => router.push('/gestao')} />
          <MenuRow icon="sliders" label="Configurações" subtitle="Funções (Cantor, Bateria…) e dados do ministério" onPress={() => router.push('/configuracoes')} divider={false} />
        </>
      )}

      <SectionHeader title="Minha conta" />
      <View>
        <MenuRow icon="user" label="Meus dados" subtitle="Nome e celular" onPress={() => router.push('/perfil/dados')} />
        <MenuRow icon="bell" label="Notificações" subtitle="O que chega no celular" onPress={() => router.push('/ajustes-notificacoes')} />
        <MenuRow icon="unavailable" label="Indisponibilidade" subtitle="Dias em que não posso servir" onPress={() => router.push('/indisponibilidade')} />
        <MenuRow icon="plus" label="Entrar em outro ministério" subtitle="Com um código ou link de convite" onPress={() => router.push('/convite')} />
        <MenuRow icon="list" label="Termos e Privacidade" onPress={() => router.push('/termos')} />
        <MenuRow icon="back" label="Sair" onPress={signOut} />
        <MenuRow icon="close" label="Excluir minha conta" onPress={() => router.push('/perfil/excluir')} danger divider={false} />
      </View>

      {/* Para conferir qual versão está aberta (suporte). */}
      <Text variant="meta" color="dim" style={styles.version}>
        Ministre · versão {appVersion()}
      </Text>

      <PhotoSheet
        visible={photoOpen}
        onClose={() => setPhotoOpen(false)}
        title="Foto de perfil"
        onUpload={async (form) => setUser((await meApi.avatar(form)).data)}
        onRemove={user?.avatar_url ? async () => setUser((await meApi.removeAvatar()).data) : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  version: { textAlign: 'center', marginTop: space.xl, marginBottom: space.lg },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginVertical: space.xl },
  photo: { position: 'relative' },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: radius.round,
    backgroundColor: colors.orange,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ministry: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  positions: { marginTop: space.md },
  stats: { marginTop: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
