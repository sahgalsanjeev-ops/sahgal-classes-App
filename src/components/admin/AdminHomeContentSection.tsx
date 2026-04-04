import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ImageIcon, Trash2, Video, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { HomeBannerRow, LiveClassRow, TestimonialRow } from "@/lib/homeContent";

const AdminHomeContentSection = () => {
  const [banners, setBanners] = useState<HomeBannerRow[]>([]);
  const [lives, setLives] = useState<LiveClassRow[]>([]);
  const [stories, setStories] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [bannerLink, setBannerLink] = useState("");
  const [bannerSort, setBannerSort] = useState(0);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [liveTitle, setLiveTitle] = useState("");
  const [liveDesc, setLiveDesc] = useState("");
  const [liveStarts, setLiveStarts] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [liveSort, setLiveSort] = useState(0);

  const [storyName, setStoryName] = useState("");
  const [storyText, setStoryText] = useState("");
  const [storySort, setStorySort] = useState(0);
  const [storyFile, setStoryFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    const [b, l, t] = await Promise.all([
      supabase.from("home_banners").select("*").order("sort_order", { ascending: true }),
      supabase.from("live_classes").select("*").order("starts_at", { ascending: true }),
      supabase.from("testimonials").select("*").order("sort_order", { ascending: true }),
    ]);
    if (!b.error && b.data) setBanners(b.data as HomeBannerRow[]);
    if (!l.error && l.data) setLives(l.data as LiveClassRow[]);
    if (!t.error && t.data) setStories(t.data as TestimonialRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addBanner = async () => {
    if (!supabase || !bannerFile) {
      toast({ variant: "destructive", title: "Image required", description: "Choose a banner image." });
      return;
    }
    const safe = bannerFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `b/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("home-banners").upload(path, bannerFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: bannerFile.type || "image/jpeg",
    });
    if (upErr) {
      toast({ variant: "destructive", title: "Upload failed", description: upErr.message });
      return;
    }
    const { data: pub } = supabase.storage.from("home-banners").getPublicUrl(path);
    const { error } = await supabase.from("home_banners").insert({
      image_url: pub.publicUrl,
      link_url: bannerLink.trim() || null,
      sort_order: bannerSort,
      is_active: true,
    });
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return;
    }
    toast({ title: "Banner added" });
    setBannerLink("");
    setBannerFile(null);
    setBannerSort(0);
    await load();
  };

  const toggleBanner = async (row: HomeBannerRow) => {
    if (!supabase) return;
    const { error } = await supabase.from("home_banners").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) toast({ variant: "destructive", title: "Update failed", description: error.message });
    else void load();
  };

  const deleteBanner = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("home_banners").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else void load();
  };

  const addLive = async () => {
    if (!supabase || !liveTitle.trim() || !liveStarts) {
      toast({ variant: "destructive", title: "Required", description: "Title and start date/time required." });
      return;
    }
    const iso = new Date(liveStarts).toISOString();
    const { error } = await supabase.from("live_classes").insert({
      title: liveTitle.trim(),
      description: liveDesc.trim() || null,
      starts_at: iso,
      meeting_url: liveUrl.trim() || null,
      sort_order: liveSort,
      is_active: true,
    });
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return;
    }
    toast({ title: "Live class added" });
    setLiveTitle("");
    setLiveDesc("");
    setLiveStarts("");
    setLiveUrl("");
    setLiveSort(0);
    void load();
  };

  const deleteLive = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("live_classes").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else void load();
  };

  const toggleLive = async (row: LiveClassRow) => {
    if (!supabase) return;
    const { error } = await supabase.from("live_classes").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) toast({ variant: "destructive", title: "Update failed", description: error.message });
    else void load();
  };

  const addStory = async () => {
    if (!supabase || !storyFile || !storyText.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Photo and feedback text required." });
      return;
    }
    const safe = storyFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `t/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("testimonial-photos").upload(path, storyFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: storyFile.type || "image/jpeg",
    });
    if (upErr) {
      toast({ variant: "destructive", title: "Upload failed", description: upErr.message });
      return;
    }
    const { data: pub } = supabase.storage.from("testimonial-photos").getPublicUrl(path);
    const { error } = await supabase.from("testimonials").insert({
      photo_url: pub.publicUrl,
      feedback_text: storyText.trim(),
      student_name: storyName.trim() || null,
      sort_order: storySort,
      is_active: true,
    });
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
      return;
    }
    toast({ title: "Testimonial added" });
    setStoryName("");
    setStoryText("");
    setStoryFile(null);
    setStorySort(0);
    void load();
  };

  const toggleStory = async (row: TestimonialRow) => {
    if (!supabase) return;
    const { error } = await supabase.from("testimonials").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) toast({ variant: "destructive", title: "Update failed", description: error.message });
    else void load();
  };

  const deleteStory = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else void load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading home content…</p>;

  return (
    <Tabs defaultValue="banners" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-10">
        <TabsTrigger value="banners" className="text-xs gap-1">
          <ImageIcon size={14} /> Banners
        </TabsTrigger>
        <TabsTrigger value="live" className="text-xs gap-1">
          <Video size={14} /> Live
        </TabsTrigger>
        <TabsTrigger value="stories" className="text-xs gap-1">
          <MessageCircle size={14} /> Stories
        </TabsTrigger>
      </TabsList>

      <TabsContent value="banners" className="space-y-3 mt-4">
        <p className="text-xs text-muted-foreground">Slider on Home. Toggle active to show/hide without deleting.</p>
        <Input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)} />
        <Input value={bannerLink} onChange={(e) => setBannerLink(e.target.value)} placeholder="Optional link URL" />
        <Input type="number" value={bannerSort} onChange={(e) => setBannerSort(Number(e.target.value) || 0)} placeholder="Sort order" />
        <Button type="button" className="w-full bg-primary" onClick={() => void addBanner()}>
          Upload banner
        </Button>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {banners.map((b) => (
            <li key={b.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
              <img src={b.image_url} alt="" className="w-16 h-10 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{b.link_url || "No link"}</p>
                <p className="text-muted-foreground">{b.is_active ? "Active" : "Hidden"}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => void toggleBanner(b)}>
                {b.is_active ? "Hide" : "Show"}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => void deleteBanner(b.id)}>
                <Trash2 size={14} />
              </Button>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="live" className="space-y-3 mt-4">
        <Input value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} placeholder="Title" />
        <Textarea value={liveDesc} onChange={(e) => setLiveDesc(e.target.value)} placeholder="Description (optional)" className="min-h-[60px]" />
        <Input type="datetime-local" value={liveStarts} onChange={(e) => setLiveStarts(e.target.value)} />
        <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="Meeting / Zoom link" />
        <Input type="number" value={liveSort} onChange={(e) => setLiveSort(Number(e.target.value) || 0)} placeholder="Sort order" />
        <Button type="button" className="w-full bg-primary" onClick={() => void addLive()}>
          Add live class
        </Button>
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {lives.map((r) => (
            <li key={r.id} className="rounded-lg border p-2 text-xs space-y-1">
              <p className="font-semibold">{r.title}</p>
              <p className="text-muted-foreground">{format(new Date(r.starts_at), "dd MMM yyyy, h:mm a")}</p>
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={() => void toggleLive(r)}>
                  {r.is_active ? "Hide" : "Show"}
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void deleteLive(r.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="stories" className="space-y-3 mt-4">
        <Input type="file" accept="image/*" onChange={(e) => setStoryFile(e.target.files?.[0] ?? null)} />
        <Input value={storyName} onChange={(e) => setStoryName(e.target.value)} placeholder="Student name (optional)" />
        <Textarea value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="Feedback quote" className="min-h-[80px]" />
        <Input type="number" value={storySort} onChange={(e) => setStorySort(Number(e.target.value) || 0)} placeholder="Sort order" />
        <Button type="button" className="w-full bg-primary" onClick={() => void addStory()}>
          Add testimonial
        </Button>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {stories.map((t) => (
            <li key={t.id} className="flex gap-2 rounded-lg border p-2 text-xs">
              <img src={t.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{t.student_name ?? "Student"}</p>
                <p className="text-muted-foreground line-clamp-2">{t.feedback_text}</p>
                <div className="flex gap-2 mt-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => void toggleStory(t)}>
                    {t.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => void deleteStory(t.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
};

export default AdminHomeContentSection;
