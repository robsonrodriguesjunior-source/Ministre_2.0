import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Avatar, BottomSheet, Button, Card, EmptyState, IconButton, Pill, Skeleton, Text, Toast } from '@/components/ui';
import { type Announcement, notificationKeys, notificationsApi } from '@/features/notifications/api';
import { ago } from '@/lib/dates';
import { useActiveMembership } from '@/stores/session';
import { space } from '@/theme/tokens';

function Item({ item, onMenu }: { item: Announcement; onMenu: () => void }) {
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Avatar name={item.author?.name ?? 'Líder'} photoUrl={item.author?.avatar_url} seed={item.author?.id} size={34} />
        <View style={styles.flex}>
          <Text variant="listName">{item.author?.name ?? 'Líder'}</Text>
          <Text variant="meta" color="dim">
            {ago(new Date(item.created_at))}
          </Text>
        </View>
        {item.pinned && <Pill label="Fixado" tone="ok" />}
        {item.can_manage && <IconButton icon="more" label={`Opções do aviso ${item.title}`} onPress={onMenu} />}
      </View>
      <Text variant="tileTitle" style={styles.title}>
        {item.title}
      </Text>
      <Text variant="body" color="inkSoft">
        {item.body}
      </Text>
      {!!item.reads && (
        <Text variant="meta" color="tabInactive" style={styles.reads}>
          Lido por {item.reads.count} de {item.reads.total}
        </Text>
      )}
    </Card>
  );
}

// Avisos (5.9): o líder fala com a equipe. Abrir esta tela marca tudo como lido.
export default function Avisos() {
  const qc = useQueryClient();
  const isLeader = useActiveMembership()?.role === 'leader';
  const list = useQuery({ queryKey: notificationKeys.announcements, queryFn: notificationsApi.announcements });
  const [menuFor, setMenuFor] = useState<Announcement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const items = list.data?.data ?? [];

  useEffect(() => {
    notificationsApi
      .readAnnouncements()
      .then(() => {
        qc.invalidateQueries({ queryKey: ['home'] });
        qc.invalidateQueries({ queryKey: notificationKeys.bell });
      })
      .catch(() => undefined);
  }, [qc]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: notificationKeys.announcements });
    qc.invalidateQueries({ queryKey: ['home'] });
  };
  const pin = useMutation({
    mutationFn: (a: Announcement) => notificationsApi.updateAnnouncement(a.id, { pinned: !a.pinned }),
    onSuccess: (r) => {
      setToast(r.data.pinned ? 'Aviso fixado no topo.' : 'Aviso desafixado.');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (a: Announcement) => notificationsApi.removeAnnouncement(a.id),
    onSuccess: (r) => {
      setConfirmDelete(null);
      setToast(r.message);
      refresh();
    },
  });

  return (
    <>
      <FormScreen
        title="Avisos"
        action={isLeader ? <IconButton icon="plus" label="Novo aviso" onPress={() => router.push('/aviso/novo')} /> : undefined}
      >
        {list.isLoading ? (
          <View style={styles.list}>
            <Skeleton height={120} />
            <Skeleton height={120} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="megaphone"
            message={list.isError ? 'Não foi possível carregar agora.' : 'Nenhum aviso ainda.'}
            actionLabel={isLeader ? 'Escrever um aviso' : undefined}
            onAction={() => router.push('/aviso/novo')}
          />
        ) : (
          <View style={styles.list}>
            {items.map((a) => (
              <Item key={a.id} item={a} onMenu={() => setMenuFor(a)} />
            ))}
          </View>
        )}
      </FormScreen>

      <Toast message={toast} onHide={() => setToast(null)} />

      <BottomSheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.title}>
        <View style={styles.sheetActions}>
          <Button
            label={menuFor?.pinned ? 'Desafixar' : 'Fixar no topo'}
            variant="secondary"
            onPress={() => {
              if (menuFor) pin.mutate(menuFor);
              setMenuFor(null);
            }}
          />
          <Button
            label="Editar"
            variant="secondary"
            onPress={() => {
              if (menuFor) router.push({ pathname: '/aviso/novo', params: { id: String(menuFor.id) } });
              setMenuFor(null);
            }}
          />
          <Button
            label="Apagar"
            variant="secondary"
            onPress={() => {
              setConfirmDelete(menuFor);
              setMenuFor(null);
            }}
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Apagar este aviso?">
        <Text variant="bodySm" color="inkSoft">
          Ele some para toda a equipe.
        </Text>
        <View style={styles.sheetActions}>
          <Button label="Apagar" onPress={() => confirmDelete && remove.mutate(confirmDelete)} loading={remove.isPending} />
          <Button label="Cancelar" variant="secondary" onPress={() => setConfirmDelete(null)} />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space.md },
  card: { gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { marginTop: space.md },
  reads: { marginTop: space.md },
  sheetActions: { gap: space.sm, marginTop: space.lg },
});
