-- ============================================================
-- ClutchHub — Supabase schema (replaces Java/Spring backend)
-- 01_schema.sql — extensions, enums, tables, indexes, triggers
-- ============================================================

create extension if not exists "pg_trgm";

-- ── ENUMS ───────────────────────────────────────────────────
do $$ begin
  create type user_role         as enum ('PLAYER','ORGANIZER','ORG_HOST','SUPER_ADMIN');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tournament_status as enum ('DRAFT','UPCOMING','LIVE','COMPLETED','CANCELLED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type team_status       as enum ('PENDING_PAYMENT','CONFIRMED','DISQUALIFIED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type game_type         as enum ('FREE_FIRE','BGMI','VALORANT','COD_MOBILE','OTHER');
exception when duplicate_object then null; end $$;
do $$ begin
  create type team_format       as enum ('SOLO','DUO','SQUAD');
exception when duplicate_object then null; end $$;

-- ── updated_at helper ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ── USERS (profiles, keyed to auth.users) ───────────────────
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique,
  username     text unique,
  display_name text,
  avatar_url   text,
  game_uid     text,
  role         user_role   not null default 'PLAYER',
  gender       text,
  game_role    text,
  bio          text,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_users_role         on public.users(role);
create index if not exists idx_users_username_trgm on public.users using gin (username gin_trgm_ops);
create index if not exists idx_users_dname_trgm    on public.users using gin (display_name gin_trgm_ops);

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, username, display_name, game_uid)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'username',''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),
             nullif(new.raw_user_meta_data->>'username','')),
    nullif(new.raw_user_meta_data->>'game_uid','')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── TOURNAMENTS ─────────────────────────────────────────────
create table if not exists public.tournaments (
  id               uuid primary key default gen_random_uuid(),
  organizer_id     uuid not null references public.users(id) on delete cascade,
  name             text not null,
  slug             text unique not null,
  description      text,
  rules            text,
  game             game_type         not null default 'FREE_FIRE',
  format           team_format       not null default 'SQUAD',
  status           tournament_status not null default 'UPCOMING',
  max_teams        integer not null default 25,
  registered_teams integer not null default 0,
  entry_fee        integer not null default 0,
  prize_pool       integer not null default 0,
  banner_url       text,
  scheduled_at     timestamptz not null,
  started_at       timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_tournaments_organizer on public.tournaments(organizer_id);
create index if not exists idx_tournaments_status     on public.tournaments(status);
create index if not exists idx_tournaments_scheduled  on public.tournaments(scheduled_at);
create index if not exists idx_tournaments_name_trgm  on public.tournaments using gin (name gin_trgm_ops);

drop trigger if exists trg_tournaments_updated on public.tournaments;
create trigger trg_tournaments_updated before update on public.tournaments
  for each row execute function public.set_updated_at();

-- ── TEAMS ───────────────────────────────────────────────────
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  leader_id     uuid not null references public.users(id) on delete cascade,
  name          text not null,
  logo_url      text,
  slot_number   integer,
  status        team_status not null default 'CONFIRMED',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, name),
  unique (tournament_id, leader_id)
);
create index if not exists idx_teams_tournament on public.teams(tournament_id);
create index if not exists idx_teams_leader     on public.teams(leader_id);

drop trigger if exists trg_teams_updated on public.teams;
create trigger trg_teams_updated before update on public.teams
  for each row execute function public.set_updated_at();

-- Keep tournaments.registered_teams in sync with the teams table.
create or replace function public.sync_registered_teams()
returns trigger language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  tid := coalesce(new.tournament_id, old.tournament_id);
  update public.tournaments
     set registered_teams = (select count(*) from public.teams where tournament_id = tid)
   where id = tid;
  return null;
end $$;

drop trigger if exists trg_teams_count on public.teams;
create trigger trg_teams_count
  after insert or delete on public.teams
  for each row execute function public.sync_registered_teams();

-- ── TEAM PLAYERS ────────────────────────────────────────────
create table if not exists public.team_players (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid references public.users(id) on delete set null,
  game_uid    text not null,
  player_name text,
  is_leader   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_team_players_team on public.team_players(team_id);
create index if not exists idx_team_players_user on public.team_players(user_id);

-- ── POINTS (per match, aggregated into the leaderboard) ─────
create table if not exists public.points (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid not null references public.tournaments(id) on delete cascade,
  team_id          uuid not null references public.teams(id) on delete cascade,
  match_number     integer not null default 1,
  kills            integer not null default 0,
  placement        integer,
  placement_points integer not null default 0,
  kill_points      integer not null default 0,
  total_points     integer not null default 0,
  updated_by       uuid references public.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (tournament_id, team_id, match_number)
);
create index if not exists idx_points_tournament on public.points(tournament_id);
create index if not exists idx_points_team        on public.points(team_id);

drop trigger if exists trg_points_updated on public.points;
create trigger trg_points_updated before update on public.points
  for each row execute function public.set_updated_at();

-- ── ORG HOSTS (per-tournament host assignments) ─────────────
create table if not exists public.org_hosts (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references public.users(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (tournament_id, user_id)
);
create index if not exists idx_org_hosts_tournament on public.org_hosts(tournament_id);
create index if not exists idx_org_hosts_user       on public.org_hosts(user_id);

-- ── ROOM CREDENTIALS (sensitive; separate table for RLS) ────
create table if not exists public.room_credentials (
  tournament_id uuid primary key references public.tournaments(id) on delete cascade,
  room_id       text,
  room_password text,
  updated_by    uuid references public.users(id),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_room_creds_updated on public.room_credentials;
create trigger trg_room_creds_updated before update on public.room_credentials
  for each row execute function public.set_updated_at();

-- ── CERTIFICATES ────────────────────────────────────────────
create table if not exists public.certificates (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  final_rank    integer not null,
  total_points  integer not null default 0,
  pdf_url       text not null,
  issued_at     timestamptz not null default now(),
  unique (tournament_id, user_id)
);
create index if not exists idx_certificates_user       on public.certificates(user_id);
create index if not exists idx_certificates_tournament on public.certificates(tournament_id);

-- ── MESSAGES (1:1 DMs) ──────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  content     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_messages_sender   on public.messages(sender_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);
create index if not exists idx_messages_pair      on public.messages(sender_id, receiver_id, created_at);

-- ── PLACEMENT RULES (scoring reference) ─────────────────────
create table if not exists public.placement_rules (
  id        uuid primary key default gen_random_uuid(),
  game      game_type   not null,
  format    team_format not null,
  placement integer     not null,
  points    integer     not null,
  unique (game, format, placement)
);
