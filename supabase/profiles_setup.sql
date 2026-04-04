-- Student profiles (run in Supabase SQL editor)
-- Links to auth.users; roll_no only settable by super-admins (see trigger).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null,
  mobile text not null,
  roll_no text,
  class_selection text not null check (class_selection in ('11th', '12th', '12th_pass')),
  marks_10_maths text,
  marks_12_maths text,
  father_name text,
  father_occupation_type text check (father_occupation_type is null or father_occupation_type in ('Service', 'Business', 'Other')),
  father_occupation_details text,
  mother_name text,
  mother_occupation text,
  guardian_name text,
  guardian_mobile text,
  guardian_email text,
  address text,
  city text,
  state text,
  country text,
  pin_code text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));

alter table public.profiles enable row level security;

-- Super-admin check (keep in sync with src/lib/adminAccess.ts)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(nullif(trim((auth.jwt() ->> 'email')), ''), '')) in (
    'sahgal.sanjeev@gmail.com',
    'sahgalclasses@gmail.com'
  );
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_super_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id and not public.is_super_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_super_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id and not public.is_super_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_super_admin());

-- Students cannot set roll_no; only super-admins can (trigger + insert wipe).
create or replace function public.profiles_enforce_roll_no()
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
    new.roll_no := null;
    return new;
  end if;
  if new.roll_no is distinct from old.roll_no then
    new.roll_no := old.roll_no;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_roll_no on public.profiles;
create trigger trg_profiles_roll_no
  before insert or update on public.profiles
  for each row execute procedure public.profiles_enforce_roll_no();

create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.profiles_touch_updated_at();
