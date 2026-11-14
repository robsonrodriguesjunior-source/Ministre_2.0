import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/FormScreen';
import { Button, Card, Notice, Text, TextField } from '@/components/ui';
import { meApi } from '@/features/manage/api';
import { ApiError } from '@/lib/api';
import { useSession } from '@/stores/session';
import { space } from '@/theme/tokens';

const WORD = 'EXCLUIR';

// Excluir minha conta (Apple e LGPD): confirma digitando EXCLUIR.
export default function ExcluirConta() {
  const signOut = useSession((s) => s.signOut);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await meApi.remove(typed.trim());
      await signOut();
    } catch (e) {
      setError(e instanceof ApiError ? (e.field('confirm') ?? e.message) : 'Não foi possível excluir agora. Tente de novo.');
      setBusy(false);
    }
  };

  return (
    <FormScreen
      title="Excluir conta"
      question="Excluir sua conta?"
      subtitle="Isso não tem volta."
      footer={
        <>
          {!!error && <Notice tone="error" message={error} />}
          <Button label="Excluir minha conta" onPress={remove} loading={busy} disabled={typed.trim() !== WORD} />
        </>
      }
    >
      <Card style={styles.card}>
        <Text variant="bodySm" color="inkSoft">
          • Seu nome, e-mail, celular e foto são apagados.
        </Text>
        <Text variant="bodySm" color="inkSoft">
          • Você sai de todos os ministérios e das escalas que ainda vão acontecer.
        </Text>
        <Text variant="bodySm" color="inkSoft">
          • As escalas passadas continuam na história do ministério, mas como “Pessoa removida”.
        </Text>
      </Card>
      <View>
        <TextField
          label={`Para confirmar, digite ${WORD}`}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={WORD}
        />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
});
