import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon, Text, TextField } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

import { songsApi } from './api';
import { PLATFORM } from './ListenButtons';
import type { SongLookup } from './types';

const looksLikeLink = (text: string) => /(youtube\.com|youtu\.be|spotify\.(com|link)|deezer\.(com|page\.link)|link\.deezer\.com)\//i.test(text);

type Props = {
  /** Chamado quando o link foi lido: preencha título, cantor, letra… (tudo continua editável). */
  onResult: (data: SongLookup) => void;
  autoFocus?: boolean;
};

// "Cole o link da música": ao colar um link do YouTube, Spotify ou Deezer, busca título, cantor e letra sozinho.
export function LinkImport({ onResult, autoFocus }: Props) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const last = useRef('');

  useEffect(() => {
    const text = url.trim();
    if (!looksLikeLink(text) || text === last.current) return;
    const timer = setTimeout(async () => {
      last.current = text;
      setStatus('loading');
      setMessage(null);
      try {
        const { data } = await songsApi.lookup(text);
        const found = [data.title, data.artist].filter(Boolean).join(' — ');
        setStatus('done');
        setMessage(
          `Encontramos no ${PLATFORM[data.source]}: ${found || 'música'}.` +
            (data.lyrics ? ' A letra veio junto.' : ' A letra não foi encontrada; você pode colar abaixo.'),
        );
        onResult(data);
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof ApiError ? (e.field('url') ?? e.message) : 'Não foi possível ler o link agora. Preencha à mão.');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [url, onResult]);

  return (
    <View style={styles.wrap}>
      <TextField
        label="Link da música"
        value={url}
        onChangeText={setUrl}
        placeholder="Cole o link do YouTube, Spotify ou Deezer"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        autoFocus={autoFocus}
        hint={status === 'idle' ? 'O título, o cantor e a letra são preenchidos sozinhos. Você pode mudar tudo depois.' : undefined}
      />
      {status === 'loading' && (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.orange} />
          <Text variant="meta" color="dim">
            Lendo o link…
          </Text>
        </View>
      )}
      {!!message && status !== 'loading' && (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Icon name={status === 'done' ? 'check' : 'unavailable'} size={16} color={status === 'done' ? colors.orange : colors.dim} strokeWidth={2.4} />
          <Text variant="meta" color={status === 'done' ? 'inkSoft' : 'orange'} style={styles.flex}>
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex: { flex: 1 },
});
