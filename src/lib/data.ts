// ClutchHub data layer — talks directly to Supabase (Postgres + RLS + RPC +
// Storage + Edge Functions). Replaces the old Axios/Java REST client.
import { supabase } from './supabase';

/* ── helpers ─────────────────────────────────────────────── */

async function uid(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function throwIf(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// Sanitize free text before putting it into a PostgREST filter grammar.
const clean = (s: string) => s.replace(/[%,().*:]/g, ' ').trim();

/* ── mappers (snake_case row → camelCase shape used by the UI) ── */

export function mapTournament(r: any) {
  if (!r) return r;
  return {
    id: r.id,
    organizerId: r.organizer_id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    rules: r.rules,
    game: r.game,
    format: r.format,
    status: r.status,
    maxTeams: r.max_teams,
    registeredTeams: r.registered_teams,
    entryFee: r.entry_fee,
    prizePool: r.prize_pool,
    bannerUrl: r.banner_url,
    scheduledAt: r.scheduled_at,
    createdAt: r.created_at,
    organizerName: r.organizer_name ?? null,
    organizerUsername: r.organizer_username ?? null,
  };
}

function mapLeaderboard(r: any) {
  return {
    teamId: r.team_id,
    teamName: r.team_name,
    logoUrl: r.logo_url,
    totalKills: r.total_kills,
    totalPlacementPoints: r.total_placement_points,
    totalKillPoints: r.total_kill_points,
    totalPoints: r.total_points,
    matchesPlayed: r.matches_played,
    rank: r.rank,
  };
}

/* ── profile / auth ──────────────────────────────────────── */

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? '',
    username: data?.username ?? '',
    displayName: data?.display_name ?? '',
    avatarUrl: data?.avatar_url ?? '',
    gameUid: data?.game_uid ?? '',
    gender: data?.gender ?? '',
    gameRole: data?.game_role ?? '',
    bio: data?.bio ?? '',
    role: data?.role ?? 'PLAYER',
    profileComplete: !!data?.username,
  };
}

export async function updateProfile(form: {
  username?: string; gameUid?: string; displayName?: string;
  gender?: string; gameRole?: string; bio?: string;
}) {
  const { data, error } = await supabase.rpc('update_profile', {
    p_username: form.username ?? null,
    p_game_uid: form.gameUid ?? null,
    p_display_name: form.displayName ?? null,
    p_gender: form.gender ?? null,
    p_game_role: form.gameRole ?? null,
    p_bio: form.bio ?? null,
  });
  throwIf(error);
  return data;
}

/* ── tournaments ─────────────────────────────────────────── */

export async function listTournaments(status?: string) {
  let q = supabase.from('tournaments_view').select('*').order('scheduled_at', { ascending: true });
  if (status && status !== 'ALL') q = q.eq('status', status);
  const { data, error } = await q;
  throwIf(error);
  return (data ?? []).map(mapTournament);
}

export async function getTournament(slug: string) {
  const { data, error } = await supabase.from('tournaments_view').select('*').eq('slug', slug).maybeSingle();
  throwIf(error);
  return data ? mapTournament(data) : null;
}

export async function createTournament(form: {
  name: string; description?: string; rules?: string; game?: string; format?: string;
  maxTeams?: number; entryFee?: number; prizePool?: number; scheduledAt: string;
}) {
  const { data, error } = await supabase.rpc('create_tournament', {
    p_name: form.name,
    p_description: form.description ?? null,
    p_rules: form.rules ?? null,
    p_game: form.game ?? 'FREE_FIRE',
    p_format: form.format ?? 'SQUAD',
    p_max_teams: form.maxTeams ?? 25,
    p_entry_fee: form.entryFee ?? 0,
    p_prize_pool: form.prizePool ?? 0,
    p_scheduled_at: form.scheduledAt,
  });
  throwIf(error);
  return mapTournament(data);
}

export async function updateTournamentStatus(id: string, status: string) {
  const patch: any = { status };
  if (status === 'LIVE') patch.started_at = new Date().toISOString();
  if (status === 'COMPLETED') patch.completed_at = new Date().toISOString();
  const { data, error } = await supabase.from('tournaments').update(patch).eq('id', id).select().maybeSingle();
  throwIf(error);
  return data ? mapTournament(data) : null;
}

export async function getMyCreated() {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from('tournaments_view').select('*')
    .eq('organizer_id', me).order('created_at', { ascending: false });
  throwIf(error);
  return (data ?? []).map(mapTournament);
}

