-- ============================================================
-- 03_functions.sql — business-logic RPCs (replace the Java services)
-- ============================================================

create or replace function public.default_rules()
returns text language sql immutable as $$
  select '## Tournament Rules

1. **Registration**: All player UIDs must be registered before the tournament starts.
2. **Room Credentials**: Room ID and Password will be shared 15 minutes before the match.
3. **Fair Play**: Use of hacks, cheats, or exploits leads to immediate disqualification.
4. **Scoring**:
   - Kill Points: 1 kill = 1 point
   - Placement: 1st=12, 2nd=9, 3rd=8, 4th=7, 5th=6, 6th=5, 7th=4, 8th=3, 9th=2, 10th=1
5. **Disputes**: Any disputes must be raised within 10 minutes of match end.';
$$;

-- ── Profile: set/update (username uniqueness enforced) ──────
create or replace function public.update_profile(
  p_username text default null, p_game_uid text default null, p_display_name text default null,
  p_gender text default null, p_game_role text default null, p_bio text default null
) returns public.users
language plpgsql security definer set search_path = public as $$
declare v_row public.users;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_username is not null and trim(p_username) <> '' then
    if exists (select 1 from public.users where username = trim(p_username) and id <> auth.uid()) then
      raise exception 'Username already taken';
    end if;
  end if;
  update public.users set
    username     = coalesce(nullif(trim(p_username),''), username),
    display_name = coalesce(nullif(trim(p_display_name),''), display_name),
    game_uid     = coalesce(p_game_uid, game_uid),
    gender       = coalesce(p_gender, gender),
    game_role    = coalesce(p_game_role, game_role),
    bio          = coalesce(p_bio, bio)
  where id = auth.uid()
  returning * into v_row;
  return v_row;
end $$;

-- ── Create tournament (unique slug + auto-upgrade to ORGANIZER) ──
create or replace function public.create_tournament(
  p_name text, p_description text, p_rules text,
  p_game game_type, p_format team_format,
  p_max_teams int, p_entry_fee int, p_prize_pool int,
  p_scheduled_at timestamptz
) returns public.tournaments
language plpgsql security definer set search_path = public as $$
declare v_base text; v_slug text; v_try int := 0; v_t public.tournaments;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Tournament name is required'; end if;
  if p_scheduled_at is null then raise exception 'Schedule date is required'; end if;

  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'tournament'; end if;
  v_slug := v_base;
  while exists (select 1 from public.tournaments where slug = v_slug) loop
    v_try := v_try + 1;
    v_slug := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
    if v_try > 25 then raise exception 'Could not generate a unique slug'; end if;
  end loop;

  insert into public.tournaments (organizer_id, name, slug, description, rules, game, format,
                                  max_teams, entry_fee, prize_pool, scheduled_at, status)
  values (auth.uid(), trim(p_name), v_slug, nullif(trim(p_description),''),
          coalesce(nullif(trim(p_rules),''), public.default_rules()),
          coalesce(p_game,'FREE_FIRE'), coalesce(p_format,'SQUAD'),
          coalesce(p_max_teams,25), coalesce(p_entry_fee,0), coalesce(p_prize_pool,0),
          p_scheduled_at, 'UPCOMING')
  returning * into v_t;

  perform set_config('app.bypass_user_guard','on', true);
  update public.users set role = 'ORGANIZER' where id = auth.uid() and role = 'PLAYER';
  perform set_config('app.bypass_user_guard','off', true);

  return v_t;
end $$;

