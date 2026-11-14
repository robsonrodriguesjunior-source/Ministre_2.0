import { useQuery } from '@tanstack/react-query';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BottomSheet, EmptyState, Icon, IconButton, KeyBadge, Skeleton, Text } from '@/components/ui';
import { songsApi } from '@/features/songs/api';
import { ChordSheet } from '@/features/songs/ChordSheet';
import { type Accidental, accidentalFor, semitonesBetween, transposeKey } from '@/features/songs/chordpro';
import { loadSpeeds, loadStageSet, saveSpeed, saveStageSet, stageKey } from '@/features/songs/offline';
import { SheetControls } from '@/features/songs/SheetControls';
import type { StageSet, StageSong } from '@/features/songs/types';
import { ApiError } from '@/lib/api';
import { lightTap } from '@/lib/haptics';
import { colors, radius, size, space } from '@/theme/tokens';

const DEFAULT_DURATION = 240; // segundos, quando a música não tem duração cadastrada
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;

type Loaded = { set: StageSet; offline: boolean };

/** Busca o repertório na internet e guarda no aparelho; sem internet, usa o que foi guardado. */
async function loadStage(eventId: number | null, songId: number | null, key: string | null): Promise<Loaded> {
  const cacheKey = stageKey({ eventId, songId });
  try {
    let set: StageSet;
    if (eventId) {
      set = { ...(await songsApi.stage(eventId)).data, saved_at: new Date().toISOString() };
    } else {
      const s = (await songsApi.get(songId!)).data;
      set = {
        event_id: null,
        title: s.title,
        starts_at: null,
        saved_at: new Date().toISOString(),
        songs: [{ song_id: s.id, title: s.title, artist: s.artist, key: key || s.original_key, original_key: s.original_key, bpm: s.bpm, duration_sec: s.duration_sec, chordpro: s.chordpro }],
      };
    }
    await saveStageSet(cacheKey, set);
    return { set, offline: false };
  } catch (e) {
    if (e instanceof ApiError && e.status !== 0) throw e; // sem permissão ou não existe: não usa cópia antiga
    const saved = await loadStageSet(cacheKey);
    if (saved) return { set: saved, offline: true };
    throw e;
  }
}

/** A tela não apaga enquanto o Modo Palco estiver aberto (no navegador, volta a pedir ao voltar para a aba). */
function useStageAwake() {
  useEffect(() => {
    const tag = 'ministre-palco';
    const on = () => activateKeepAwakeAsync(tag).catch(() => undefined);
    on();
    const web = Platform.OS === 'web' && typeof document !== 'undefined';
    const onVisible = () => document.visibilityState === 'visible' && on();
    if (web) document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (web) document.removeEventListener('visibilitychange', onVisible);
      deactivateKeepAwake(tag).catch(() => undefined);
    };
  }, []);
}

