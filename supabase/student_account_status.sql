-- Run in Supabase SQL editor after profiles exist.
-- Student lifecycle for admin Actions (Active / Inactive / Block).

alter table public.profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'inactive', 'blocked'));

comment on column public.profiles.account_status is 'Admin-set: active, inactive, or blocked.';
