-- SQL to setup or update the 'batches' table with all necessary columns.
-- Run this in your Supabase SQL Editor.

create table if not exists public.batches (
  id text primary key,
  batch_name text not null,
  course_name text,
  batch_code text,
  timing text,
  teacher_name text,
  videos jsonb default '[]'::jsonb,
  homework jsonb default '[]'::jsonb,
  study_material_pdfs jsonb default '[]'::jsonb,
  test_papers jsonb default '[]'::jsonb,
  students jsonb default '[]'::jsonb,
  attendance_records jsonb default '[]'::jsonb,
  homework_records jsonb default '[]'::jsonb,
  test_marks_records jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- In case the table exists but is missing columns:
alter table public.batches 
  add column if not exists course_name text,
  add column if not exists batch_code text,
  add column if not exists timing text,
  add column if not exists teacher_name text,
  add column if not exists videos jsonb default '[]'::jsonb,
  add column if not exists homework jsonb default '[]'::jsonb,
  add column if not exists study_material_pdfs jsonb default '[]'::jsonb,
  add column if not exists test_papers jsonb default '[]'::jsonb,
  add column if not exists students jsonb default '[]'::jsonb,
  add column if not exists attendance_records jsonb default '[]'::jsonb,
  add column if not exists homework_records jsonb default '[]'::jsonb,
  add column if not exists test_marks_records jsonb default '[]'::jsonb;

-- Ensure batch_code is unique (optional but recommended for student linking)
-- alter table public.batches add constraint batches_batch_code_key unique (batch_code);

-- Enable RLS
alter table public.batches enable row level security;

-- Basic policy: allow all authenticated users (students/admins) to read
create policy "Allow read access to authenticated users"
  on public.batches for select
  using (auth.role() = 'authenticated');

-- Allow all access to admins (optional: adjust if you have a specific admin role)
create policy "Allow all access to authenticated users"
  on public.batches for all
  using (auth.role() = 'authenticated');
