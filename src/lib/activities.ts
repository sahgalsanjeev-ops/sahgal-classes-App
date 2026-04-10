import { supabase } from "./supabase";

export interface ActivityRow {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export async function getActivities() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
  return (data as ActivityRow[]) || [];
}

export async function getAllActivities() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all activities:", error);
    return [];
  }
  return (data as ActivityRow[]) || [];
}

export async function deleteActivity(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadActivityMedia(file: File) {
  if (!supabase) throw new Error("Supabase not initialized");

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("activities-media")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("activities-media").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function createActivity(payload: {
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  sort_order?: number;
}) {
  if (!supabase) throw new Error("Supabase not initialized");
  const { error } = await supabase.from("activities").insert([payload]);
  if (error) throw error;
}

export async function updateActivity(
  id: string,
  payload: {
    media_url?: string;
    media_type?: "image" | "video";
    caption?: string;
    sort_order?: number;
    is_active?: boolean;
  },
) {
  if (!supabase) throw new Error("Supabase not initialized");
  const { error } = await supabase.from("activities").update(payload).eq("id", id);
  if (error) throw error;
}
