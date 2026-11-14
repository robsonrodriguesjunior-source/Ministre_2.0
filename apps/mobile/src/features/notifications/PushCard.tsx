import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Text } from '@/components/ui';
import { disablePush, enablePush, type PushStatus, pushStatus, sendTestPush } from '@/lib/push';
import { colors, space } from '@/theme/tokens';

const TEXT: Record<PushStatus, { title: string; body: string }> = {
  on: { title: 'Avisos ligados neste celular', body: 'Escalas, lembretes e avisos do líder chegam aqui, mesmo com o app fechado.' },
  off: { title: 'Receba os avisos no celular', body: 'Saiba na hora quando for escalado, quando faltar confirmar e quando o líder mandar um aviso.' },
  blocked: {
    title: 'Os avisos estão bloqueados',
    body: 'Para liberar, abra os Ajustes do celular › Notificações › Ministre e ative "Permitir Notificações".',
  },
  'needs-install': {
    title: 'Adicione o Ministre à Tela de Início',
    body: 'No iPhone, os avisos só chegam pelo app da Tela de Início: toque em Compartilhar › "Adicionar à Tela de Início" e abra o Ministre por lá.',
  },
  unsupported: { title: 'Este navegador não recebe avisos', body: 'Use o app pelo celular, adicionado à Tela de Início.' },
};

type Props = {
  /** No sino: só aparece quando dá para fazer alguma coisa (some quando já está ligado). */
  compact?: boolean;
};

// Ligar, testar e desligar os avisos neste celular (5.9).
export function PushCard({ compact = false }: Props) {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['push-status'], queryFn: pushStatus, networkMode: 'always' });
  const [busy, setBusy] = useState<'enable' | 'test' | 'disable' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const current = status.data;
  // No sino, some quando já está ligado — mas não logo depois de ligar, para a pessoa ver o "Pronto!".
  if (!current || (compact && !message && (current === 'on' || current === 'unsupported'))) return null;

  const run = async (kind: 'enable' | 'test' | 'disable') => {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === 'test') {
        setMessage((await sendTestPush()).message);
      } else {
        const next = kind === 'enable' ? await enablePush() : await disablePush();
        qc.setQueryData(['push-status'], next);
        if (kind === 'enable' && next === 'on') setMessage('Pronto! Os avisos vão chegar neste celular.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível agora. Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  const text = TEXT[current];
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Icon name="bell" color={current === 'on' ? colors.orange : colors.dim} />
        <Text variant="tileTitle" style={styles.flex}>
          {text.title}
        </Text>
      </View>
      <Text variant="bodySm" color="inkSoft">
        {text.body}
      </Text>
      {current === 'off' && <Button label="Ativar avisos" onPress={() => run('enable')} loading={busy === 'enable'} />}
      {current === 'on' && (
        <View style={styles.row}>
          <Button label="Enviar teste" variant="secondary" onPress={() => run('test')} loading={busy === 'test'} style={styles.flex} />
          <Button label="Desligar" variant="secondary" onPress={() => run('disable')} loading={busy === 'disable'} style={styles.flex} />
        </View>
      )}
      {!!message && (
        <Text variant="meta" color="dim" accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
});
