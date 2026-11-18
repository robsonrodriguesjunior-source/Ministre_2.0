import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Text } from '@/components/ui';
import { space } from '@/theme/tokens';

export type LegalSection = { title: string; body: string[] };

type Props = { title: string; updated: string; intro: string; sections: LegalSection[]; other: { label: string; href: '/termos' | '/privacidade' } };

// Página de texto (Termos e Privacidade): título, data da versão e seções curtas.
export function LegalPage({ title, updated, intro, sections, other }: Props) {
  return (
    <FormScreen title={title}>
      <View style={styles.wrap}>
        <Text variant="meta" color="dim">
          Versão de {updated}
        </Text>
        <Text variant="body" color="inkSoft">
          {intro}
        </Text>
        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text variant="sectionTitle" accessibilityRole="header">
              {s.title}
            </Text>
            {s.body.map((p, i) => (
              <Text key={i} variant="bodySm" color="inkSoft">
                {p}
              </Text>
            ))}
          </View>
        ))}
        <Text variant="link" color="orangeText" accessibilityRole="link" onPress={() => router.push(other.href)} style={styles.other}>
          {other.label}
        </Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  section: { gap: space.sm },
  other: { marginTop: space.sm },
});
