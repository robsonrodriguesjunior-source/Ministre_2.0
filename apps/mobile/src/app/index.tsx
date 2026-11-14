import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL, getHealth, type Health } from '@/lib/api';
import { colors } from '@/theme/tokens';

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string };

// Etapa 0: tela provisória que só confirma que o app abre e fala com a API.
export default function HomeScreen() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((health) => active && setState({ kind: 'ok', health }))
      .catch((error: unknown) => {
        if (active) {
          setState({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const check = useCallback(() => {
    setState({ kind: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Text style={styles.logo}>
          Minis<Text style={styles.logoAccent}>tre</Text>
        </Text>
        <Text style={styles.tagline}>As escalas do seu ministério, em ordem.</Text>
      </View>

      <Pressable
        onPress={check}
        accessibilityRole="button"
        accessibilityLabel="Testar conexão com a API"
        style={styles.status}
      >
        <Text style={styles.statusLabel}>CONEXÃO COM A API</Text>
        {state.kind === 'loading' && <Text style={styles.statusText}>Verificando…</Text>}
        {state.kind === 'ok' && (
          <Text style={styles.statusText}>
            ✓ API no ar · banco {state.health.database === 'ok' ? 'ok' : 'com erro'}
          </Text>
        )}
        {state.kind === 'error' && (
          <Text style={styles.statusText}>Sem conexão ({state.message}). Toque para tentar de novo.</Text>
        )}
        <Text style={styles.statusUrl}>{API_URL || '(sem endereço)'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoAccent: {
    color: colors.orange,
  },
  tagline: {
    color: colors.dim,
    fontSize: 14.5,
    textAlign: 'center',
  },
  status: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
    gap: 6,
  },
  statusLabel: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  statusText: {
    color: colors.inkSoft,
    fontSize: 14.5,
  },
  statusUrl: {
    color: colors.dim,
    fontSize: 12.5,
  },
});
