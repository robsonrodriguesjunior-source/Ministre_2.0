export type SongSummary = {
  id: number;
  title: string;
  artist: string | null;
  original_key: string;
  bpm: number | null;
  duration_sec: number | null;
  tags: string[];
  played_count: number;
  last_played_at: string | null;
  is_new: boolean;
};

export type SongLink = { url: string; type: 'youtube' | 'spotify' | 'other' };

export type SongDetail = SongSummary & {
  chordpro: string;
  links: SongLink[];
  can_manage: boolean;
};

export type SongInput = {
  title: string;
  artist: string | null;
  original_key: string;
  bpm: number | null;
  duration_sec: number | null;
  chordpro: string;
  tags: string[];
  links: string[];
};

export type SongFilter = 'all' | 'most_played' | 'new';

/** Uma música no Modo Palco, já no tom da escala. */
export type StageSong = {
  song_id: number;
  title: string;
  artist: string | null;
  key: string;
  original_key: string;
  bpm: number | null;
  duration_sec: number | null;
  chordpro: string;
};

/** O repertório de uma escala guardado no aparelho para o Modo Palco funcionar sem internet. */
export type StageSet = {
  event_id: number | null;
  title: string;
  starts_at: string | null;
  songs: StageSong[];
  saved_at: string;
};
