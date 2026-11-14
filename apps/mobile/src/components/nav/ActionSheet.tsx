import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, space } from '@/theme/tokens';

export type QuickActionId = 'new-event' | 'new-announcement' | 'unavailable' | 'new-song' | 'my-events';

type Tile = { id: QuickActionId; icon: IconName; title: string; subtitle: string };

// Ações do botão +, conforme o papel (seção 4 da especificação).
const LEADER: Tile[] = [
  { id: 'new-event', icon: 'calendar', title: 'Nova escala', subtitle: 'Montar o próximo culto' },
  { id: 'new-announcement', icon: 'megaphone', title: 'Novo aviso', subtitle: 'Falar com a equipe' },
  { id: 'unavailable', icon: 'unavailable', title: 'Não posso ir', subtitle: 'Marcar indisponibilidade' },
  { id: 'new-song', icon: 'music', title: 'Nova música', subtitle: 'Adicionar ao repertório' },
];
const MEMBER: Tile[] = [
  { id: 'unavailable', icon: 'unavailable', title: 'Não posso ir', subtitle: 'Marcar indisponibilidade' },
  { id: 'my-events', icon: 'calendar', title: 'Minhas escalas', subtitle: 'Ver onde estou escalado' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  role: 'leader' | 'member';
  onSelect: (id: QuickActionId) => void;
};

// Painel "O que você quer fazer?": cartões em grade de 2 colunas (raio 22, borda `line`, ícone laranja).
export function ActionSheet({ visible, onClose, role, onSelect }: Props) {
  const tiles = role === 'leader' ? LEADER : MEMBER;
  return (
    <BottomSheet visible={visible} onClose={onClose} title="O que você quer fazer?">
      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t.id)}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}. ${t.subtitle}`}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <Icon name={t.icon} size={24} color={colors.orange} />
            </View>
            <Text variant="tileTitle">{t.title}</Text>
            <Text variant="tileSub" color="dim">
              {t.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 3,
  },
  pressed: {
    borderColor: colors.orange,
  },
  icon: {
    marginBottom: space.sm,
  },
});
