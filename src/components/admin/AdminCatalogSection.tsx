import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CourseChapterRow, CourseLectureRow, CourseProgramRow } from "@/lib/catalog";

const AdminCatalogSection = () => {
  const [programs, setPrograms] = useState<CourseProgramRow[]>([]);
  const [chapters, setChapters] = useState<CourseChapterRow[]>([]);
  const [lectures, setLectures] = useState<CourseLectureRow[]>([]);
  const [selProgram, setSelProgram] = useState("");
  const [selChapter, setSelChapter] = useState("");

  const [pTitle, setPTitle] = useState("");
  const [pSub, setPSub] = useState("");
  const [pColor, setPColor] = useState("#1a56db");
  const [pStudents, setPStudents] = useState(0);
  const [pSort, setPSort] = useState(0);
  const [editProgramId, setEditProgramId] = useState<string | null>(null);

  const [cTitle, setCTitle] = useState("");
  const [cSort, setCSort] = useState(0);
  const [editChapterId, setEditChapterId] = useState<string | null>(null);

  const [lTitle, setLTitle] = useState("");
  const [lVideo, setLVideo] = useState("");
  const [lSort, setLSort] = useState(0);
  const [lHw, setLHw] = useState("");
  const [lPdf, setLPdf] = useState<File | null>(null);
  const [editLectureId, setEditLectureId] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("course_programs")
      .select("id, title, subtitle, accent_color, student_count, sort_order")
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ variant: "destructive", title: "Load failed", description: error.message });
      return;
    }
    setPrograms((data ?? []) as CourseProgramRow[]);
  }, []);

  const loadChapters = useCallback(async (programId: string) => {
    if (!supabase || !programId) {
      setChapters([]);
      return;
    }
    const { data, error } = await supabase
      .from("course_chapters")
      .select("id, course_program_id, title, sort_order")
      .eq("course_program_id", programId)
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ variant: "destructive", title: "Load chapters failed", description: error.message });
      return;
    }
    setChapters((data ?? []) as CourseChapterRow[]);
  }, []);

  const loadLectures = useCallback(async (chapterId: string) => {
    if (!supabase || !chapterId) {
      setLectures([]);
      return;
    }
    const { data, error } = await supabase
      .from("course_lectures")
      .select("id, chapter_id, title, video_url, pdf_url, sort_order, homework_id")
      .eq("chapter_id", chapterId)
      .order("sort_order", { ascending: true });
    if (error) {
      toast({ variant: "destructive", title: "Load lectures failed", description: error.message });
      return;
    }
    setLectures((data ?? []) as CourseLectureRow[]);
  }, []);

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    void loadChapters(selProgram);
    setSelChapter("");
    setLectures([]);
  }, [selProgram, loadChapters]);

  useEffect(() => {
    void loadLectures(selChapter);
  }, [selChapter, loadLectures]);

  const saveProgram = async () => {
    if (!supabase || !pTitle.trim()) return;
    if (editProgramId) {
      const { error } = await supabase
        .from("course_programs")
        .update({
          title: pTitle.trim(),
          subtitle: pSub.trim(),
          accent_color: pColor.trim() || "#1a56db",
          student_count: pStudents,
          sort_order: pSort,
        })
        .eq("id", editProgramId);
      if (error) toast({ variant: "destructive", title: "Update failed", description: error.message });
      else {
        toast({ title: "Program updated" });
        setEditProgramId(null);
        setPTitle("");
        setPSub("");
        setPColor("#1a56db");
        setPStudents(0);
        setPSort(0);
        void loadPrograms();
      }
      return;
    }
    const { error } = await supabase.from("course_programs").insert({
      title: pTitle.trim(),
      subtitle: pSub.trim(),
      accent_color: pColor.trim() || "#1a56db",
      student_count: pStudents,
      sort_order: pSort,
    });
    if (error) toast({ variant: "destructive", title: "Save failed", description: error.message });
    else {
      toast({ title: "Program created" });
      setPTitle("");
      setPSub("");
      setPColor("#1a56db");
      setPStudents(0);
      setPSort(0);
      void loadPrograms();
    }
  };

  const startEditProgram = (p: CourseProgramRow) => {
    setEditProgramId(p.id);
    setPTitle(p.title);
    setPSub(p.subtitle ?? "");
    setPColor(p.accent_color || "#1a56db");
    setPStudents(p.student_count ?? 0);
    setPSort(p.sort_order ?? 0);
  };

  const cancelEditProgram = () => {
    setEditProgramId(null);
    setPTitle("");
    setPSub("");
    setPColor("#1a56db");
    setPStudents(0);
    setPSort(0);
  };

  const delProgram = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("course_programs").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else {
      if (selProgram === id) setSelProgram("");
      void loadPrograms();
    }
  };

  const saveChapter = async () => {
    if (!supabase || !selProgram || !cTitle.trim()) {
      toast({ variant: "destructive", title: "Select program & title", description: "Choose a program and enter chapter title." });
      return;
    }
    if (editChapterId) {
      const { error } = await supabase
        .from("course_chapters")
        .update({ title: cTitle.trim(), sort_order: cSort })
        .eq("id", editChapterId);
      if (error) toast({ variant: "destructive", title: "Update failed", description: error.message });
      else {
        toast({ title: "Chapter updated" });
        setEditChapterId(null);
        setCTitle("");
        setCSort(0);
        void loadChapters(selProgram);
      }
      return;
    }
    const { error } = await supabase.from("course_chapters").insert({
      course_program_id: selProgram,
      title: cTitle.trim(),
      sort_order: cSort,
    });
    if (error) toast({ variant: "destructive", title: "Save failed", description: error.message });
    else {
      toast({ title: "Chapter added" });
      setCTitle("");
      setCSort(0);
      void loadChapters(selProgram);
    }
  };

  const startEditChapter = (c: CourseChapterRow) => {
    setEditChapterId(c.id);
    setCTitle(c.title);
    setCSort(c.sort_order ?? 0);
  };

  const cancelEditChapter = () => {
    setEditChapterId(null);
    setCTitle("");
    setCSort(0);
  };

  const delChapter = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("course_chapters").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else {
      if (selChapter === id) setSelChapter("");
      void loadChapters(selProgram);
    }
  };

  const saveLecture = async () => {
    if (!supabase || !selChapter || !lTitle.trim()) {
      toast({ variant: "destructive", title: "Select chapter & title", description: "Choose a chapter and enter lecture title." });
      return;
    }
    let homeworkId: string | null = null;
    if (lHw.trim()) {
      const uuid = /^[0-9a-f-]{36}$/i.test(lHw.trim());
      if (!uuid) {
        toast({ variant: "destructive", title: "Invalid homework id", description: "Use a UUID from the Homework table or leave empty." });
        return;
      }
      homeworkId = lHw.trim();
    }

    if (editLectureId) {
      const { error } = await supabase
        .from("course_lectures")
        .update({
          title: lTitle.trim(),
          video_url: lVideo.trim(),
          sort_order: lSort,
          homework_id: homeworkId,
        })
        .eq("id", editLectureId);
      if (error) {
        toast({ variant: "destructive", title: "Update failed", description: error.message });
        return;
      }
      const lecId = editLectureId;
      if (lPdf) {
        const safe = lPdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `catalog/${lecId}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("lesson-pdfs").upload(path, lPdf, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });
        if (upErr) toast({ variant: "destructive", title: "PDF upload failed", description: upErr.message });
        else {
          const { data: pub } = supabase.storage.from("lesson-pdfs").getPublicUrl(path);
          await supabase.from("course_lectures").update({ pdf_url: pub.publicUrl }).eq("id", lecId);
        }
      }
      toast({ title: "Lecture updated" });
      setEditLectureId(null);
      setLTitle("");
      setLVideo("");
      setLSort(0);
      setLHw("");
      setLPdf(null);
      void loadLectures(selChapter);
      return;
    }

    const { data: ins, error } = await supabase
      .from("course_lectures")
      .insert({
        chapter_id: selChapter,
        title: lTitle.trim(),
        video_url: lVideo.trim(),
        pdf_url: null,
        sort_order: lSort,
        homework_id: homeworkId,
      })
      .select("id")
      .maybeSingle();
    if (error || !ins) {
      toast({ variant: "destructive", title: "Save failed", description: error?.message ?? "No row" });
      return;
    }
    const lecId = ins.id as string;
    if (lPdf) {
      const safe = lPdf.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `catalog/${lecId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("lesson-pdfs").upload(path, lPdf, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) {
        toast({ variant: "destructive", title: "PDF upload failed", description: upErr.message });
      } else {
        const { data: pub } = supabase.storage.from("lesson-pdfs").getPublicUrl(path);
        await supabase.from("course_lectures").update({ pdf_url: pub.publicUrl }).eq("id", lecId);
      }
    }
    toast({ title: "Lecture added" });
    setLTitle("");
    setLVideo("");
    setLSort(0);
    setLHw("");
    setLPdf(null);
    void loadLectures(selChapter);
  };

  const startEditLecture = (l: CourseLectureRow) => {
    setEditLectureId(l.id);
    setLTitle(l.title);
    setLVideo(l.video_url ?? "");
    setLSort(l.sort_order ?? 0);
    setLHw(l.homework_id ?? "");
    setLPdf(null);
  };

  const cancelEditLecture = () => {
    setEditLectureId(null);
    setLTitle("");
    setLVideo("");
    setLSort(0);
    setLHw("");
    setLPdf(null);
  };

  const delLecture = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("course_lectures").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: "Delete failed", description: error.message });
    else void loadLectures(selChapter);
  };

  if (!isSupabaseConfigured || !supabase) {
    return <p className="text-sm text-muted-foreground">Supabase not configured.</p>;
  }

  return (
    <Tabs defaultValue="programs" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-10">
        <TabsTrigger value="programs" className="text-xs">
          Programs
        </TabsTrigger>
        <TabsTrigger value="chapters" className="text-xs">
          Chapters
        </TabsTrigger>
        <TabsTrigger value="lectures" className="text-xs">
          Lectures
        </TabsTrigger>
      </TabsList>

      <TabsContent value="programs" className="space-y-3 mt-4">
        <p className="text-xs text-muted-foreground">Top-level courses shown in the Courses tab.</p>
        <Input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Title (e.g. IIT-JEE Maths Foundation)" />
        <Input value={pSub} onChange={(e) => setPSub(e.target.value)} placeholder="Subtitle (e.g. Class 11th • Mathematics)" />
        <Input value={pColor} onChange={(e) => setPColor(e.target.value)} placeholder="Accent #hex" className="font-mono" />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" value={pStudents} onChange={(e) => setPStudents(Number(e.target.value) || 0)} placeholder="Student count" />
          <Input type="number" value={pSort} onChange={(e) => setPSort(Number(e.target.value) || 0)} placeholder="Sort order" />
        </div>
        <div className="flex gap-2">
          <Button type="button" className="flex-1 bg-primary" onClick={() => void saveProgram()}>
            {editProgramId ? "Update program" : "Add program"}
          </Button>
          {editProgramId ? (
            <Button type="button" variant="outline" onClick={cancelEditProgram}>
              Cancel
            </Button>
          ) : null}
        </div>
        <ul className="space-y-2 max-h-56 overflow-y-auto text-xs">
          {programs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 border rounded-lg p-2">
              <span className="font-medium truncate">{p.title}</span>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => startEditProgram(p)}>
                  <Pencil size={14} />
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void delProgram(p.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="chapters" className="space-y-3 mt-4">
        <select
          value={selProgram}
          onChange={(e) => setSelProgram(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select program</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Chapter title" />
        <Input type="number" value={cSort} onChange={(e) => setCSort(Number(e.target.value) || 0)} placeholder="Sort order" />
        <div className="flex gap-2">
          <Button type="button" className="flex-1 bg-primary" disabled={!selProgram} onClick={() => void saveChapter()}>
            {editChapterId ? "Update chapter" : "Add chapter"}
          </Button>
          {editChapterId ? (
            <Button type="button" variant="outline" onClick={cancelEditChapter}>
              Cancel
            </Button>
          ) : null}
        </div>
        <ul className="space-y-2 max-h-56 overflow-y-auto text-xs">
          {chapters.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 border rounded-lg p-2">
              <span className="truncate">{c.title}</span>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => startEditChapter(c)}>
                  <Pencil size={14} />
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void delChapter(c.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="lectures" className="space-y-3 mt-4">
        <select
          value={selProgram}
          onChange={(e) => setSelProgram(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select program</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select
          value={selChapter}
          onChange={(e) => setSelChapter(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select chapter</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Input value={lTitle} onChange={(e) => setLTitle(e.target.value)} placeholder="Lecture title" />
        <Input value={lVideo} onChange={(e) => setLVideo(e.target.value)} placeholder="YouTube URL" />
        <Input type="number" value={lSort} onChange={(e) => setLSort(Number(e.target.value) || 0)} placeholder="Sort order" />
        <Input value={lHw} onChange={(e) => setLHw(e.target.value)} placeholder="Optional homework UUID" className="font-mono text-xs" />
        <Input type="file" accept="application/pdf" onChange={(e) => setLPdf(e.target.files?.[0] ?? null)} />
        <div className="flex gap-2">
          <Button type="button" className="flex-1 bg-primary" disabled={!selChapter} onClick={() => void saveLecture()}>
            {editLectureId ? "Update lecture" : "Add lecture"}
          </Button>
          {editLectureId ? (
            <Button type="button" variant="outline" onClick={cancelEditLecture}>
              Cancel
            </Button>
          ) : null}
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
          {lectures.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 border rounded-lg p-2">
              <span className="truncate">{l.title}</span>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => startEditLecture(l)}>
                  <Pencil size={14} />
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void delLecture(l.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
};

export default AdminCatalogSection;
