-- Multi-Batch Enrollment System Setup

-- ---------------------------------------------------------------------------
-- Table: batch_enrollments
-- ---------------------------------------------------------------------------
create table if not exists public.batch_enrollments (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null, -- Links to batches.id
  student_email text not null, -- Links to profiles.email
  enrolled_at timestamptz not null default now(),
  
  -- Prevent duplicate enrollment in the same batch
  unique(batch_id, student_email)
);

-- Index for faster lookups
create index if not exists batch_enrollments_batch_idx on public.batch_enrollments (batch_id);
create index if not exists batch_enrollments_email_idx on public.batch_enrollments (student_email);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
alter table public.batch_enrollments enable row level security;

-- Everyone authenticated can read enrollments (needed for student to see their batches)
drop policy if exists "enrollments_read" on public.batch_enrollments;
create policy "enrollments_read" on public.batch_enrollments for select to authenticated
  using (true);

-- Only Admin can insert/delete/update (assuming is_super_admin function exists)
drop policy if exists "enrollments_admin" on public.batch_enrollments;
create policy "enrollments_admin" on public.batch_enrollments for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());
