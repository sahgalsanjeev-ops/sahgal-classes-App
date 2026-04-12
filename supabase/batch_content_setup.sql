-- Batch content management (Videos, PDFs, Homework, Tests)
create table if not exists public.batch_content (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  type text not null check (type in ('Video', 'PDF', 'HW', 'Test')),
  title text not null,
  url_or_note text,
  file_path text, -- For uploaded PDFs/materials
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.batch_content enable row level security;

-- Policies
drop policy if exists "batch_content_select" on public.batch_content;
create policy "batch_content_select" on public.batch_content
  for select using (true); -- Everyone can view (protected by batch access logic in app)

drop policy if exists "batch_content_insert_admin" on public.batch_content;
create policy "batch_content_insert_admin" on public.batch_content
  for insert with check (public.is_super_admin());

drop policy if exists "batch_content_update_admin" on public.batch_content;
create policy "batch_content_update_admin" on public.batch_content
  for update using (public.is_super_admin());

drop policy if exists "batch_content_delete_admin" on public.batch_content;
create policy "batch_content_delete_admin" on public.batch_content
  for delete using (public.is_super_admin());

-- Storage Bucket for course materials
-- Note: Buckets are usually created via Supabase Dashboard or API, but we can document it.
-- insert into storage.buckets (id, name, public) values ('course-materials', 'course-materials', true);
