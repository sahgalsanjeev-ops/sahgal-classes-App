-- Coaching Highlights & Stories setup

-- ---------------------------------------------------------------------------
-- Table: activities
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activities_sort_idx on public.activities (sort_order, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.activities enable row level security;

-- Read activities for any authenticated user
drop policy if exists "activities_read" on public.activities;
create policy "activities_read" on public.activities for select to authenticated 
  using (is_active = true or public.is_super_admin());

-- Admin full access
drop policy if exists "activities_admin" on public.activities;
create policy "activities_admin" on public.activities for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket: activities-media
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('activities-media', 'activities-media', true)
on conflict (id) do nothing;

-- Storage policies for activities-media
drop policy if exists "activities_media_read" on storage.objects;
create policy "activities_media_read" on storage.objects for select to authenticated
  using (bucket_id = 'activities-media');

drop policy if exists "activities_media_write" on storage.objects;
create policy "activities_media_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'activities-media' and public.is_super_admin());

drop policy if exists "activities_media_update" on storage.objects;
create policy "activities_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'activities-media' and public.is_super_admin());

drop policy if exists "activities_media_delete" on storage.objects;
create policy "activities_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'activities-media' and public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Updated at trigger
-- ---------------------------------------------------------------------------
create or replace function public.activities_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_activities_updated on public.activities;
create trigger trg_activities_updated
  before update on public.activities
  for each row execute procedure public.activities_touch_updated_at();
