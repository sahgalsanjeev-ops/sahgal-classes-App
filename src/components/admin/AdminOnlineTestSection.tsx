import { useEffect, useState } from "react";
import { Plus, Trash2, ClipboardList, ImagePlus, X, Pencil, Loader2, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { makeId } from "@/lib/batches";
import type { McqQuestionJson, OnlineTestRow } from "@/lib/onlineTests";
import { KaTeXText } from "@/components/KaTeXText";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TestResultList from "./TestResultList";

const STORAGE_BUCKET = "lesson-pdfs";
const IMAGE_PREFIX = "online-test-images";

function extFromFile(f: File): string {
  if (f.type === "image/png") return "png";
  if (f.type === "image/jpeg" || f.type === "image/jpg") return "jpg";
  if (f.type === "image/webp") return "webp";
  if (f.type === "image/gif") return "gif";
  return "png";
}

type DraftQuestion = {
  id: string;
  text: string;
  imageFile: File | null;
  /** blob: URL for preview only */
  imagePreviewUrl: string | null;
  opt0: string;
  opt1: string;
  opt2: string;
  opt3: string;
  correctIndex: number;
};

const emptyQuestion = (): DraftQuestion => ({
  id: makeId(),
  text: "",
  imageFile: null,
  imagePreviewUrl: null,
  opt0: "",
  opt1: "",
  opt2: "",
  opt3: "",
  correctIndex: 0,
});

const AdminOnlineTestSection = () => {
  const [testTitle, setTestTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  /** Same value as "Batch code" in Batch Manager; leave empty for app-wide Tests only. */
  const [batchCode, setBatchCode] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Edit states
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [viewingResultsId, setViewingResultsId] = useState<string | null>(null);

  // List states
  const [publishedTests, setPublishedTests] = useState<OnlineTestRow[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);

  const fetchTests = async () => {
    if (!supabase) return;
    setLoadingTests(true);
    try {
      const { data, error } = await supabase
        .from("online_tests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPublishedTests((data ?? []) as OnlineTestRow[]);
    } catch (err: any) {
      console.error("Fetch tests error:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not load tests." });
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    void fetchTests();
  }, []);

  const addQuestion = () => setQuestions((q) => [...q, emptyQuestion()]);
  const removeQuestion = (index: number) => {
    setQuestions((q) => {
      if (q.length <= 1) return q;
      const removed = q[index];
      if (removed.imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.imagePreviewUrl);
      }
      return q.filter((_, i) => i !== index);
    });
  };

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((q) => q.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const onPickImage = (index: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please choose an image (PNG, JPG, WebP, GIF)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max size is 5 MB." });
      return;
    }
    setQuestions((q) =>
      q.map((item, i) => {
        if (i !== index) return item;
        if (item.imagePreviewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.imagePreviewUrl);
        }
        const url = URL.createObjectURL(file);
        return { ...item, imageFile: file, imagePreviewUrl: url };
      }),
    );
  };

  const clearImage = (index: number) => {
    setQuestions((q) =>
      q.map((item, i) => {
        if (i !== index) return item;
        if (item.imagePreviewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.imagePreviewUrl);
        }
        return { ...item, imageFile: null, imagePreviewUrl: null };
      }),
    );
  };

  const uploadQuestionImage = async (q: DraftQuestion): Promise<string | null> => {
    if (!q.imageFile || !supabase) return null;
    const ext = extFromFile(q.imageFile);
    const path = `${IMAGE_PREFIX}/${Date.now()}-${q.id}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, q.imageFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: q.imageFile.type || `image/${ext}`,
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleDeleteTest = async (id: string) => {
    if (!supabase) return;
    const ok = window.confirm("Are you sure you want to delete this test? This action cannot be undone.");
    if (!ok) return;

    try {
      setSaving(true);
      // Use count: 'exact' to see if a row was actually deleted
      const { error, count } = await supabase
        .from("online_tests")
        .delete({ count: 'exact' })
        .eq("id", id);

      if (error) throw error;

      if (count === 0) {
        throw new Error("No test was deleted. You might not have permission or the test ID is invalid.");
      }
      
      // Update local state immediately
      setPublishedTests((prev) => prev.filter((t) => t.id !== id));
      
      toast({ title: "Deleted", description: "Test removed successfully from database." });
    } catch (err: any) {
      console.error("Delete test error:", err);
      toast({ 
        variant: "destructive", 
        title: "Delete failed", 
        description: err.message || "Check your database RLS policies for the 'online_tests' table." 
      });
      // Re-fetch to ensure UI matches DB state if delete failed
      void fetchTests();
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (test: OnlineTestRow) => {
    setEditingTestId(test.id);
    setTestTitle(test.test_title);
    setDurationMinutes(String(test.duration_minutes));
    setBatchCode(test.batch_code ?? "");
    setQuestions(
      test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        imageFile: null,
        imagePreviewUrl: q.image_url ?? null,
        opt0: q.options[0] ?? "",
        opt1: q.options[1] ?? "",
        opt2: q.options[2] ?? "",
        opt3: q.options[3] ?? "",
        correctIndex: q.correct_index,
      })),
    );
    setActiveTab("create");
  };

  const resetForm = () => {
    setEditingTestId(null);
    setTestTitle("");
    setDurationMinutes("30");
    setBatchCode("");
    for (const q of questions) {
      if (q.imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(q.imagePreviewUrl);
    }
    setQuestions([emptyQuestion()]);
  };

  const handleSave = async () => {
    if (!testTitle.trim()) {
      toast({ variant: "destructive", title: "Title required", description: "Enter a test title." });
      return;
    }
    const dur = parseInt(durationMinutes, 10);
    if (!Number.isFinite(dur) || dur < 1) {
      toast({ variant: "destructive", title: "Invalid duration", description: "Enter duration in minutes (at least 1)." });
      return;
    }

    const built: McqQuestionJson[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const hasText = q.text.trim().length > 0;
      const hasImage = Boolean(q.imageFile || q.imagePreviewUrl);
      if (!hasText && !hasImage) {
        toast({
          variant: "destructive",
          title: "Question needs content",
          description: `Add question text (with optional LaTeX) or upload an image for question ${i + 1}.`,
        });
        return;
      }

      const opts = [q.opt0.trim(), q.opt1.trim(), q.opt2.trim(), q.opt3.trim()];
      const anyOpt = opts.some((o) => o.length > 0);
      const allOpt = opts.every((o) => o.length > 0);
      if (anyOpt && !allOpt) {
        toast({
          variant: "destructive",
          title: "Options incomplete",
          description: `For question ${i + 1}, either leave all four options empty (students see A–D only) or fill all four.`,
        });
        return;
      }
      if (q.correctIndex < 0 || q.correctIndex > 3) {
        toast({ variant: "destructive", title: "Correct answer", description: `Pick A–D for question ${i + 1}.` });
        return;
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      toast({
        variant: "destructive",
        title: "Supabase not configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
      });
      return;
    }

    setSaving(true);
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let imageUrl = q.imagePreviewUrl;
        if (q.imageFile) {
          imageUrl = await uploadQuestionImage(q);
        }

        const opts = [q.opt0.trim(), q.opt1.trim(), q.opt2.trim(), q.opt3.trim()] as [string, string, string, string];

        built.push({
          id: q.id,
          text: q.text.trim(),
          ...(imageUrl ? { image_url: imageUrl } : {}),
          options: opts,
          correct_index: q.correctIndex,
        });
      }

      const code = batchCode.trim();
      const payload = {
        test_title: testTitle.trim(),
        duration_minutes: dur,
        questions: built,
        batch_code: code || null,
      };

      if (editingTestId) {
        const { error } = await supabase.from("online_tests").update(payload).eq("id", editingTestId);
        if (error) throw error;
        toast({ title: "Success", description: "Test updated successfully." });
      } else {
        const { error } = await supabase.from("online_tests").insert(payload);
        if (error) throw error;
        toast({
          title: "Test published",
          description: code
            ? `Assigned to batch code ${code}. Students see it under Profile → My Batch.`
            : "Students can see it under Tests.",
        });
      }

      resetForm();
      void fetchTests();
      setActiveTab("list");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save test.";
      toast({
        variant: "destructive",
        title: "Save failed",
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Manage Tests</TabsTrigger>
          <TabsTrigger value="create">{editingTestId ? "Edit Test" : "Create Test"}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-4">
          {viewingResultsId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-primary font-bold uppercase tracking-tight"
                  onClick={() => setViewingResultsId(null)}
                >
                  <ArrowLeft size={16} />
                  Back to List
                </Button>
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
                  {publishedTests.find(t => t.id === viewingResultsId)?.test_title} Results
                </h3>
              </div>
              <TestResultList testId={viewingResultsId} />
            </div>
          ) : loadingTests ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="animate-spin mb-2" size={24} />
              <p className="text-sm">Loading tests...</p>
            </div>
          ) : publishedTests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">No tests published yet.</p>
              <Button variant="link" className="text-primary mt-1" onClick={() => setActiveTab("create")}>
                Create your first test
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedTests.map((test) => (
                <div key={test.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-foreground truncate">{test.test_title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {test.questions.length} Questions • {test.duration_minutes} min
                        {test.batch_code ? ` • Batch: ${test.batch_code}` : " • Global"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1.5 text-[11px] font-bold uppercase tracking-tight border-primary/20 hover:bg-primary/5 hover:text-primary"
                        onClick={() => setViewingResultsId(test.id)}
                      >
                        <BarChart3 size={14} />
                        Results
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditClick(test)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4 pt-4">
          {editingTestId && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-primary">Editing: {testTitle}</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetForm}>
                Cancel Edit
              </Button>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <ClipboardList size={16} className="text-primary" />
              {editingTestId ? "Edit Test" : "New online test (MCQ)"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Saved to <span className="font-mono">online_tests</span>. Images upload to bucket{" "}
              <span className="font-mono">{STORAGE_BUCKET}</span>/{IMAGE_PREFIX}/. Use <span className="font-mono">$...$</span>{" "}
              for inline math and <span className="font-mono">$$...$$</span> for display math.
            </p>
            <Input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} placeholder="Test title" />
            <div>
              <label className="text-sm font-medium text-foreground">Duration (minutes)</label>
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Batch code (optional)</label>
              <Input
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="e.g. same as Batch Manager → Batch code"
                className="mt-1 font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                If set, this test appears under <span className="font-semibold text-foreground">Profile → My Batch</span> for
                students in that batch only (not on the main Tests tab). Leave blank to publish for everyone on Tests.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">Question {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8"
                    onClick={() => removeQuestion(index)}
                    disabled={questions.length <= 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Question text (optional if you use an image)</label>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(index, { text: e.target.value })}
                    placeholder={'e.g. Solve $x^2 - 5x + 6 = 0$ or $$\\\\int_0^1 x\\\\,dx$$'}
                    className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Inline: <code className="font-mono">$...$</code> · Display: <code className="font-mono">$$...$$</code>
                  </p>
                  {q.text.trim() ? (
                    <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Preview</p>
                      <KaTeXText text={q.text} />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Question image (optional)</label>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted/50">
                      <ImagePlus size={16} />
                      Upload image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => onPickImage(index, e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {q.imagePreviewUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 gap-1"
                        onClick={() => clearImage(index)}
                      >
                        <X size={14} /> Remove image
                      </Button>
                    ) : null}
                  </div>
                  {q.imagePreviewUrl ? (
                    <div className="mt-2 rounded-lg border border-border bg-background p-2 overflow-hidden">
                      <img src={q.imagePreviewUrl} alt="" className="max-h-48 w-full object-contain mx-auto" />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Answer choices (optional)</label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Leave all empty to show only A, B, C, D. Or add text / LaTeX in each option for all four.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-primary">A</span>
                      <Input
                        value={q.opt0}
                        onChange={(e) => updateQuestion(index, { opt0: e.target.value })}
                        placeholder="Optional"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-primary">B</span>
                      <Input
                        value={q.opt1}
                        onChange={(e) => updateQuestion(index, { opt1: e.target.value })}
                        placeholder="Optional"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-primary">C</span>
                      <Input
                        value={q.opt2}
                        onChange={(e) => updateQuestion(index, { opt2: e.target.value })}
                        placeholder="Optional"
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-primary">D</span>
                      <Input
                        value={q.opt3}
                        onChange={(e) => updateQuestion(index, { opt3: e.target.value })}
                        placeholder="Optional"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Correct answer</label>
                  <select
                    value={q.correctIndex}
                    onChange={(e) => updateQuestion(index, { correctIndex: parseInt(e.target.value, 10) })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value={0}>A</option>
                    <option value={1}>B</option>
                    <option value={2}>C</option>
                    <option value={3}>D</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" className="w-full gap-2" onClick={addQuestion}>
            <Plus size={16} />
            Add question
          </Button>

          <Button type="button" className="w-full h-11" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editingTestId ? "Update test" : "Publish test"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOnlineTestSection;
