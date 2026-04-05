import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const hasEnv = Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());

function createSafeClient(): SupabaseClient | null {
  if (!hasEnv || !supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Supabase client failed to initialize (check VITE_SUPABASE_URL / key on Vercel).", e);
    return null;
  }
}

export const supabase = createSafeClient();

/** True only when a working client exists (avoids white screen if env is set but invalid). */
export const isSupabaseConfigured = supabase !== null;

if (!hasEnv) {
  console.warn("Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
} else if (!isSupabaseConfigured) {
  console.warn("Supabase env vars are present but the client could not be created.");
}
