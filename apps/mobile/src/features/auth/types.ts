export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
};

export type Role = 'leader' | 'member';

export type Membership = {
  id: number;
  role: Role;
  ministry: { id: number; name: string; type: string; default_location: string | null };
  church: { id: number; name: string; city: string | null };
  positions: { id: number; name: string }[];
};

export type InvitePreview = {
  code: string;
  usable: boolean;
  role: Role;
  church: { name: string; city: string | null };
  ministry: { id: number; name: string };
  positions: { id: number; name: string }[];
};

export type AuthResponse = { token: string; user: User };
