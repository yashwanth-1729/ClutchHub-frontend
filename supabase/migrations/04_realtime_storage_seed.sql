-- ============================================================
-- 04_realtime_storage_seed.sql — realtime, storage, seed data
-- ============================================================

-- ── Realtime: leaderboard (points), room creds, DMs ─────────
alter table public.points           replica identity full;
alter table public.room_credentials replica identity full;
alter table public.messages         replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.points;           exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.room_credentials; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages;          exception when duplicate_object then null; end;
end $$;

-- ── Storage buckets ─────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('certificates','certificates',true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('banners','banners',true)           on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars','avatars',true)           on conflict (id) do nothing;

drop policy if exists "clutch storage public read" on storage.objects;
create policy "clutch storage public read" on storage.objects
  for select using (bucket_id in ('certificates','banners','avatars'));

drop policy if exists "clutch storage auth upload" on storage.objects;
create policy "clutch storage auth upload" on storage.objects
  for insert to authenticated with check (bucket_id in ('banners','avatars'));

drop policy if exists "clutch storage auth update" on storage.objects;
create policy "clutch storage auth update" on storage.objects
  for update to authenticated using (bucket_id in ('banners','avatars'));

drop policy if exists "clutch storage auth delete" on storage.objects;
create policy "clutch storage auth delete" on storage.objects
  for delete to authenticated using (bucket_id in ('banners','avatars'));

-- ── Seed placement rules (Free Fire standard) ───────────────
insert into public.placement_rules (game, format, placement, points)
select 'FREE_FIRE'::game_type, f::team_format, p.placement, p.points
from (values
  (1,12),(2,9),(3,8),(4,7),(5,6),(6,5),(7,4),(8,3),(9,2),(10,1),(11,1),(12,0)
) as p(placement, points)
cross join (values ('SOLO'),('DUO'),('SQUAD')) as fmt(f)
on conflict (game, format, placement) do nothing;
