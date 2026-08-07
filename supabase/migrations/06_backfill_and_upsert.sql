-- ============================================================
-- 06_backfill_and_upsert.sql
--   • Backfill profile rows for pre-existing auth users (their old
--     profiles lived in the removed Java/VPS database).
--   • Make update_profile self-heal: create the row if it's missing.
-- ============================================================

insert into public.users (id)
select a.id
from auth.users a
left join public.users u on u.id = a.id
where u.id is null;

create or replace function public.update_profile(
  p_username text default null, p_game_uid text default null, p_display_name text default null,
  p_gender text default null, p_game_role text default null, p_bio text default null
) returns public.users
language plpgsql security definer set search_path = public as $$
declare v_row public.users;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  -- Ensure a profile row exists (legacy users, or any missed trigger).
  insert into public.users (id) values (auth.uid()) on conflict (id) do nothing;

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

grant execute on function public.update_profile(text,text,text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