/** Degradê no alto e embaixo da letra. */
function Fade({ edge }: { edge: 'top' | 'bottom' }) {
  const id = `palco-fade-${edge}`;
  return (
    <View pointerEvents="none" style={[styles.fade, edge === 'top' ? styles.fadeTop : styles.fadeBottom]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.stageBg} stopOpacity={edge === 'top' ? 1 : 0} />
            <Stop offset="1" stopColor={colors.stageBg} stopOpacity={edge === 'top' ? 0 : 1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

type Transpose = { extra: number; accidental: Accidental | null };

/** Tom em que a música aparece: o tom da escala mais o que o músico subiu ou desceu. */
function keyOf(song: StageSong, t: Transpose | undefined) {
  const semitones = semitonesBetween(song.original_key, song.key) + (t?.extra ?? 0);
  const usual = transposeKey(song.original_key, semitones);
  const accidental = t?.accidental ?? (t?.extra ? accidentalFor(usual) : accidentalFor(song.key));
  return { semitones: ((semitones % 12) + 12) % 12, accidental, label: transposeKey(song.original_key, semitones, accidental) };
}

function Stage({ loaded, startIndex }: { loaded: Loaded; startIndex: number }) {
  const songs = loaded.set.songs;
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), songs.length - 1));
  const [pageWidth, setPageWidth] = useState(0);
  const [controls, setControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scale, setScale] = useState(1);
  const [lyricsOnly, setLyricsOnly] = useState(false);
  const [transpose, setTranspose] = useState<Record<number, Transpose>>({});
  const [speeds, setSpeeds] = useState<Record<string, number>>({});

  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const pages = useRef<(ComponentRef<typeof ScrollView> | null)[]>([]);
  const pos = useRef<number[]>([]); // posição da rolagem de cada música
  const metrics = useRef<{ content: number; view: number }[]>([]);
  const progress = useSharedValue(0);

  const song = songs[index];
  const key = keyOf(song, transpose[song.song_id]);
  const factor = speeds[String(song.song_id)] ?? 1;
  const next = songs[index + 1];

  useEffect(() => {
    loadSpeeds().then(setSpeeds);
  }, []);

  // Começa na música pedida (ex.: tocar a 2ª música da escala).
  useEffect(() => {
    if (pageWidth) pager.current?.scrollTo({ x: index * pageWidth, animated: false });
    // só quando a largura muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth]);

  const maxOf = (i: number) => Math.max(0, (metrics.current[i]?.content ?? 0) - (metrics.current[i]?.view ?? 0));
  const updateProgress = (i: number) => {
    const max = maxOf(i);
    progress.value = max > 0 ? Math.min(1, (pos.current[i] ?? 0) / max) : 0;
  };

  // Rolagem automática: a letra inteira passa no tempo da música, mais rápido ou mais devagar pelo ajuste.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = Date.now();
    const step = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      const max = maxOf(index);
      if (max <= 0) return setPlaying(false);
      const speed = (max / (song.duration_sec || DEFAULT_DURATION)) * factor;
      const y = Math.min(max, (pos.current[index] ?? 0) + speed * dt);
      pos.current[index] = y;
      pages.current[index]?.scrollTo({ y, animated: false });
      updateProgress(index);
      if (y >= max) return setPlaying(false);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, factor]);

  const goTo = (i: number) => {
    if (i < 0 || i >= songs.length) return;
    lightTap();
    setPlaying(false);
    setIndex(i);
    pager.current?.scrollTo({ x: i * pageWidth, animated: true });
    updateProgress(i);
  };

  const onSwipe = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / pageWidth);
    if (Math.abs(x - i * pageWidth) < 2 && i !== index && songs[i]) {
      setPlaying(false);
      setIndex(i);
      updateProgress(i);
    }
  };

  const onPageScroll = (i: number) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    // Só acompanha quando a pessoa arrastou (a rolagem automática anda em frações de pixel).
    if (Math.abs(y - (pos.current[i] ?? 0)) > 2) pos.current[i] = y;
    if (i === index) updateProgress(i);
  };

  const togglePlay = () => {
    lightTap();
    if (!playing && (pos.current[index] ?? 0) >= maxOf(index) - 1) {
      pos.current[index] = 0; // chegou ao fim: recomeça do alto
      pages.current[index]?.scrollTo({ y: 0, animated: false });
    }
    setPlaying((p) => !p);
  };

  const changeSpeed = (delta: number) => {
    const value = Math.round(Math.min(MAX_SPEED, Math.max(MIN_SPEED, factor + delta)) * 10) / 10;
    setSpeeds((s) => ({ ...s, [String(song.song_id)]: value }));
    saveSpeed(song.song_id, value);
  };

  const setSongTranspose = (patch: Partial<Transpose>) =>
    setTranspose((t) => ({ ...t, [song.song_id]: { ...(t[song.song_id] ?? { extra: 0, accidental: null }), ...patch } }));

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <>
      <View style={styles.top}>
        <Text variant="meta" color="tabInactive">
          {songs.length > 1 ? `${index + 1} de ${songs.length}` : loaded.offline ? 'Sem internet' : 'Modo Palco'}
        </Text>
        <View style={styles.badges}>
          <KeyBadge label={`Tom ${key.label}`} />
          {!!song.bpm && <KeyBadge label={`${song.bpm} bpm`} tone="line" />}
        </View>
        {controls ? (
          <View style={styles.topActions}>
            <IconButton icon="sliders" label="Tom e tamanho da letra" onPress={() => setMenu(true)} />
            <IconButton icon="close" label="Sair do Modo Palco" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
        ) : (
          <View style={styles.topActions} />
        )}
      </View>
      {loaded.offline && songs.length > 1 && (
        <Text variant="meta" color="tabInactive" style={styles.offline}>
          Sem internet · usando o repertório salvo no aparelho
        </Text>
      )}
      <Text variant="stageTitle" numberOfLines={2} style={styles.title} accessibilityRole="header">
        {song.title}
      </Text>

      <View style={styles.lyrics}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onSwipe}
          scrollEventThrottle={16}
          onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}
          style={styles.flex}
        >
          {songs.map((s, i) => {
            const k = keyOf(s, transpose[s.song_id]);
            const near = Math.abs(i - index) <= 1; // só desenha a música atual e as vizinhas
            return (
              <ScrollView
                key={`${s.song_id}-${i}`}
                ref={(r) => {
                  pages.current[i] = r;
                }}
                style={{ width: pageWidth || undefined }}
                contentContainerStyle={styles.page}
                showsVerticalScrollIndicator={false}
                onScroll={onPageScroll(i)}
                scrollEventThrottle={16}
                onLayout={(e) => {
                  metrics.current[i] = { content: metrics.current[i]?.content ?? 0, view: e.nativeEvent.layout.height };
                }}
                onContentSizeChange={(_, h) => {
                  metrics.current[i] = { view: metrics.current[i]?.view ?? 0, content: h };
                }}
              >
                <Pressable onPress={() => setControls((c) => !c)} accessibilityHint="Toque para mostrar ou esconder os controles">
                  {near ? (
                    <ChordSheet chordpro={s.chordpro} semitones={k.semitones} accidental={k.accidental} scale={scale} lyricsOnly={lyricsOnly} variant="stage" />
                  ) : (
                    <View style={styles.placeholder} />
                  )}
                </Pressable>
              </ScrollView>
            );
          })}
        </ScrollView>
        <Fade edge="top" />
        <Fade edge="bottom" />
      </View>

      {controls && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.bottom}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, bar]} />
          </View>
          <View style={styles.controls}>
            <Pressable
              onPress={() => goTo(index - 1)}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Música anterior"
              style={[styles.side, index === 0 && styles.disabled]}
            >
              <Icon name="back" />
            </Pressable>
            <Pressable onPress={togglePlay} accessibilityRole="button" accessibilityLabel={playing ? 'Pausar a rolagem' : 'Rolar a letra sozinha'} style={styles.play}>
              <Icon name={playing ? 'pause' : 'play'} size={28} strokeWidth={2.6} color={colors.onOrange} />
            </Pressable>
            <Pressable
              onPress={() => goTo(index + 1)}
              disabled={!next}
              accessibilityRole="button"
              accessibilityLabel="Próxima música"
              style={[styles.side, !next && styles.disabled]}
            >
              <Icon name="forward" />
            </Pressable>
          </View>
          <View style={styles.speed}>
            <Pressable onPress={() => changeSpeed(-0.1)} disabled={factor <= MIN_SPEED} accessibilityRole="button" accessibilityLabel="Rolar mais devagar" hitSlop={10} style={styles.speedButton}>
              <Icon name="minus" size={18} color={colors.dim} />
            </Pressable>
            <Text variant="meta" color="dim" accessibilityLiveRegion="polite">
              Velocidade {Math.round(factor * 100)}%
            </Text>
            <Pressable onPress={() => changeSpeed(0.1)} disabled={factor >= MAX_SPEED} accessibilityRole="button" accessibilityLabel="Rolar mais rápido" hitSlop={10} style={styles.speedButton}>
              <Icon name="plus" size={18} color={colors.dim} />
            </Pressable>
          </View>
          <Text variant="meta" color="tabInactive" style={styles.next}>
            {next ? `Próxima: ${next.title}` : songs.length > 1 ? 'Última música' : ' '}
          </Text>
        </Animated.View>
      )}

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title={song.title}>
        <SheetControls
          keyLabel={key.label}
          onTranspose={(step) => setSongTranspose({ extra: (transpose[song.song_id]?.extra ?? 0) + step })}
          accidental={key.accidental}
          onAccidental={(a) => setSongTranspose({ accidental: a })}
          scale={scale}
          onScale={setScale}
          lyricsOnly={lyricsOnly}
          onLyricsOnly={setLyricsOnly}
        />
      </BottomSheet>
    </>
  );
}

