-- SQL Migration to move batches to database and link with profiles
-- Run this in the Supabase SQL editor

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null,
  course_name text,
  batch_code text unique not null,
  timing text,
  teacher_name text,
  created_at timestamptz default now()
);

-- Enable RLS on batches
alter table public.batches enable row level security;

-- Policies for batches
drop policy if exists "batches_select_all" on public.batches;
create policy "batches_select_all" on public.batches
  for select using (true);

drop policy if exists "batches_insert_admin" on public.batches;
create policy "batches_insert_admin" on public.batches
  for insert with check (public.is_super_admin());

drop policy if exists "batches_update_admin" on public.batches;
create policy "batches_update_admin" on public.batches
  for update using (public.is_super_admin());

drop policy if exists "batches_delete_admin" on public.batches;
create policy "batches_delete_admin" on public.batches
  for delete using (public.is_super_admin());

-- Add batch_id to profiles and link it
alter table public.profiles 
  add column if not exists batch_id uuid references public.batches(id);

-- Update profiles to have batch_code as well (optional, but good for backward compatibility)
alter table public.profiles 
  add column if not exists batch_code text;
