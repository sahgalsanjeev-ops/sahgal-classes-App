-- Course catalog hierarchy + home content. Run after profiles_setup.sql.
-- Optional: homework_id on course_lectures references public.homework if that table exists (run homework_notices_migration first to enable FK).
-- Keeps existing public.courses (flat lessons) untouched for legacy use.

-- ---------------------------------------------------------------------------
-- Level 1: Programs (course cards in app)
-- ---------------------------------------------------------------------------
create table if not exists public.course_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  accent_color text not null default '#1a56db',
  student_count integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_programs_sort_idx on public.course_programs (sort_order, title);

-- ---------------------------------------------------------------------------
-- Level 2: Chapters
-- ---------------------------------------------------------------------------
create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_program_id uuid not null references public.course_programs (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists course_chapters_program_idx on public.course_chapters (course_program_id, sort_order);

-- ---------------------------------------------------------------------------
-- Level 3: Lectures (video + notes + optional link to homework row)
-- ---------------------------------------------------------------------------
create table if not exists public.course_lectures (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters (id) on delete cascade,
  title text not null,
  video_url text not null default '',
  pdf_url text,
  sort_order integer not null default 0,
  homework_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists course_lectures_chapter_idx on public.course_lectures (chapter_id, sort_order);

-- ---------------------------------------------------------------------------
-- Student progress (per lecture)
-- ---------------------------------------------------------------------------
create table if not exists public.lecture_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  lecture_id uuid not null references public.course_lectures (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lecture_id)
);

create index if not exists lecture_completions_user_idx on public.lecture_completions (user_id);

-- ---------------------------------------------------------------------------
-- Home: banners, live classes, testimonials
-- ---------------------------------------------------------------------------
create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  link_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  meeting_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists live_classes_starts_idx on public.live_classes (starts_at);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  feedback_text text not null,
  student_name text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Touch updated_at on programs
-- ---------------------------------------------------------------------------
create or replace function public.course_programs_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists trg_course_programs_updated on public.course_programs;
create trigger trg_course_programs_updated
  before update on public.course_programs
  for each row execute procedure public.course_programs_touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.course_programs enable row level security;
alter table public.course_chapters enable row level security;
alter table public.course_lectures enable row level security;
alter table public.lecture_completions enable row level security;
alter table public.home_banners enable row level security;
alter table public.live_classes enable row level security;
alter table public.testimonials enable row level security;

-- Read catalog for any authenticated user
drop policy if exists "course_programs_read" on public.course_programs;
create policy "course_programs_read" on public.course_programs for select to authenticated using (true);
drop policy if exists "course_programs_admin" on public.course_programs;
create policy "course_programs_admin" on public.course_programs for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "course_chapters_read" on public.course_chapters;
create policy "course_chapters_read" on public.course_chapters for select to authenticated using (true);
drop policy if exists "course_chapters_admin" on public.course_chapters;
create policy "course_chapters_admin" on public.course_chapters for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "course_lectures_read" on public.course_lectures;
create policy "course_lectures_read" on public.course_lectures for select to authenticated using (true);
drop policy if exists "course_lectures_admin" on public.course_lectures;
create policy "course_lectures_admin" on public.course_lectures for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "lecture_completions_read" on public.lecture_completions;
create policy "lecture_completions_read" on public.lecture_completions for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists "lecture_completions_ins" on public.lecture_completions;
create policy "lecture_completions_ins" on public.lecture_completions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "lecture_completions_upd" on public.lecture_completions;
create policy "lecture_completions_upd" on public.lecture_completions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "lecture_completions_del" on public.lecture_completions;
create policy "lecture_completions_del" on public.lecture_completions for delete to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "home_banners_read" on public.home_banners;
create policy "home_banners_read" on public.home_banners for select to authenticated using (is_active = true or public.is_super_admin());
drop policy if exists "home_banners_admin" on public.home_banners;
create policy "home_banners_admin" on public.home_banners for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "live_classes_read" on public.live_classes;
create policy "live_classes_read" on public.live_classes for select to authenticated using (is_active = true or public.is_super_admin());
drop policy if exists "live_classes_admin" on public.live_classes;
create policy "live_classes_admin" on public.live_classes for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "testimonials_read" on public.testimonials;
create policy "testimonials_read" on public.testimonials for select to authenticated using (is_active = true or public.is_super_admin());
drop policy if exists "testimonials_admin" on public.testimonials;
create policy "testimonials_admin" on public.testimonials for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets (admin upload)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('home-banners', 'home-banners', true),
  ('testimonial-photos', 'testimonial-photos', true)
on conflict (id) do nothing;

drop policy if exists "home_banners_storage_read" on storage.objects;
create policy "home_banners_storage_read" on storage.objects for select to authenticated
  using (bucket_id = 'home-banners');

drop policy if exists "home_banners_storage_write" on storage.objects;
create policy "home_banners_storage_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'home-banners' and public.is_super_admin());

drop policy if exists "home_banners_storage_update" on storage.objects;
create policy "home_banners_storage_update" on storage.objects for update to authenticated
  using (bucket_id = 'home-banners' and public.is_super_admin());

drop policy if exists "home_banners_storage_delete" on storage.objects;
create policy "home_banners_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'home-banners' and public.is_super_admin());

drop policy if exists "testimonial_photos_storage_read" on storage.objects;
create policy "testimonial_photos_storage_read" on storage.objects for select to authenticated
  using (bucket_id = 'testimonial-photos');

drop policy if exists "testimonial_photos_storage_write" on storage.objects;
create policy "testimonial_photos_storage_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'testimonial-photos' and public.is_super_admin());

drop policy if exists "testimonial_photos_storage_update" on storage.objects;
create policy "testimonial_photos_storage_update" on storage.objects for update to authenticated
  using (bucket_id = 'testimonial-photos' and public.is_super_admin());

drop policy if exists "testimonial_photos_storage_delete" on storage.objects;
create policy "testimonial_photos_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'testimonial-photos' and public.is_super_admin());
