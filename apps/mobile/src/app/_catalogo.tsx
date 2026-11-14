import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Avatar,
  AvatarStack,
  BottomSheet,
  Button,
  Card,
  DateBadge,
  EmptyState,
  EventRow,
  Icon,
  IconButton,
  ListRow,
  Pill,
  QuickAction,
  Screen,
  SectionHeader,
  Segmented,
  Skeleton,
  Text,
  WeekStrip,
} from '@/components/ui';
import { API_URL, getHealth } from '@/lib/api';
import { colors, space } from '@/theme/tokens';

// Catálogo interno (/_catalogo): todos os componentes da seção 3.3 com os dados de exemplo do design,
// para conferir com docs/design/telas-direcoes.html. Não aparece para o usuário final.

const TEAM = [
  { id: 2, name: 'Pr. Daniel' },
  { id: 3, name: 'Ana Lima' },
  { id: 5, name: 'João Pedro' },
  { id: 6, name: 'Marina Costa' },
  { id: 7, name: 'Lucas Rocha' },
];

function weekOf(day: Date) {
  const start = new Date(day);
  const offset = (start.getDay() + 6) % 7; // semana começa na segunda
  start.setDate(start.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function Catalogo() {
  const [confirmed, setConfirmed] = useState(false);
  const [tab, setTab] = useState<'equipe' | 'repertorio' | 'roteiro'>('equipe');
  const sunday = useMemo(() => new Date(2026, 9, 25), []);
  const [selected, setSelected] = useState(sunday);
  const week = useMemo(() => weekOf(sunday), [sunday]);
  const [sheet, setSheet] = useState(false);
  const [api, setApi] = useState('Verificando…');

  useEffect(() => {
    let active = true;
    getHealth()
      .then((h) => active && setApi(h.database === 'ok' ? '✓ API no ar · banco ok' : 'API no ar · banco com erro'))
      .catch(() => active && setApi('Sem conexão com a API'));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen bottomInset={space.xxl * 2}>
      <View style={styles.bar}>
        <IconButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text variant="barTitle">Catálogo</Text>
        <View style={styles.barSpacer} />
      </View>

      <SectionHeader title="Cabeçalho do Início" />
      <View style={styles.hello}>
        <Avatar name="Marcos" seed={1} size={40} />
        <View>
          <Text variant="meta" color="dim">
            Boa noite,
          </Text>
          <Text variant="greetingName">Marcos</Text>
        </View>
        <View style={styles.push} />
        <IconButton icon="bell" label="Notificações" badge />
      </View>

      <SectionHeader title="Card · Próximo culto" />
      <Card>
        <View style={styles.between}>
          <Text variant="cardLabel" color="orange">
            Próximo culto
          </Text>
          <Pill label="em 6 dias" tone="wait" />
        </View>
        <Text variant="cardTitle" style={styles.cardTitle}>
          Culto da Família
        </Text>
        <View style={styles.meta}>
          <Icon name="calendar" size={16} color={colors.dim} />
          <Text variant="bodySm" color="inkSoft">
            Domingo, 25 de outubro · 19h00
          </Text>
        </View>
        <View style={styles.meta}>
          <Icon name="music" size={16} color={colors.dim} />
          <Text variant="bodySm" color="inkSoft">
            Você: Violão
          </Text>
        </View>
        <View style={styles.hr} />
        <View style={styles.between}>
          <AvatarStack people={TEAM.map((p) => ({ name: p.name, seed: p.id }))} />
          <Text variant="meta" color="dim">
            7 pessoas na equipe
          </Text>
        </View>
        <View style={styles.buttons}>
          <Button
            label="Confirmar"
            confirmed={confirmed}
            confirmedLabel="Confirmado"
            onPress={() => setConfirmed(true)}
            style={styles.btnWide}
          />
          <Button
            label={confirmed ? 'Desfazer' : 'Não posso'}
            variant="secondary"
            onPress={() => setConfirmed(false)}
            style={styles.btnNarrow}
          />
        </View>
      </Card>

      <SectionHeader title="QuickAction" />
      <View style={styles.quick}>
        <QuickAction icon="calendar" label="Escalas" />
        <QuickAction icon="music" label="Músicas" />
        <QuickAction icon="megaphone" label="Avisos" />
        <QuickAction icon="unavailable" label="Indisponível" />
      </View>

      <SectionHeader title="Último aviso" actionLabel="Ver todos" />
      <View style={styles.note}>
        <Avatar name="Pr. Daniel" seed={2} size={34} />
        <View style={styles.flex}>
          <Text variant="bodySm" style={styles.bold}>
            Pr. Daniel
          </Text>
          <Text variant="meta" color="inkSoft">
            Chegar 30 minutos antes no domingo.
          </Text>
        </View>
        <Text variant="pill" color="dim">
          2 h
        </Text>
      </View>

      <SectionHeader title="DateBadge + Segmented" />
      <View style={styles.header}>
        <DateBadge date={sunday} />
        <View>
          <Text variant="headerTitle">Culto da Família</Text>
          <Text variant="meta" color="dim">
            Domingo · 19h00 · Templo
          </Text>
        </View>
      </View>
      <View style={styles.gapTop}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'equipe', label: 'Equipe' },
            { value: 'repertorio', label: 'Repertório' },
            { value: 'roteiro', label: 'Roteiro' },
          ]}
        />
      </View>

      <SectionHeader title="ListRow + Pill" />
      <ListRow name="Pr. Daniel" subtitle="Ministro" seed={2} right={<Pill label="Confirmado" tone="ok" />} />
      <ListRow name="Ana Lima" subtitle="Vocal" seed={3} right={<Pill label="Confirmado" tone="ok" />} />
      <ListRow name="Marcos (você)" subtitle="Violão" seed={1} right={<Pill label="Pendente" tone="wait" />} />
      <ListRow name="Lucas Rocha" subtitle="Bateria" seed={7} right={<Pill label="Não pode" tone="declined" />} />

      <SectionHeader title="WeekStrip" />
      <Text variant="screenTitle">Agenda</Text>
      <View style={[styles.between, styles.gapTopSm]}>
        <Text variant="body" color="inkSoft">
          Outubro 2026
        </Text>
        <View style={styles.arrows}>
          <Icon name="back" color={colors.dim} />
          <Icon name="forward" color={colors.dim} />
        </View>
      </View>
      <View style={styles.gapTop}>
        <WeekStrip
          days={week}
          selected={selected}
          onSelect={setSelected}
          hasEvent={(d) => d.getDay() === 6 || d.getDay() === 0}
        />
      </View>

      <SectionHeader title="Esta semana" actionLabel="Indisponibilidade" />
      <View style={styles.list}>
        <EventRow date={new Date(2026, 9, 24)} title="Ensaio geral" subtitle="16h00 · Templo" />
        <EventRow
          date={sunday}
          title="Culto da Família"
          subtitle="19h00 · Violão"
          mine
          right={<Pill label="Pendente" tone="wait" />}
        />
        <EventRow date={new Date(2026, 9, 28)} title="Culto de Oração" subtitle="Você não está escalado" dimmed />
      </View>

      <SectionHeader title="BottomSheet" />
      <Button label="Abrir painel" variant="secondary" onPress={() => setSheet(true)} />

      <SectionHeader title="Skeleton (carregando)" />
      <View style={styles.list}>
        <Skeleton height={120} rounded={22} />
        <Skeleton height={14} width="60%" />
        <Skeleton height={14} width="40%" />
      </View>

      <SectionHeader title="EmptyState" />
      <Card>
        <EmptyState icon="calendar" message="Você não está em nenhuma escala por enquanto." actionLabel="Ver agenda" />
      </Card>

      <SectionHeader title="Conexão" />
      <Card>
        <Text variant="cardLabel" color="orange">
          API
        </Text>
        <Text variant="body" color="inkSoft" style={styles.gapTopSm}>
          {api}
        </Text>
        <Text variant="meta" color="dim">
          {API_URL || '(sem endereço)'}
        </Text>
      </Card>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Não posso ir">
        <Text variant="body" color="inkSoft">
          Exemplo do painel. Na Etapa 3 ele pede o motivo: Viagem, Trabalho, Saúde ou Outro.
        </Text>
        <View style={styles.gapTop}>
          <Button label="Fechar" onPress={() => setSheet(false)} />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  push: { flex: 1 },
  bold: { fontFamily: 'Figtree_700Bold' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barSpacer: { width: 38 },
  hello: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { marginVertical: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  hr: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
  buttons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  btnWide: { flex: 1.3 },
  btnNarrow: { flex: 1 },
  quick: { flexDirection: 'row', gap: space.sm },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: space.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gapTop: { marginTop: space.lg },
  gapTopSm: { marginTop: space.sm },
  arrows: { flexDirection: 'row', gap: 14 },
  list: { gap: space.sm },
});
