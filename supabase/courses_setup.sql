-- Run this in Supabase SQL Editor

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_url text not null,
  pdf_url text not null,
  category text not null check (category in ('Algebra', 'Geometry')),
  created_at timestamptz not null default now()
);

-- Optional but recommended: bucket for lesson PDFs used by Admin Page
insert into storage.buckets (id, name, public)
values ('lesson-pdfs', 'lesson-pdfs', true)
on conflict (id) do nothing;

-- Storage policies (authenticated users can upload/read)
drop policy if exists "Authenticated upload lesson PDFs" on storage.objects;
create policy "Authenticated upload lesson PDFs"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lesson-pdfs');

drop policy if exists "Public read lesson PDFs" on storage.objects;
create policy "Public read lesson PDFs"
on storage.objects
for select
to public
using (bucket_id = 'lesson-pdfs');
