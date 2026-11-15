export type AssignmentStatus = 'pending' | 'confirmed' | 'declined';
export type EventStatus = 'draft' | 'published' | 'cancelled';

export type Face = { user_id: number; name: string; avatar_url: string | null };

export type EventSummary = {
  id: number;
  title: string;
  starts_at: string;
  location: string | null;
  status: EventStatus;
  is_rehearsal: boolean;
  event_type_id: number | null;
  team_count: number;
  confirmed_count: number;
  mine: { assignment_id: number; position: string; status: AssignmentStatus }[];
  faces: Face[];
};

export type TeamMember = {
  assignment_id: number;
  member_id: number;
  user_id: number;
  name: string;
  avatar_url: string | null;
  position_id: number;
  position: string;
  status: AssignmentStatus;
  decline_reason: string | null;
  is_me: boolean;
};

export type EventSong = {
  id: number;
  song_id: number;
  title: string;
  artist: string | null;
  key: string;
  original_key: string;
  bpm: number | null;
  duration_sec: number | null;
  links: { url: string; type: 'youtube' | 'spotify' | 'deezer' | 'other' }[];
  sort_order: number;
};

export type RundownItem = {
  id: number;
  title: string;
  planned_time: string | null;
  duration_min: number | null;
  responsible_member_id: number | null;
  responsible: string | null;
  notes: string | null;
};

export type EventDetail = EventSummary & {
  notes: string | null;
  can_manage: boolean;
  pending_count: number;
  remindable_count: number;
  team: TeamMember[];
  songs: EventSong[];
  rundown: RundownItem[];
};

export type Home = {
  next_event: EventSummary | null;
  rehearsal: { id: number; title: string; starts_at: string; location: string | null } | null;
  songs: { event_id: number; count: number; new: number } | null;
  announcement: {
    id: number;
    title: string;
    body: string;
    created_at: string;
    author: { id: number; name: string } | null;
  } | null;
  unread_notifications: number;
  songs_total: number;
};

export type AvailabilityMember = {
  member_id: number;
  user_id: number;
  name: string;
  avatar_url: string | null;
  unavailable: boolean;
  unavailable_reason: string | null;
  busy_at: string[];
};

export type Availability = {
  date: string;
  positions: { id: number; name: string; members: AvailabilityMember[] }[];
};

export type EventType = {
  id: number;
  name: string;
  weekday: number | null;
  default_time: string | null;
  default_location: string | null;
  is_rehearsal: boolean;
};

export type SongOption = {
  id: number;
  title: string;
  artist: string | null;
  original_key: string;
  bpm: number | null;
  duration_sec: number | null;
};

export type Unavailability = {
  id: number;
  starts_on: string;
  ends_on: string;
  reason: string | null;
  recurrence_weekday: number | null;
};

export type Conflict = { event_id: number; title: string; starts_at: string; position: string };
