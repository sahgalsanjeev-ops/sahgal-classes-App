import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { FileText, ImagePlus, Loader2, MessageCircle, Send, Trash2, FileUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const MAX_PHOTOS = 5;
const BUCKET = "doubt-uploads";

type DoubtRow = {
  id: string;
  question: string;
  photo_urls: string[];
  pdf_url: string | null;
  created_at: string;
};

const DoubtsPage = () => {
  const [newDoubt, setNewDoubt] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<DoubtRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadDoubts = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoadingList(false);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoadingList(false);
      return;
    }

    const { data, error } = await supabase
      .from("student_doubts")
      .select("id, question, photo_urls, pdf_url, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data as DoubtRow[]);
    } else if (error) {
      console.error("student_doubts:", error.message);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    void loadDoubts();
  }, [loadDoubts]);

  const onPickPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setPhotoFiles((prev) => {
      const next = [...prev, ...files].slice(0, MAX_PHOTOS);
      if (prev.length + files.length > MAX_PHOTOS) {
        toast({ title: "Photo limit", description: `You can attach up to ${MAX_PHOTOS} photos.` });
      }
      return next;
    });
    e.target.value = "";
  };

  const onPickPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "Invalid file", description: "Please choose a PDF file." });
      e.target.value = "";
      return;
    }
    setPdfFile(file);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const photoPreviewUrls = useMemo(() => photoFiles.map((f) => URL.createObjectURL(f)), [photoFiles]);
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const submit = async () => {
    const q = newDoubt.trim();
    if (!q) {
      toast({ variant: "destructive", title: "Empty doubt", description: "Please write your doubt." });
      return;
    }
    if (!supabase || !isSupabaseConfigured) {
      toast({
        variant: "destructive",
        title: "Not connected",
        description: "Configure Supabase in your .env file.",
      });
      return;
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      toast({ variant: "destructive", title: "Sign in required", description: "Please log in to post a doubt." });
      return;
    }

    const userId = userData.user.id;
    setSubmitting(true);

    try {
      const photoUrls: string[] = [];
      const base = `${userId}/${Date.now()}`;

      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${base}-img-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        photoUrls.push(pub.publicUrl);
      }

      let pdfUrl: string | null = null;
      if (pdfFile) {
        const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${base}-${safeName}`;
        const { error: pdfErr } = await supabase.storage.from(BUCKET).upload(path, pdfFile, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });
        if (pdfErr) throw new Error(pdfErr.message);
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        pdfUrl = pub.publicUrl;
      }

      const { error: insErr } = await supabase.from("student_doubts").insert({
        user_id: userId,
        question: q,
        photo_urls: photoUrls,
        pdf_url: pdfUrl,
      });

      if (insErr) throw new Error(insErr.message);

      toast({ title: "Doubt submitted", description: "Your teacher will review it soon." });
      setNewDoubt("");
      setPhotoFiles([]);
      setPdfFile(null);
      await loadDoubts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit doubt.";
      toast({ variant: "destructive", title: "Submit failed", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <AppHeader />

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <label className="text-sm font-semibold text-foreground">Ask a doubt</label>
          <textarea
            placeholder="Describe your doubt…"
            value={newDoubt}
            onChange={(e) => setNewDoubt(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
          />

          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPickPhotos} />
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary",
                  photoFiles.length >= MAX_PHOTOS && "opacity-50 pointer-events-none",
                )}
              >
                <ImagePlus size={16} />
                Photos ({photoFiles.length}/{MAX_PHOTOS})
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept="application/pdf" className="hidden" onChange={onPickPdf} />
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                <FileUp size={16} />
                {pdfFile ? pdfFile.name.slice(0, 24) + (pdfFile.name.length > 24 ? "…" : "") : "PDF"}
              </span>
            </label>
          </div>

          {photoFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoPreviewUrls.map((src, i) => (
                <div key={`${photoFiles[i]?.name}-${i}`} className="relative group">
                  <img
                    src={src}
                    alt=""
                    className="h-20 w-20 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                    aria-label="Remove photo"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pdfFile && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-foreground truncate">
                <FileText size={16} className="text-primary shrink-0" />
                <span className="truncate">{pdfFile.name}</span>
              </span>
              <button type="button" onClick={() => setPdfFile(null)} className="text-destructive p-1">
                <Trash2 size={16} />
              </button>
            </div>
          )}

          <Button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full h-11 gap-2 bg-primary hover:bg-primary/90"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? "Sending…" : "Submit doubt"}
          </Button>
        </div>

        <div>
          <h2 className="text-base font-bold text-foreground mb-3">Your doubts</h2>
          {loadingList && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loadingList && !isSupabaseConfigured && (
            <p className="text-sm text-muted-foreground">Connect Supabase to save and list doubts.</p>
          )}
          {!loadingList && isSupabaseConfigured && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 px-4 py-8 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-primary/60 mb-2" />
              <p className="text-sm font-medium text-foreground">No doubts yet</p>
              <p className="text-xs text-muted-foreground mt-1">Submit your first question with optional photos or a PDF.</p>
            </div>
          )}
          <div className="space-y-3">
            {rows.map((doubt) => (
              <div key={doubt.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={16} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{doubt.question}</p>
                    {doubt.photo_urls?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {doubt.photo_urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    {doubt.pdf_url && (
                      <a
                        href={doubt.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-xs font-semibold text-primary"
                      >
                        <FileText size={14} />
                        View attached PDF
                      </a>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">{formatTime(doubt.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubtsPage;
