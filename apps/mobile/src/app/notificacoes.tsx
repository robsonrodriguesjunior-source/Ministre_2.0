import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { EmptyState, Icon, type IconName, Skeleton, Text } from '@/components/ui';
import { type BellItem, notificationKeys, notificationsApi } from '@/features/notifications/api';
import { PushCard } from '@/features/notifications/PushCard';
import { ago } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

const ICONS: Record<string, IconName> = {
  scheduled: 'calendar',
  minister: 'star',
  changed: 'calendar',
  removed: 'unavailable',
  cancelled: 'unavailable',
  declined: 'unavailable',
  reminder: 'clock',
  day_reminder: 'clock',
  announcement: 'megaphone',
  weekly: 'list',
};

function Row({ item, onPress, divider }: { item: BellItem; onPress: () => void; divider: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : 'Nova: '}${item.title}. ${item.body ?? ''}`}
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && styles.pressed]}
    >
      <View style={[styles.icon, !item.read && styles.iconUnread]}>
        <Icon name={ICONS[item.type] ?? 'bell'} size={18} color={item.read ? colors.dim : colors.orange} />
      </View>
      <View style={styles.flex}>
        <Text variant="listName" color={item.read ? 'inkSoft' : 'ink'}>
          {item.title}
        </Text>
        {!!item.body && (
          <Text variant="meta" color="dim" numberOfLines={2}>
            {item.body}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text variant="meta" color="tabInactive">
          {ago(new Date(item.created_at))}
        </Text>
        {!item.read && <View style={styles.dot} accessibilityElementsHidden />}
      </View>
    </Pressable>
  );
}

// Sino (5.9): tudo o que aconteceu com você no ministério. Tocar leva para a tela certa.
export default function Notificacoes() {
  const qc = useQueryClient();
  const bell = useQuery({ queryKey: notificationKeys.bell, queryFn: notificationsApi.bell });
  const items = bell.data?.data ?? [];
  const unread = bell.data?.unread ?? 0;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: notificationKeys.bell });
    qc.invalidateQueries({ queryKey: ['home'] });
  };
  const readAll = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: refresh });

  const open = (item: BellItem) => {
    if (!item.read) notificationsApi.readOne(item.id).then(refresh).catch(() => undefined);
    if (item.route) router.push(item.route as Href);
  };

  return (
    <FormScreen
      title="Notificações"
      action={
        unread > 0 ? (
          <Pressable onPress={() => readAll.mutate()} accessibilityRole="button" hitSlop={8} style={styles.action}>
            <Text variant="link" color="orangeText">
              Ler todas
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      <PushCard compact />

      {bell.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          message={bell.isError ? 'Não foi possível carregar agora.' : 'Nada por aqui ainda. Quando você for escalado ou o líder mandar um aviso, aparece aqui.'}
        />
      ) : (
        <View>
          {unread > 0 && (
            <Text variant="fieldLabel" color="tabInactive" style={styles.count}>
              {unread === 1 ? '1 nova' : `${unread} novas`}
            </Text>
          )}
          {items.map((item, i) => (
            <Row key={item.id} item={item} onPress={() => open(item)} divider={i < items.length - 1} />
          ))}
        </View>
      )}

      <Pressable onPress={() => router.push('/ajustes-notificacoes')} accessibilityRole="button" style={styles.prefs}>
        <Text variant="link" color="orangeText">
          Escolher o que chega no celular
        </Text>
      </Pressable>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  action: { minHeight: size.iconButton, justifyContent: 'center' },
  loading: { gap: space.md },
  count: { marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { opacity: 0.7 },
  icon: {
    width: size.avatarList,
    height: size.avatarList,
    borderRadius: radius.round,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnread: { backgroundColor: colors.orangeSoft },
  right: { alignItems: 'flex-end', gap: 6 },
  dot: { width: size.notifyDot, height: size.notifyDot, borderRadius: radius.round, backgroundColor: colors.orange },
  prefs: { alignSelf: 'center', minHeight: size.touch, justifyContent: 'center' },
});
