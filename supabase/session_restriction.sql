-- Add current_session_id to profiles table for single device login restriction
alter table public.profiles 
  add column if not exists current_session_id text;

comment on column public.profiles.current_session_id is 'Stores unique ID of the current active session for single-device restriction.';
