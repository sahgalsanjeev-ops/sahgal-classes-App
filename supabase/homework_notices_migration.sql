-- Run in Supabase SQL Editor after profiles_setup.sql
-- Homework, submissions, notices, storage, profile locks (email + batch_code)

-- ---------------------------------------------------------------------------
-- Profiles: batch code for notice targeting; students cannot set (admin only)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists batch_code text;

create index if not exists profiles_batch_code_lower_idx on public.profiles (lower(trim(batch_code)));

-- Students updating their own row cannot change email (admins can change any student email)
create or replace function public.profiles_enforce_email_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' and auth.uid() = old.id then
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_email_lock on public.profiles;
create trigger trg_profiles_email_lock
  before update on public.profiles
  for each row
  execute procedure public.profiles_enforce_email_lock();

-- Only super-admins may set batch_code (students cannot self-assign batch)
create or replace function public.profiles_enforce_batch_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.batch_code := null;
    return new;
  end if;
  if new.batch_code is distinct from old.batch_code then
    new.batch_code := old.batch_code;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_batch_code on public.profiles;
create trigger trg_profiles_batch_code
  before insert or update on public.profiles
  for each row
  execute procedure public.profiles_enforce_batch_code();

-- ---------------------------------------------------------------------------
-- Homework
-- ---------------------------------------------------------------------------
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_date date not null,
  deadline timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists homework_deadline_idx on public.homework (deadline desc);

alter table public.homework enable row level security;

drop policy if exists "homework_select_auth" on public.homework;
create policy "homework_select_auth" on public.homework
  for select to authenticated
  using (true);

drop policy if exists "homework_write_admin" on public.homework;
create policy "homework_write_admin" on public.homework
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Homework submissions (one row per student per homework)
-- ---------------------------------------------------------------------------
create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  file_path text not null,
  submitted_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create index if not exists homework_submissions_student_idx on public.homework_submissions (student_id);
create index if not exists homework_submissions_hw_idx on public.homework_submissions (homework_id);

alter table public.homework_submissions enable row level security;

drop policy if exists "hw_sub_select" on public.homework_submissions;
create policy "hw_sub_select" on public.homework_submissions
  for select to authenticated
  using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists "hw_sub_insert" on public.homework_submissions;
create policy "hw_sub_insert" on public.homework_submissions
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.homework h where h.id = homework_id)
  );

drop policy if exists "hw_sub_update_own" on public.homework_submissions;
create policy "hw_sub_update_own" on public.homework_submissions
  for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "hw_sub_delete_admin" on public.homework_submissions;
create policy "hw_sub_delete_admin" on public.homework_submissions
  for delete to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Notices (audience: public | batch | rolls)
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience_type text not null check (audience_type in ('public', 'batch', 'rolls')),
  batch_code text,
  roll_numbers text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notices_created_idx on public.notices (created_at desc);

alter table public.notices enable row level security;

drop policy if exists "notices_select" on public.notices;
create policy "notices_select" on public.notices
  for select to authenticated
  using (
    public.is_super_admin()
    or audience_type = 'public'
    or (
      audience_type = 'batch'
      and batch_code is not null
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.batch_code is not null
          and lower(trim(p.batch_code)) = lower(trim(batch_code))
      )
    )
    or (
      audience_type = 'rolls'
      and cardinality(roll_numbers) > 0
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.roll_no is not null
          and exists (
            select 1
            from unnest(roll_numbers) as roll_val
            where lower(trim(p.roll_no)) = lower(trim(roll_val))
          )
      )
    )
  );

drop policy if exists "notices_write_admin" on public.notices;
create policy "notices_write_admin" on public.notices
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Storage: homework-submissions (path: {user_id}/{homework_id}/{filename})
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('homework-submissions', 'homework-submissions', false)
on conflict (id) do nothing;

drop policy if exists "hw_storage_select" on storage.objects;
create policy "hw_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'homework-submissions'
    and (
      public.is_super_admin()
      or split_part(name, '/', 1) = auth.uid()::text
    )
  );

drop policy if exists "hw_storage_insert" on storage.objects;
create policy "hw_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'homework-submissions'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "hw_storage_update" on storage.objects;
create policy "hw_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'homework-submissions'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'homework-submissions'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "hw_storage_delete" on storage.objects;
create policy "hw_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'homework-submissions'
    and (
      public.is_super_admin()
      or split_part(name, '/', 1) = auth.uid()::text
    )
  );
