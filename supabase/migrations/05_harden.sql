-- ============================================================
-- 05_harden.sql — resolve advisor findings
--   • email moves fully into auth.users (self reads it from the session)
--   • profiles become publicly readable → views run in invoker mode
--   • pin function search_path; keep mutating RPCs away from anon
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, username, display_name, game_uid)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'username',''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),
             nullif(new.raw_user_meta_data->>'username','')),
    nullif(new.raw_user_meta_data->>'game_uid','')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.protect_user_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.bypass_user_guard', true) = 'on' then return new; end if;
  if auth.uid() = old.id then
    new.role := old.role; new.id := old.id; new.is_active := old.is_active;
  end if;
  return new;
end $$;

alter table public.users drop column if exists email;

drop policy if exists users_select_self on public.users;
drop policy if exists users_select_public on public.users;
create policy users_select_public on public.users for select using (true);

drop view if exists public.public_profiles;
create view public.public_profiles with (security_invoker = on) as
  select id, username, display_name, avatar_url, role, game_uid, gender, game_role, bio, created_at
  from public.users;
grant select on public.public_profiles to anon, authenticated;

drop view if exists public.tournaments_view;
create view public.tournaments_view with (security_invoker = on) as
  select t.*, u.display_name as organizer_name, u.username as organizer_username
  from public.tournaments t
  join public.users u on u.id = t.organizer_id;
grant select on public.tournaments_view to anon, authenticated;

alter function public.set_updated_at() set search_path = '';
alter function public.default_rules() set search_path = '';

revoke execute on function public.create_tournament(text,text,text,game_type,team_format,int,int,int,timestamptz) from anon, public;
revoke execute on function public.register_team(uuid,text)             from anon, public;
revoke execute on function public.submit_points(uuid,uuid,int,int,int,int) from anon, public;
revoke execute on function public.push_credentials(uuid,text,text)     from anon, public;
revoke execute on function public.assign_host(uuid,uuid)               from anon, public;
revoke execute on function public.remove_host(uuid)                    from anon, public;
revoke execute on function public.update_profile(text,text,text,text,text,text) from anon, public;
revoke execute on function public.get_conversations()                  from anon, public;

grant execute on function public.create_tournament(text,text,text,game_type,team_format,int,int,int,timestamptz) to authenticated;
grant execute on function public.register_team(uuid,text)             to authenticated;
grant execute on function public.submit_points(uuid,uuid,int,int,int,int) to authenticated;
grant execute on function public.push_credentials(uuid,text,text)     to authenticated;
grant execute on function public.assign_host(uuid,uuid)               to authenticated;
grant execute on function public.remove_host(uuid)                    to authenticated;
grant execute on function public.update_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.get_conversations()                  to authenticated;

notify pgrst, 'reload schema';
