-- Optional: assign an online test to a batch by matching Batch Manager "Batch code".
-- Run this in the Supabase SQL editor if the column does not exist yet.
alter table public.online_tests
  add column if not exists batch_code text;

comment on column public.online_tests.batch_code is
  'When set (trimmed, matches batch batchCode), the test appears under Profile → My Batch for students in that batch. Leave empty for app-wide Tests tab only.';
