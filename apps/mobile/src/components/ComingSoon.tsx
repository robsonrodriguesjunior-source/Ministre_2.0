import { router } from 'expo-router';

import { EmptyState, type IconName, Screen, Text } from '@/components/ui';

type Props = { title: string; icon: IconName; stage: string };

// Tela provisória das abas enquanto as telas de verdade não chegam (etapas 3 a 6).
export function ComingSoon({ title, icon, stage }: Props) {
  return (
    <Screen>
      <Text variant="screenTitle" accessibilityRole="header">
        {title}
      </Text>
      <EmptyState
        icon={icon}
        message={`Esta tela chega na ${stage}.`}
        actionLabel="Ver catálogo de componentes"
        onAction={() => router.push('/_catalogo')}
      />
    </Screen>
  );
}
