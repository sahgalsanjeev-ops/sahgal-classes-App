-- Create test_attempts table
create table if not exists public.test_attempts (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references public.online_tests(id) on delete cascade,
  student_email text not null,
  score int not null,
  total_questions int not null,
  answers jsonb, -- Record<string, number> where string is question_id and number is selected_option index
  time_taken int, -- in seconds
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.test_attempts enable row level security;

-- Policies (assuming profiles table has role)
drop policy if exists "Students can insert their own attempts" on public.test_attempts;
create policy "Students can insert their own attempts"
  on public.test_attempts for insert
  with check (auth.jwt() ->> 'email' = student_email);

drop policy if exists "Students can see their own attempts" on public.test_attempts;
create policy "Students can see their own attempts"
  on public.test_attempts for select
  using (auth.jwt() ->> 'email' = student_email);

drop policy if exists "Admins can see all attempts" on public.test_attempts;
create policy "Admins can see all attempts"
  on public.test_attempts for select
  using (
    public.is_super_admin()
  );
