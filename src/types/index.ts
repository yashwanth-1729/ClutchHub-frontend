export type UserRole = 'PLAYER' | 'ORGANIZER' | 'ORG_HOST' | 'SUPER_ADMIN';
export type TournamentStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type TeamFormat = 'SOLO' | 'DUO' | 'SQUAD';
export type GameType = 'FREE_FIRE' | 'BGMI' | 'VALORANT' | 'COD_MOBILE' | 'OTHER';

export interface User {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  gameUid?: string;
  role: UserRole;
  profileComplete: boolean;
}

export interface Tournament {
  id: string;
  organizerId?: string;
  name: string;
  slug: string;
  description?: string;
  rules?: string;
  game: string;
  format: TeamFormat;
  status: TournamentStatus;
  maxTeams: number;
  registeredTeams: number;
  entryFee: number;
  prizePool: number;
  bannerUrl?: string;
  scheduledAt: string;
  createdAt?: string;
  organizerName?: string;
  organizerUsername?: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  status: string;
  playerCount?: number;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  totalKills: number;
  totalPlacementPoints: number;
  totalKillPoints: number;
  totalPoints: number;
  matchesPlayed: number;
  rank: number;
}