-- ── Register a team for a tournament ────────────────────────
create or replace function public.register_team(p_tournament_id uuid, p_team_name text)
returns public.teams
language plpgsql security definer set search_path = public as $$
declare v_t public.tournaments; v_user public.users; v_team public.teams; v_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'Tournament not found'; end if;
  if v_t.status not in ('UPCOMING','LIVE') then raise exception 'Registration is closed for this tournament'; end if;
  select * into v_user from public.users where id = auth.uid();

  if exists (select 1 from public.teams where tournament_id = p_tournament_id and leader_id = auth.uid()) then
    raise exception 'You have already registered for this tournament';
  end if;
  if v_t.registered_teams >= v_t.max_teams then
    raise exception 'Tournament is full';
  end if;

  v_name := coalesce(nullif(trim(p_team_name),''),
                     coalesce(v_user.display_name, v_user.username, 'Player') || '''s Team');

  insert into public.teams (tournament_id, leader_id, name, status)
  values (p_tournament_id, auth.uid(), v_name, 'CONFIRMED')
  returning * into v_team;

  insert into public.team_players (team_id, user_id, game_uid, player_name, is_leader)
  values (v_team.id, auth.uid(), coalesce(v_user.game_uid,''),
          coalesce(v_user.display_name, v_user.username), true);

  return v_team;
end $$;

-- ── Leaderboard (includes teams with no points yet) ─────────
create or replace function public.get_leaderboard(p_tournament_id uuid)
returns table (
  team_id uuid, team_name text, logo_url text,
  total_kills int, total_placement_points int, total_kill_points int,
  total_points int, matches_played int, rank int
)
language sql stable security definer set search_path = public as $$
  with agg as (
    select t.id as team_id, t.name as team_name, t.logo_url,
           coalesce(sum(p.kills),0)::int            as total_kills,
           coalesce(sum(p.placement_points),0)::int as total_placement_points,
           coalesce(sum(p.kill_points),0)::int      as total_kill_points,
           coalesce(sum(p.total_points),0)::int     as total_points,
           count(p.id)::int                          as matches_played
    from public.teams t
    left join public.points p on p.team_id = t.id
    where t.tournament_id = p_tournament_id
    group by t.id, t.name, t.logo_url
  )
  select team_id, team_name, logo_url, total_kills, total_placement_points,
         total_kill_points, total_points, matches_played,
         rank() over (order by total_points desc, total_kills desc)::int as rank
  from agg
  order by rank, team_name;
$$;

-- ── Submit / update match points ────────────────────────────
create or replace function public.submit_points(
  p_tournament_id uuid, p_team_id uuid, p_match_number int,
  p_kills int, p_placement int, p_total_points int
) returns public.points
language plpgsql security definer set search_path = public as $$
declare v_t public.tournaments; v_place int; v_kill int; v_total int; v_row public.points;
begin
  if not public.can_manage(p_tournament_id) then raise exception 'Not authorized'; end if;
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'Tournament not found'; end if;
  if not exists (select 1 from public.teams where id = p_team_id and tournament_id = p_tournament_id) then
    raise exception 'Team does not belong to this tournament';
  end if;

  if coalesce(p_total_points,0) > 0 then
    v_place := 0; v_kill := 0; v_total := p_total_points;
  else
    select coalesce(points,0) into v_place from public.placement_rules
      where game = v_t.game and format = v_t.format and placement = coalesce(p_placement,0);
    v_place := coalesce(v_place,0);
    v_kill  := coalesce(p_kills,0);
    v_total := v_place + v_kill;
  end if;

  insert into public.points (tournament_id, team_id, match_number, kills, placement,
                             placement_points, kill_points, total_points, updated_by)
  values (p_tournament_id, p_team_id, coalesce(p_match_number,1), coalesce(p_kills,0), p_placement,
          v_place, v_kill, v_total, auth.uid())
  on conflict (tournament_id, team_id, match_number) do update
     set kills = excluded.kills, placement = excluded.placement,
         placement_points = excluded.placement_points, kill_points = excluded.kill_points,
         total_points = excluded.total_points, updated_by = excluded.updated_by
  returning * into v_row;
  return v_row;
end $$;

-- ── Push room credentials ───────────────────────────────────
create or replace function public.push_credentials(
  p_tournament_id uuid, p_room_id text, p_room_password text
) returns public.room_credentials
language plpgsql security definer set search_path = public as $$
declare v_row public.room_credentials;
begin
  if not public.can_manage(p_tournament_id) then raise exception 'Not authorized'; end if;
  insert into public.room_credentials (tournament_id, room_id, room_password, updated_by, updated_at)
  values (p_tournament_id, p_room_id, p_room_password, auth.uid(), now())
  on conflict (tournament_id) do update
     set room_id = excluded.room_id, room_password = excluded.room_password,
         updated_by = excluded.updated_by, updated_at = now()
  returning * into v_row;
  return v_row;
end $$;

-- ── Assign / remove tournament host ─────────────────────────
create or replace function public.assign_host(p_tournament_id uuid, p_user_id uuid)
returns public.org_hosts
language plpgsql security definer set search_path = public as $$
declare v_oh public.org_hosts;
begin
  if not (public.is_organizer(p_tournament_id) or coalesce(public.my_role() = 'SUPER_ADMIN', false)) then
    raise exception 'You do not own this tournament';
  end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'User not found';
  end if;

  insert into public.org_hosts (organizer_id, user_id, tournament_id, is_active)
  values (auth.uid(), p_user_id, p_tournament_id, true)
  on conflict (tournament_id, user_id) do update set is_active = true
  returning * into v_oh;

  update public.users set role = 'ORG_HOST' where id = p_user_id and role = 'PLAYER';
  return v_oh;
end $$;

create or replace function public.remove_host(p_org_host_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_oh public.org_hosts;
begin
  select * into v_oh from public.org_hosts where id = p_org_host_id;
  if not found then raise exception 'Host assignment not found'; end if;
  if not (v_oh.organizer_id = auth.uid() or coalesce(public.my_role() = 'SUPER_ADMIN', false)) then
    raise exception 'Not authorized';
  end if;
  update public.org_hosts set is_active = false where id = p_org_host_id;
end $$;

create or replace function public.list_hosts(p_tournament_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'id', oh.id, 'userId', u.id, 'username', u.username,
    'displayName', u.display_name, 'avatarUrl', u.avatar_url
  ) order by oh.created_at), '[]'::json)
  from public.org_hosts oh
  join public.users u on u.id = oh.user_id
  where oh.tournament_id = p_tournament_id and oh.is_active;
$$;

-- ── Achievements / battle history ───────────────────────────
create or replace function public.get_achievements(p_user_id uuid default null)
returns json language sql stable security definer set search_path = public as $$
  with uid as (select coalesce(p_user_id, auth.uid()) as id),
  parts as (
    select distinct tp.team_id, t.tournament_id
    from public.team_players tp
    join public.teams t on t.id = tp.team_id
    where tp.user_id = (select id from uid)
  ),
  rows as (
    select
      tr.id           as "tournamentId",
      tr.name         as "tournamentName",
      tr.slug         as "tournamentSlug",
      tr.status::text as "tournamentStatus",
      tr.format::text as "format",
      tr.scheduled_at as "scheduledAt",
      tr.prize_pool   as "prizePool",
      tm.id           as "teamId",
      tm.name         as "teamName",
      coalesce((select sum(p.total_points) from public.points p where p.team_id = tm.id), 0)::int as "teamPoints",
      c.final_rank    as "rank",
      case when c.id is null then null else json_build_object(
        'certId', c.id, 'rank', c.final_rank, 'totalPoints', c.total_points, 'pdfUrl', c.pdf_url
      ) end as "certificate"
    from parts
    join public.teams tm on tm.id = parts.team_id
    join public.tournaments tr on tr.id = parts.tournament_id
    left join public.certificates c on c.tournament_id = tr.id and c.user_id = (select id from uid)
    order by tr.scheduled_at desc nulls last
  )
  select coalesce(json_agg(rows), '[]'::json) from rows;
$$;

-- ── Conversations list (chat partners + last message) ───────
create or replace function public.get_conversations()
returns json language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  partners as (
    select case when sender_id = (select id from me) then receiver_id else sender_id end as pid,
           max(created_at) as last_at
    from public.messages
    where sender_id = (select id from me) or receiver_id = (select id from me)
    group by 1
  )
  select coalesce(json_agg(json_build_object(
    'id', u.id, 'username', u.username, 'displayName', u.display_name, 'avatarUrl', u.avatar_url,
    'lastMessageAt', p.last_at,
    'lastMessage', (select content from public.messages m
                    where (m.sender_id = (select id from me) and m.receiver_id = u.id)
                       or (m.sender_id = u.id and m.receiver_id = (select id from me))
                    order by m.created_at desc limit 1)
  ) order by p.last_at desc), '[]'::json)
  from partners p join public.users u on u.id = p.pid;
$$;

-- ── Grants ──────────────────────────────────────────────────
grant execute on function public.get_leaderboard(uuid)          to anon, authenticated;
grant execute on function public.list_hosts(uuid)               to anon, authenticated;
grant execute on function public.get_achievements(uuid)         to anon, authenticated;
grant execute on function public.update_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.create_tournament(text,text,text,game_type,team_format,int,int,int,timestamptz) to authenticated;
grant execute on function public.register_team(uuid,text)       to authenticated;
grant execute on function public.submit_points(uuid,uuid,int,int,int,int) to authenticated;
grant execute on function public.push_credentials(uuid,text,text) to authenticated;
grant execute on function public.assign_host(uuid,uuid)         to authenticated;
grant execute on function public.remove_host(uuid)              to authenticated;
grant execute on function public.get_conversations()            to authenticated;

notify pgrst, 'reload schema';