// Modo Palco (5.8): letra e cifra grandes, rolagem automática, tela sempre acesa e funciona sem internet.
// Abre pela escala (?event=ID&index=N) ou por uma música (?song=ID&key=G).
export default function Palco() {
  const params = useLocalSearchParams<{ event?: string; song?: string; key?: string; index?: string }>();
  const eventId = params.event ? Number(params.event) : null;
  const songId = params.song ? Number(params.song) : null;
  useStageAwake();

  const query = useQuery({
    queryKey: ['stage', stageKey({ eventId, songId }), params.key ?? null],
    queryFn: () => loadStage(eventId, songId, params.key ?? null),
    enabled: !!eventId || !!songId,
    networkMode: 'always', // sem internet também tenta (e cai na cópia guardada)
    retry: false,
    gcTime: 0,
  });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const loaded = query.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar hidden />
      {loaded && loaded.set.songs.length > 0 ? (
        <Stage loaded={loaded} startIndex={Number(params.index ?? 0) || 0} />
      ) : query.isLoading ? (
        <View style={styles.loading}>
          <Skeleton height={20} width={120} />
          <Skeleton height={36} />
          <Skeleton height={300} />
        </View>
      ) : (
        <View style={styles.loading}>
          <EmptyState
            icon="music"
            message={
              loaded
                ? 'Esta escala ainda não tem músicas.'
                : query.error instanceof ApiError && query.error.status === 0
                  ? 'Sem internet, e este repertório ainda não foi salvo no aparelho. Abra o Modo Palco uma vez com internet.'
                  : 'Não foi possível abrir o Modo Palco.'
            }
            actionLabel="Voltar"
            onAction={back}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.stageBg },
  flex: { flex: 1 },
  loading: { padding: space.xxl, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xxl, paddingTop: space.md, minHeight: size.iconButton + space.md },
  badges: { flexDirection: 'row', gap: 6 },
  topActions: { flexDirection: 'row', gap: space.xs, minWidth: size.iconButton * 2 + space.xs, justifyContent: 'flex-end' },
  offline: { paddingHorizontal: space.xxl, marginTop: space.xs },
  title: { paddingHorizontal: space.xxl, marginTop: space.md },
  lyrics: { flex: 1, marginTop: space.md },
  page: { paddingHorizontal: space.xxl, paddingTop: space.xl, paddingBottom: size.stageFade * 2 },
  placeholder: { height: 400 },
  fade: { position: 'absolute', left: 0, right: 0, height: size.stageFade },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
  bottom: { paddingHorizontal: space.xxl, paddingBottom: space.md, gap: space.md },
  progressTrack: { height: size.progress, borderRadius: 2, backgroundColor: colors.card, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.orange },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: {
    width: size.stageSide,
    height: size.stageSide,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    width: size.stagePlay,
    height: size.stagePlay,
    borderRadius: radius.round,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
  speed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  speedButton: { padding: space.xs },
  next: { textAlign: 'center' },
});
