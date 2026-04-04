export type UserRole = 'PLAYER' | 'ORGANIZER' | 'ORG_HOST' | 'ADMIN';
export type TournamentStatus = 'DRAFT' | 'OPEN' | 'FULL' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type TeamFormat = 'SOLO' | 'DUO' | 'SQUAD';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  gameUid?: string;
  role: UserRole;
  profileComplete: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  displayName?: string;
  avatarUrl?: string;
  profileComplete: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  description?: string;
  game: string;
  format: TeamFormat;
  maxTeams: number;
  registeredTeams: number;
  entryFee: number;
  prizePool: number;
  scheduledAt: string;
  status: TournamentStatus;
  bannerUrl?: string;
  organizerName?: string;
  rules?: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  status: string;
  players: TeamPlayer[];
}

export interface TeamPlayer {
  id: string;
  gameUid: string;
  inGameName: string;
  isLeader: boolean;
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