export async function getJoined() {
  const me = await uid();
  if (!me) return [];
  const { data: teams, error } = await supabase.from('teams')
    .select('tournament_id, created_at').eq('leader_id', me).order('created_at', { ascending: false });
  throwIf(error);
  const ids = Array.from(new Set((teams ?? []).map((t: any) => t.tournament_id)));
  if (!ids.length) return [];
  const { data: tours } = await supabase.from('tournaments_view').select('*').in('id', ids);
  const byId = new Map((tours ?? []).map((t: any) => [t.id, mapTournament(t)]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/* ── teams / registration ────────────────────────────────── */

export async function registerTeam(tournamentId: string, name: string) {
  const { data, error } = await supabase.rpc('register_team', {
    p_tournament_id: tournamentId,
    p_team_name: name ?? '',
  });
  throwIf(error);
  return data;
}

export async function getTeamsByTournament(tournamentId: string) {
  const { data, error } = await supabase.from('teams')
    .select('id, name, status, team_players(count)')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  throwIf(error);
  return (data ?? []).map((t: any) => ({
    id: t.id, name: t.name, status: t.status,
    playerCount: t.team_players?.[0]?.count ?? 0,
  }));
}

/* ── leaderboard / points ────────────────────────────────── */

export async function getLeaderboard(tournamentId: string) {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_tournament_id: tournamentId });
  throwIf(error);
  return (data ?? []).map(mapLeaderboard);
}

export async function submitSimplePoints(tournamentId: string, teamId: string, matchNumber: number, totalPoints: number) {
  const { data, error } = await supabase.rpc('submit_points', {
    p_tournament_id: tournamentId, p_team_id: teamId, p_match_number: matchNumber,
    p_kills: 0, p_placement: 0, p_total_points: totalPoints,
  });
  throwIf(error);
  return data;
}

export async function submitDetailedPoints(tournamentId: string, teamId: string, matchNumber: number, kills: number, placement: number) {
  const { data, error } = await supabase.rpc('submit_points', {
    p_tournament_id: tournamentId, p_team_id: teamId, p_match_number: matchNumber,
    p_kills: kills, p_placement: placement, p_total_points: 0,
  });
  throwIf(error);
  return data;
}

/* ── room credentials ────────────────────────────────────── */

export async function pushCredentials(tournamentId: string, roomId: string, roomPassword: string) {
  const { data, error } = await supabase.rpc('push_credentials', {
    p_tournament_id: tournamentId, p_room_id: roomId, p_room_password: roomPassword,
  });
  throwIf(error);
  return data;
}

export async function getCredentials(tournamentId: string) {
  const { data } = await supabase.from('room_credentials')
    .select('room_id, room_password').eq('tournament_id', tournamentId).maybeSingle();
  if (!data || (!data.room_id && !data.room_password)) return null;
  return { roomId: data.room_id as string, roomPassword: data.room_password as string };
}

/* ── org hosts ───────────────────────────────────────────── */

export async function assignHost(tournamentId: string, userId: string) {
  const { data, error } = await supabase.rpc('assign_host', { p_tournament_id: tournamentId, p_user_id: userId });
  throwIf(error);
  return data;
}

export async function removeHost(orgHostId: string) {
  const { error } = await supabase.rpc('remove_host', { p_org_host_id: orgHostId });
  throwIf(error);
}

export async function listHosts(tournamentId: string) {
  const { data, error } = await supabase.rpc('list_hosts', { p_tournament_id: tournamentId });
  throwIf(error);
  return data ?? [];
}

/* ── certificates ────────────────────────────────────────── */

export async function generateCertificates(tournamentId: string, topN: number) {
  const { data, error } = await supabase.functions.invoke('generate-certificates', {
    body: { tournamentId, topN },
  });
  if (error) {
    // Surface the function's JSON error message when present.
    const msg = (data as any)?.error || error.message;
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function myCertificates() {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from('certificates')
    .select('id, final_rank, total_points, pdf_url, issued_at, tournament:tournaments(name,slug), team:teams(name)')
    .eq('user_id', me).order('issued_at', { ascending: false });
  throwIf(error);
  return (data ?? []).map((c: any) => ({
    id: c.id, rank: c.final_rank, totalPoints: c.total_points, pdfUrl: c.pdf_url, issuedAt: c.issued_at,
    tournamentName: c.tournament?.name, tournamentSlug: c.tournament?.slug, teamName: c.team?.name,
  }));
}

/* ── users / messaging ───────────────────────────────────── */

export async function searchUsers(q: string) {
  const term = clean(q);
  if (term.length < 2) return [];
  const me = await uid();
  let query = supabase.from('public_profiles')
    .select('id, username, display_name, avatar_url, role')
    .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    .limit(20);
  if (me) query = query.neq('id', me);
  const { data, error } = await query;
  throwIf(error);
  return (data ?? []).map((u: any) => ({
    id: u.id, username: u.username, displayName: u.display_name, avatarUrl: u.avatar_url, role: u.role,
  }));
}

export async function getConversations() {
  const { data, error } = await supabase.rpc('get_conversations');
  throwIf(error);
  return data ?? [];
}

export async function getMessages(otherId: string) {
  const me = await uid();
  if (!me) return [];
  const { data, error } = await supabase.from('messages')
    .select('id, content, sender_id, receiver_id, created_at, is_read')
    .or(`and(sender_id.eq.${me},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${me})`)
    .order('created_at', { ascending: true });
  throwIf(error);
  return (data ?? []).map((m: any) => ({
    id: m.id, content: m.content, senderId: m.sender_id, receiverId: m.receiver_id,
    createdAt: m.created_at, isRead: m.is_read,
  }));
}

export async function sendMessage(otherId: string, content: string) {
  const me = await uid();
  if (!me) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('messages')
    .insert({ sender_id: me, receiver_id: otherId, content }).select().single();
  throwIf(error);
  return data;
}

export async function getAchievements(userId?: string) {
  const { data, error } = await supabase.rpc('get_achievements', { p_user_id: userId ?? null });
  throwIf(error);
  return data ?? [];
}
