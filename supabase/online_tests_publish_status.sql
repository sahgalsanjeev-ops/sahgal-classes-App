-- Add is_published column to online_tests table
ALTER TABLE public.online_tests 
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

-- Update existing tests to be published by default
UPDATE public.online_tests SET is_published = true WHERE is_published IS NULL;

COMMENT ON COLUMN public.online_tests.is_published IS 'True if the test is visible to students, false if it is a draft.';
