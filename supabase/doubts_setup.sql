-- Run in Supabase SQL Editor: student doubts + file uploads

-- Storage bucket for photos and PDFs attached to doubts
insert into storage.buckets (id, name, public)
values ('doubt-uploads', 'doubt-uploads', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated upload doubt files" on storage.objects;
create policy "Authenticated upload doubt files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'doubt-uploads');

drop policy if exists "Public read doubt uploads" on storage.objects;
create policy "Public read doubt uploads"
on storage.objects
for select
to public
using (bucket_id = 'doubt-uploads');

-- Table: one row per doubt posted by a student
create table if not exists public.student_doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  photo_urls text[] not null default '{}',
  pdf_url text,
  created_at timestamptz not null default now()
);

alter table public.student_doubts enable row level security;

drop policy if exists "Students read own doubts" on public.student_doubts;
create policy "Students read own doubts"
on public.student_doubts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Students insert own doubts" on public.student_doubts;
create policy "Students insert own doubts"
on public.student_doubts
for insert
to authenticated
with check (auth.uid() = user_id);
