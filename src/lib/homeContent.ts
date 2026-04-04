import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type HomeBannerRow = {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type LiveClassRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  meeting_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type TestimonialRow = {
  id: string;
  photo_url: string;
  feedback_text: string;
  student_name: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function fetchActiveBanners(): Promise<HomeBannerRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("home_banners")
    .select("id, image_url, link_url, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as HomeBannerRow[];
}

export async function fetchUpcomingLiveClasses(limit = 24): Promise<LiveClassRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("live_classes")
    .select("id, title, description, starts_at, meeting_url, sort_order, is_active")
    .eq("is_active", true)
    .order("starts_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as LiveClassRow[];
}

export async function fetchActiveTestimonials(): Promise<TestimonialRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, photo_url, feedback_text, student_name, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as TestimonialRow[];
}
