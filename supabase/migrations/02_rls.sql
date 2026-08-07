-- ============================================================
-- 02_rls.sql — helper functions, RLS policies, views, grants
-- ============================================================

-- ── Authz helpers (SECURITY DEFINER → bypass RLS, no recursion) ──
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_organizer(t_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments where id = t_id and organizer_id = auth.uid());
$$;

create or replace function public.is_host(t_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_hosts
                 where tournament_id = t_id and user_id = auth.uid() and is_active);
$$;

create or replace function public.can_manage(t_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_organizer(t_id)
      or public.is_host(t_id)
      or coalesce(public.my_role() = 'SUPER_ADMIN', false);
$$;

create or replace function public.leads_team_in(t_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where tournament_id = t_id and leader_id = auth.uid());
$$;

-- Prevent clients from escalating their own role / changing protected columns.
create or replace function public.protect_user_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Trusted RPCs opt out by setting this txn-local flag (clients cannot).
  if current_setting('app.bypass_user_guard', true) = 'on' then
    return new;
  end if;
  if auth.uid() = old.id then
    new.role      := old.role;
    new.email     := old.email;
    new.id        := old.id;
    new.is_active := old.is_active;
  end if;
  return new;
end $$;

drop trigger if exists trg_users_protect on public.users;
create trigger trg_users_protect before update on public.users
  for each row execute function public.protect_user_columns();

-- ── Enable RLS ──────────────────────────────────────────────
alter table public.users            enable row level security;
alter table public.tournaments      enable row level security;
alter table public.teams            enable row level security;
alter table public.team_players     enable row level security;
alter table public.points           enable row level security;
alter table public.org_hosts        enable row level security;
alter table public.room_credentials enable row level security;
alter table public.certificates     enable row level security;
alter table public.messages         enable row level security;
alter table public.placement_rules  enable row level security;

-- ── users ───────────────────────────────────────────────────
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (auth.uid() = id);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Public, email-free profile projection (used for search & organizer names).
create or replace view public.public_profiles
with (security_invoker = off) as
  select id, username, display_name, avatar_url, role, game_uid, gender, game_role, bio, created_at
  from public.users;
grant select on public.public_profiles to anon, authenticated;

-- ── tournaments ─────────────────────────────────────────────
drop policy if exists tournaments_select_all on public.tournaments;
create policy tournaments_select_all on public.tournaments
  for select using (true);

drop policy if exists tournaments_insert_own on public.tournaments;
create policy tournaments_insert_own on public.tournaments
  for insert with check (auth.uid() = organizer_id);

drop policy if exists tournaments_update_manage on public.tournaments;
create policy tournaments_update_manage on public.tournaments
  for update using (public.can_manage(id)) with check (public.can_manage(id));

drop policy if exists tournaments_delete_owner on public.tournaments;
create policy tournaments_delete_owner on public.tournaments
  for delete using (public.is_organizer(id) or coalesce(public.my_role() = 'SUPER_ADMIN', false));

-- Tournament listing view w/ organizer name (bypasses users RLS for the join).
create or replace view public.tournaments_view
with (security_invoker = off) as
  select t.*, u.display_name as organizer_name, u.username as organizer_username
  from public.tournaments t
  join public.users u on u.id = t.organizer_id;
grant select on public.tournaments_view to anon, authenticated;

-- ── teams ───────────────────────────────────────────────────
drop policy if exists teams_select_all on public.teams;
create policy teams_select_all on public.teams for select using (true);

drop policy if exists teams_insert_leader on public.teams;
create policy teams_insert_leader on public.teams
  for insert with check (auth.uid() = leader_id);

drop policy if exists teams_update_manage on public.teams;
create policy teams_update_manage on public.teams
  for update using (auth.uid() = leader_id or public.can_manage(tournament_id));

drop policy if exists teams_delete_manage on public.teams;
create policy teams_delete_manage on public.teams
  for delete using (auth.uid() = leader_id or public.can_manage(tournament_id));

-- ── team_players ────────────────────────────────────────────
drop policy if exists team_players_select_all on public.team_players;
create policy team_players_select_all on public.team_players for select using (true);

drop policy if exists team_players_write_leader on public.team_players;
create policy team_players_write_leader on public.team_players
  for all
  using (exists (select 1 from public.teams t
                 where t.id = team_players.team_id
                   and (t.leader_id = auth.uid() or public.can_manage(t.tournament_id))))
  with check (exists (select 1 from public.teams t
                 where t.id = team_players.team_id
                   and (t.leader_id = auth.uid() or public.can_manage(t.tournament_id))));

-- ── points ──────────────────────────────────────────────────
drop policy if exists points_select_all on public.points;
create policy points_select_all on public.points for select using (true);

drop policy if exists points_write_manage on public.points;
create policy points_write_manage on public.points
  for all using (public.can_manage(tournament_id)) with check (public.can_manage(tournament_id));

-- ── org_hosts ───────────────────────────────────────────────
drop policy if exists org_hosts_select on public.org_hosts;
create policy org_hosts_select on public.org_hosts
  for select using (
    user_id = auth.uid()
    or public.is_organizer(tournament_id)
    or coalesce(public.my_role() = 'SUPER_ADMIN', false)
  );

drop policy if exists org_hosts_write_org on public.org_hosts;
create policy org_hosts_write_org on public.org_hosts
  for all using (public.is_organizer(tournament_id) or coalesce(public.my_role() = 'SUPER_ADMIN', false))
          with check (public.is_organizer(tournament_id) or coalesce(public.my_role() = 'SUPER_ADMIN', false));

-- ── room_credentials ────────────────────────────────────────
drop policy if exists room_creds_select on public.room_credentials;
create policy room_creds_select on public.room_credentials
  for select using (public.can_manage(tournament_id) or public.leads_team_in(tournament_id));

drop policy if exists room_creds_write on public.room_credentials;
create policy room_creds_write on public.room_credentials
  for all using (public.can_manage(tournament_id)) with check (public.can_manage(tournament_id));

-- ── certificates ────────────────────────────────────────────
drop policy if exists certificates_select_all on public.certificates;
create policy certificates_select_all on public.certificates for select using (true);
-- (writes happen only via the Edge Function using the service role, which bypasses RLS)

-- ── messages ────────────────────────────────────────────────
drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages
  for insert with check (sender_id = auth.uid());

drop policy if exists messages_update_receiver on public.messages;
create policy messages_update_receiver on public.messages
  for update using (receiver_id = auth.uid());

-- ── placement_rules ─────────────────────────────────────────
drop policy if exists placement_rules_select on public.placement_rules;
create policy placement_rules_select on public.placement_rules for select using (true);
