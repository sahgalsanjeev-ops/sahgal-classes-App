import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  Plus,
  Users,
  BookOpen,
  ClipboardCheck,
  NotebookPen,
  BarChart3,
  Pencil,
  Check,
  X,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  Batch,
  computeTestPercentage,
  deleteBatchSupabase,
  fetchBatchesSupabase,
  getBatches,
  HomeworkStatus,
  makeId,
  saveBatches,
  saveBatchSupabase,
  StudentProfile,
} from "@/lib/batches";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminOnlineTestSection from "@/components/admin/AdminOnlineTestSection";
import AdminStudentProfilesSection from "@/components/admin/AdminStudentProfilesSection";
import AdminHomeworkSection from "@/components/admin/AdminHomeworkSection";
import AdminNoticesSection from "@/components/admin/AdminNoticesSection";
import AdminCatalogSection from "@/components/admin/AdminCatalogSection";
import AdminHomeContentSection from "@/components/admin/AdminHomeContentSection";


const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    | "lessons"
    | "batches"
    | "onlineTests"
    | "registrations"
    | "homework"
    | "notices"
    | "catalog"
    | "homeContent"
  >("catalog");
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [category, setCategory] = useState<"Algebra" | "Geometry">("Algebra");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    const load = async () => {
      const sb = await fetchBatchesSupabase();
      if (sb.length > 0) {
        setBatches(sb);
      } else {
        // Fallback to localStorage if Supabase is empty or fails
        setBatches(getBatches());
      }
    };
    void load();
  }, []);

  const [batchName, setBatchName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [timing, setTiming] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId],
  );

  const updateBatches = async (next: Batch[]) => {
    setBatches(next);
    saveBatches(next);
    // Also save to Supabase
    // If we only have one batch that changed, we could optimize, but for now we sync the state
  };

  // Helper to save a single batch to Supabase
  const persistBatch = async (batch: Batch) => {
    const ok = await saveBatchSupabase(batch);
    if (!ok) {
      toast({
        variant: "destructive",
        title: "Supabase Sync Failed",
        description: `Batch "${batch.batchName}" could not be saved to database.`,
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setVideoUrl("");
    setCategory("Algebra");
    setPdfFile(null);
  };

  const resetBatchForm = () => {
    setBatchName("");
    setCourseName("");
    setBatchCode("");
    setTiming("");
    setTeacherName("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !videoUrl.trim() || !pdfFile) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Title, YouTube link, category, and PDF are required.",
      });
      return;
    }

    if (!/youtube\.com|youtu\.be/i.test(videoUrl)) {
      toast({
        variant: "destructive",
        title: "Invalid video URL",
        description: "Please paste a valid YouTube link.",
      });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast({
        variant: "destructive",
        title: "Supabase not configured",
        description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const cleanFileName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `lessons/${Date.now()}-${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("lesson-pdfs")
        .upload(filePath, pdfFile, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage.from("lesson-pdfs").getPublicUrl(filePath);
      const pdfUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase.from("courses").insert({
        title: title.trim(),
        video_url: videoUrl.trim(),
        pdf_url: pdfUrl,
        category,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast({
        title: "Lesson added",
        description: "Course lesson saved successfully.",
      });
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save lesson.";
      toast({
        variant: "destructive",
        title: "Save failed",
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim() || !courseName.trim() || !batchCode.trim() || !timing.trim() || !teacherName.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill batch name, course name, batch code, timing and teacher name.",
      });
      return;
    }

    const newBatch: Batch = {
      id: makeId(),
      batchName: batchName.trim(),
      courseName: courseName.trim(),
      batchCode: batchCode.trim().toUpperCase(),
      timing: timing.trim(),
      teacherName: teacherName.trim(),
      videos: [],
      homework: [],
      studyMaterialPdfs: [],
      testPapers: [],
      students: [],
      attendanceRecords: [],
      homeworkRecords: [],
      testMarksRecords: [],
      createdAt: new Date().toISOString(),
    };

    const next = [newBatch, ...batches];
    await updateBatches(next);
    await persistBatch(newBatch);
    setSelectedBatchId(newBatch.id);
    resetBatchForm();
    toast({ title: "Batch created", description: "New batch added successfully." });
  };

  const handleDeleteBatch = async (id: string) => {
    const ok = window.confirm("Are you sure you want to delete this batch? All records for this batch will be lost.");
    if (!ok) return;

    const next = batches.filter((b) => b.id !== id);
    await updateBatches(next);
    await deleteBatchSupabase(id);
    if (selectedBatchId === id) {
      setSelectedBatchId("");
    }
    toast({ title: "Batch deleted", description: "Batch and its records removed." });
  };

  const updateSelectedBatch = async (updater: (batch: Batch) => Batch) => {
    if (!selectedBatch) return;
    const updated = updater(selectedBatch);
    const next = batches.map((batch) => (batch.id === selectedBatch.id ? updated : batch));
    await updateBatches(next);
    await persistBatch(updated);
  };

  const addResource = async (type: "videos" | "homework" | "studyMaterialPdfs" | "testPapers", titleValue: string, linkValue: string) => {
    if (!selectedBatch) return;
    if (!titleValue.trim()) return;
    const updated = {
      ...selectedBatch,
      [type]: [
        ...selectedBatch[type],
        {
          id: makeId(),
          title: titleValue.trim(),
          link: linkValue.trim(),
        },
      ],
    };
    const next = batches.map((batch) => (batch.id === selectedBatch.id ? updated : batch));
    await updateBatches(next);
    await persistBatch(updated);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center">
            <ArrowLeft size={22} className="text-primary-foreground" />
          </button>
          <h2 className="text-base font-bold text-primary-foreground truncate">Admin Panel</h2>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border p-1 bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "catalog" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("homeContent")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "homeContent" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lessons")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "lessons" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Legacy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batches")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "batches" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Batches
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("onlineTests")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "onlineTests" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Tests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("registrations")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "registrations" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Students
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("homework")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "homework" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Homework
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notices")}
            className={`rounded-lg py-2 px-2 text-[11px] sm:text-xs font-semibold transition-colors flex-1 min-w-[4.5rem] ${
              activeTab === "notices" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Notices
          </button>
        </div>

        {activeTab === "catalog" ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <AdminCatalogSection />
          </div>
        ) : activeTab === "homeContent" ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <AdminHomeContentSection />
          </div>
        ) : activeTab === "lessons" ? (
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Lesson Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Quadratic Equations - Part 1"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">YouTube Link</label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as "Algebra" | "Geometry")}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Algebra">Algebra</option>
                <option value="Geometry">Geometry</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">PDF Notes</label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload a PDF file for this lesson.
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Prefer the <span className="font-semibold text-foreground">Catalog</span> tab for course → chapter → lecture structure.
            </p>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11 gap-2">
              <UploadCloud size={16} />
              {submitting ? "Saving..." : "Add flat lesson"}
            </Button>
          </div>
        ) : activeTab === "batches" ? (
          <BatchManager
            batches={batches}
            selectedBatch={selectedBatch}
            selectedBatchId={selectedBatchId}
            setSelectedBatchId={setSelectedBatchId}
            batchName={batchName}
            setBatchName={setBatchName}
            courseName={courseName}
            setCourseName={setCourseName}
            batchCode={batchCode}
            setBatchCode={setBatchCode}
            timing={timing}
            setTiming={setTiming}
            teacherName={teacherName}
            setTeacherName={setTeacherName}
            handleCreateBatch={handleCreateBatch}
            handleDeleteBatch={handleDeleteBatch}
            addResource={addResource}
            updateSelectedBatch={updateSelectedBatch}
          />
        ) : activeTab === "onlineTests" ? (
          <AdminOnlineTestSection />
        ) : activeTab === "homework" ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <AdminHomeworkSection />
          </div>
        ) : activeTab === "notices" ? (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <AdminNoticesSection />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <AdminStudentProfilesSection />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;

type BatchManagerProps = {
  batches: Batch[];
  selectedBatch: Batch | null;
  selectedBatchId: string;
  setSelectedBatchId: (batchId: string) => void;
  batchName: string;
  setBatchName: (v: string) => void;
  courseName: string;
  setCourseName: (v: string) => void;
  batchCode: string;
  setBatchCode: (v: string) => void;
  timing: string;
  setTiming: (v: string) => void;
  teacherName: string;
  setTeacherName: (v: string) => void;
  handleCreateBatch: () => void;
  handleDeleteBatch: (id: string) => void;
  addResource: (type: "videos" | "homework" | "studyMaterialPdfs" | "testPapers", titleValue: string, linkValue: string) => void;
  updateSelectedBatch: (updater: (batch: Batch) => Batch) => void;
};

const BatchManager = ({
  batches,
  selectedBatch,
  selectedBatchId,
  setSelectedBatchId,
  batchName,
  setBatchName,
  courseName,
  setCourseName,
  batchCode,
  setBatchCode,
  timing,
  setTiming,
  teacherName,
  setTeacherName,
  handleCreateBatch,
  handleDeleteBatch,
  addResource,
  updateSelectedBatch,
}: BatchManagerProps) => {
  const [attendanceSessionDate, setAttendanceSessionDate] = useState(() => new Date());
  const attendanceDateKey = useMemo(() => format(attendanceSessionDate, "dd-MM-yyyy"), [attendanceSessionDate]);

  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editBatchName, setEditBatchName] = useState("");
  const [editCourseName, setEditCourseName] = useState("");
  const [editBatchCode, setEditBatchCode] = useState("");
  const [editTiming, setEditTiming] = useState("");
  const [editTeacherName, setEditTeacherName] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentRollNo, setStudentRollNo] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editRoll, setEditRoll] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [resourceType, setResourceType] = useState<"videos" | "homework" | "studyMaterialPdfs" | "testPapers">("videos");
  const [hwRecordTitle, setHwRecordTitle] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testMaxMarks, setTestMaxMarks] = useState("");
  const [testMarkDraft, setTestMarkDraft] = useState<Record<string, string>>({});
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, { status: "Present" | "Absent" | "Late"; minutesLate?: number }>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Load existing attendance into draft when date or batch changes
  useEffect(() => {
    if (!selectedBatch) {
      setAttendanceDraft({});
      return;
    }
    const date = attendanceDateKey;
    const draft: Record<string, { status: "Present" | "Absent" | "Late"; minutesLate?: number }> = {};

    selectedBatch.students.forEach((s) => {
      const rec = selectedBatch.attendanceRecords.find(
        (r) => r.studentEmail.toLowerCase() === s.email.toLowerCase() && r.date.trim() === date,
      );
      if (rec) {
        draft[s.id] = { status: rec.status as "Present" | "Absent" | "Late", minutesLate: rec.minutesLate };
      }
    });
    setAttendanceDraft(draft);
  }, [selectedBatchId, attendanceDateKey, selectedBatch?.students]);

  const markAllPresent = () => {
    if (!selectedBatch) return;
    const draft: Record<string, { status: "Present" | "Absent" | "Late"; minutesLate?: number }> = { ...attendanceDraft };
    selectedBatch.students.forEach((s) => {
      draft[s.id] = { status: "Present" };
    });
    setAttendanceDraft(draft);
  };

  const saveAttendance = async () => {
    if (!selectedBatch) return;
    setIsSavingAttendance(true);
    try {
      const date = attendanceDateKey;

      await updateSelectedBatch((batch) => {
        // Remove existing records for THIS date
        const otherDates = batch.attendanceRecords.filter((r) => r.date.trim() !== date);

        // Add new records from draft
        const newRecords = batch.students
          .filter((s) => attendanceDraft[s.id])
          .map((s) => ({
            id: makeId(),
            studentEmail: s.email.toLowerCase(),
            studentRollNo: s.rollNo,
            date,
            status: attendanceDraft[s.id].status,
            minutesLate: attendanceDraft[s.id].minutesLate,
          }));

        return {
          ...batch,
          attendanceRecords: [...otherDates, ...newRecords as any],
        };
      });

      toast({ title: "Attendance Saved", description: `Attendance for ${date} updated successfully.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const startEditingBatch = () => {
    if (!selectedBatch) return;
    setEditBatchName(selectedBatch.batchName);
    setEditCourseName(selectedBatch.courseName);
    setEditBatchCode(selectedBatch.batchCode);
    setEditTiming(selectedBatch.timing);
    setEditTeacherName(selectedBatch.teacherName);
    setIsEditingBatch(true);
  };

  const saveBatchEdit = () => {
    if (!selectedBatch) return;
    if (!editBatchName.trim() || !editCourseName.trim() || !editBatchCode.trim() || !editTiming.trim() || !editTeacherName.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "All batch details are required." });
      return;
    }
    updateSelectedBatch((batch) => ({
      ...batch,
      batchName: editBatchName.trim(),
      courseName: editCourseName.trim(),
      batchCode: editBatchCode.trim().toUpperCase(),
      timing: editTiming.trim(),
      teacherName: editTeacherName.trim(),
    }));
    setIsEditingBatch(false);
    toast({ title: "Batch updated", description: "Batch details saved successfully." });
  };

  const removeStudentFromBatch = (studentId: string, studentName: string) => {
    const ok = window.confirm(`Are you sure you want to remove "${studentName}" from this batch? This will NOT delete their profile from the registration list.`);
    if (!ok) return;

    updateSelectedBatch((batch) => ({
      ...batch,
      students: batch.students.filter((s) => s.id !== studentId),
    }));
    toast({ title: "Student removed", description: "Student detached from this batch." });
  };

  const findTestRecord = (student: StudentProfile) => {
    if (!selectedBatch) return undefined;
    const t = testTitle.trim();
    if (!t) return undefined;
    return selectedBatch.testMarksRecords.find(
      (r) => r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.testTitle.trim() === t,
    );
  };

  const obtainedDisplay = (student: StudentProfile) => {
    const rec = findTestRecord(student);
    const legacy = rec as { marksObtained?: string; marks?: string } | undefined;
    if (testMarkDraft[student.id] !== undefined) return testMarkDraft[student.id];
    return rec?.marksObtained ?? legacy?.marks ?? "";
  };

  const hwStatusForStudent = (student: StudentProfile) => {
    if (!selectedBatch || !hwRecordTitle.trim()) return null;
    const t = hwRecordTitle.trim();
    const rec = selectedBatch.homeworkRecords.find(
      (r) => r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.homeworkTitle.trim() === t,
    );
    return rec?.status ?? null;
  };

  const saveTestMarkForStudent = (student: StudentProfile) => {
    if (!selectedBatch) return;
    const title = testTitle.trim();
    const max = testMaxMarks.trim();
    const obtained = obtainedDisplay(student).trim();
    if (!title) {
      toast({ variant: "destructive", title: "Test title required", description: "Enter the test name." });
      return;
    }
    if (!max) {
      toast({ variant: "destructive", title: "Max marks required", description: "Enter maximum marks for this test." });
      return;
    }
    if (!obtained) {
      toast({ variant: "destructive", title: "Marks required", description: "Enter marks obtained for this student." });
      return;
    }
    const pct = computeTestPercentage(obtained, max);
    updateSelectedBatch((batch) => {
      const filtered = batch.testMarksRecords.filter(
        (r) => !(r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.testTitle.trim() === title),
      );
      return {
        ...batch,
        testMarksRecords: [
          ...filtered,
          {
            id: makeId(),
            studentEmail: student.email.toLowerCase(),
            studentRollNo: student.rollNo,
            testTitle: title,
            marksObtained: obtained,
            maxMarks: max,
            percentage: pct === "—" ? undefined : pct,
          },
        ],
      };
    });
    setTestMarkDraft((prev) => {
      const next = { ...prev };
      delete next[student.id];
      return next;
    });
    toast({ title: "Saved", description: `Test record saved for ${student.name}.` });
  };

  useEffect(() => {
    setTestTitle("");
    setTestMaxMarks("");
    setTestMarkDraft({});
  }, [selectedBatchId]);

  const setHomeworkQuick = (student: StudentProfile, status: HomeworkStatus) => {
    const title = hwRecordTitle.trim();
    if (!title) {
      toast({
        variant: "destructive",
        title: "Homework title required",
        description: "Enter the homework title above.",
      });
      return;
    }
    updateSelectedBatch((batch) => {
      const filtered = batch.homeworkRecords.filter(
        (r) =>
          !(
            r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.homeworkTitle.trim() === title
          ),
      );
      return {
        ...batch,
        homeworkRecords: [
          ...filtered,
          {
            id: makeId(),
            studentEmail: student.email.toLowerCase(),
            studentRollNo: student.rollNo,
            homeworkTitle: title,
            status,
          },
        ],
      };
    });
  };

  const saveEditedStudent = () => {
    if (!editingStudentId || !selectedBatch) return;
    if (!editName.trim() || !editEmail.trim() || !editRoll.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Fill roll no., name, and email.",
      });
      return;
    }
    const roll = editRoll.trim();
    const email = editEmail.trim().toLowerCase();
    const duplicateEmail = selectedBatch.students.some(
      (s) => s.id !== editingStudentId && s.email.trim().toLowerCase() === email.toLowerCase(),
    );
    if (duplicateEmail) {
      toast({
        variant: "destructive",
        title: "Duplicate email",
        description: "Another student in this batch already has this email identity.",
      });
      return;
    }
    updateSelectedBatch((batch) => ({
      ...batch,
      students: batch.students.map((s) =>
        s.id === editingStudentId
          ? {
              ...s,
              rollNo: roll,
              name: editName.trim(),
              email,
            }
          : s,
      ),
    }));
    setEditingStudentId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Add New Batch</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Batch name" />
          <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Course name" />
          <Input value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="Batch code" />
          <Input value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="Timing" />
          <div className="sm:col-span-2">
            <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Teacher name" />
          </div>
        </div>
        <Button onClick={handleCreateBatch} className="w-full gap-2">
          <Plus size={16} />
          Create Batch
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
        <label className="text-sm font-medium text-foreground">Select Batch</label>
        <div className="flex gap-2">
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Choose a batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchName} - {batch.batchCode}
              </option>
            ))}
          </select>
          {selectedBatchId && (
            <Button
              variant="destructive"
              size="icon"
              className="shrink-0"
              onClick={() => handleDeleteBatch(selectedBatchId)}
            >
              <X size={18} />
            </Button>
          )}
        </div>
      </div>

      {selectedBatch ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            {isEditingBatch ? (
              <div className="space-y-3">
                <Input value={editBatchName} onChange={(e) => setEditBatchName(e.target.value)} placeholder="Batch name" />
                <Input value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} placeholder="Course name" />
                <Input value={editBatchCode} onChange={(e) => setEditBatchCode(e.target.value)} placeholder="Batch code" />
                <Input value={editTiming} onChange={(e) => setEditTiming(e.target.value)} placeholder="Timing" />
                <Input value={editTeacherName} onChange={(e) => setEditTeacherName(e.target.value)} placeholder="Teacher name" />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1" onClick={saveBatchEdit}>
                    <Check size={14} /> Save Changes
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setIsEditingBatch(false)}>
                    <X size={14} /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selectedBatch.batchName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedBatch.courseName} | {selectedBatch.timing} | {selectedBatch.teacherName}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1 h-8" onClick={startEditingBatch}>
                  <Pencil size={12} /> Edit
                </Button>
              </div>
            )}
          </div>

          <Accordion type="multiple" className="rounded-xl border border-border bg-card px-2 shadow-sm">
            <AccordionItem value="students" id="batch-section-students" className="border-b-0">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Users size={15} />
                  Students ({selectedBatch.students.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input value={studentRollNo} onChange={(e) => setStudentRollNo(e.target.value)} placeholder="Roll no. (Optional)" />
                  <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student name" />
                  <Input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Email (Unique Identity)" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Email is the primary identity used for login and batch linking. Roll number is stored for reference only.
                </p>
                <Button
                  onClick={() => {
                    if (!studentName.trim() || !studentEmail.trim() || !studentRollNo.trim()) {
                      toast({
                        variant: "destructive",
                        title: "Missing fields",
                        description: "Enter roll no., name, and email.",
                      });
                      return;
                    }
                    const roll = studentRollNo.trim();
                    const email = studentEmail.trim().toLowerCase();
                    const duplicateEmail = selectedBatch.students.some(
                      (s) => s.email.trim().toLowerCase() === email.toLowerCase(),
                    );
                    if (duplicateEmail) {
                      toast({
                        variant: "destructive",
                        title: "Duplicate email",
                        description: "This email is already used as an identity for another student in this batch.",
                      });
                      return;
                    }
                    updateSelectedBatch((batch) => ({
                      ...batch,
                      students: [
                        ...batch.students,
                        {
                          id: makeId(),
                          rollNo: roll,
                          name: studentName.trim(),
                          email,
                        },
                      ],
                    }));
                    setStudentName("");
                    setStudentRollNo("");
                    setStudentEmail("");
                  }}
                  className="w-full"
                >
                  Add Student
                </Button>
                {selectedBatch.students.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 max-h-72 overflow-y-auto">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Enrolled</p>
                    {selectedBatch.students.map((s) => (
                      <div key={s.id} className="text-xs border-b border-border/60 pb-3 last:border-0 last:pb-0">
                        {editingStudentId === s.id ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input value={editRoll} onChange={(e) => setEditRoll(e.target.value)} placeholder="Roll no. (Ref)" />
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email (Unique)" />
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" className="flex-1 gap-1" onClick={saveEditedStudent}>
                                <Check size={14} /> Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1"
                                onClick={() => setEditingStudentId(null)}
                              >
                                <X size={14} /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-semibold text-primary">Roll {s.rollNo}</span>
                              <span className="text-foreground"> — {s.name}</span>
                              <p className="text-[11px] text-muted-foreground mt-0.5 break-all">{s.email}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1 h-8"
                                onClick={() => {
                                  setEditingStudentId(s.id);
                                  setEditRoll(s.rollNo);
                                  setEditName(s.name);
                                  setEditEmail(s.email);
                                }}
                              >
                                <Pencil size={12} /> Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1 h-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeStudentFromBatch(s.id, s.name)}
                              >
                                <X size={12} /> Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="content" id="batch-section-content" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <NotebookPen size={15} />
                  Course videos, HW, PDFs &amp; test papers
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as "videos" | "homework" | "studyMaterialPdfs" | "testPapers")}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="videos">Course Videos</option>
                    <option value="homework">HW</option>
                    <option value="studyMaterialPdfs">Study Material PDF</option>
                    <option value="testPapers">Test Papers</option>
                  </select>
                  <Input value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} placeholder="Title" />
                  <Input value={resourceLink} onChange={(e) => setResourceLink(e.target.value)} placeholder="Link / note" />
                </div>
                <Button
                  onClick={() => {
                    addResource(resourceType, resourceTitle, resourceLink);
                    setResourceTitle("");
                    setResourceLink("");
                  }}
                  className="w-full"
                >
                  Add Content
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="attendance" id="batch-section-attendance" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <ClipboardCheck size={15} />
                  Add attendance ({selectedBatch.attendanceRecords.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4 px-1">
                <div className="flex flex-col sm:flex-row items-end gap-3 bg-muted/30 p-3 rounded-xl">
                  <div className="space-y-1.5 flex-1 w-full">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Session Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("w-full justify-start text-left font-semibold h-11 rounded-lg border-2", 
                            "hover:border-primary/50 hover:bg-background transition-all")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {attendanceDateKey}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={attendanceSessionDate}
                          onSelect={(d) => d && setAttendanceSessionDate(d)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button 
                    type="button" 
                    onClick={markAllPresent}
                    variant="secondary"
                    className="h-11 px-6 font-bold gap-2 rounded-lg border-2 border-primary/20 hover:border-primary/40"
                  >
                    <Check className="text-primary" size={18} />
                    Mark All Present
                  </Button>
                </div>

                {selectedBatch.students.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground">Add students to this batch first.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedBatch.students.map((s) => {
                      const draft = attendanceDraft[s.id];
                      const status = draft?.status;
                      const isLate = status === "Late";

                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "flex flex-col gap-2 rounded-lg border-2 p-2 transition-all",
                            status === "Present" ? "border-green-100 bg-green-50/30" : 
                            status === "Absent" ? "border-red-100 bg-red-50/30" : 
                            status === "Late" ? "border-yellow-200 bg-yellow-50" : 
                            "border-border bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground">
                                {s.name} <span className="text-primary font-medium ml-1">({s.rollNo})</span>
                              </p>
                            </div>
                            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant={status === "Present" ? "default" : "ghost"}
                                className={cn(
                                  "h-7 px-2.5 text-[10px] font-bold rounded-md transition-all",
                                  status === "Present" ? "bg-green-600 hover:bg-green-700 shadow-sm" : "text-muted-foreground hover:text-green-600"
                                )}
                                onClick={() => setAttendanceDraft(prev => ({ ...prev, [s.id]: { status: "Present" } }))}
                              >
                                Present
                              </Button>
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={status === "Late" ? "default" : "ghost"}
                                    className={cn(
                                      "h-7 px-2.5 text-[10px] font-bold rounded-md transition-all min-w-[4.5rem]",
                                      status === "Late" ? "bg-yellow-500 hover:bg-yellow-600 shadow-sm" : "text-muted-foreground hover:text-yellow-600"
                                    )}
                                  >
                                    {status === "Late" && draft?.minutesLate ? `Late (${draft.minutesLate}m)` : "Late"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-3" side="top" align="center">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Minutes Late</label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        autoFocus
                                        value={draft?.minutesLate || ""}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          setAttendanceDraft(prev => ({ 
                                            ...prev, 
                                            [s.id]: { status: "Late", minutesLate: isNaN(val) ? 0 : val } 
                                          }));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            // Close on enter (Popover does this naturally if focused away, but here we just need to confirm)
                                          }
                                        }}
                                        className="h-8 text-xs font-bold"
                                        placeholder="Min"
                                      />
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>

                              <Button
                                type="button"
                                size="sm"
                                variant={status === "Absent" ? "default" : "ghost"}
                                className={cn(
                                  "h-7 px-2.5 text-[10px] font-bold rounded-md transition-all",
                                  status === "Absent" ? "bg-red-600 hover:bg-red-700 shadow-sm" : "text-muted-foreground hover:text-red-600"
                                )}
                                onClick={() => setAttendanceDraft(prev => ({ ...prev, [s.id]: { status: "Absent" } }))}
                              >
                                Absent
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button 
                      onClick={saveAttendance} 
                      disabled={isSavingAttendance}
                      className="w-full h-14 mt-4 text-base font-bold gap-2 rounded-xl shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      {isSavingAttendance ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <ClipboardCheck size={20} />
                      )}
                      {isSavingAttendance ? "Saving Attendance..." : "Save Attendance"}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hw" id="batch-section-hw" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                Add HW record ({selectedBatch.homeworkRecords.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Homework title</label>
                  <Input
                    value={hwRecordTitle}
                    onChange={(e) => setHwRecordTitle(e.target.value)}
                    placeholder="e.g. Integration Set 3"
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Enter one title, then mark each student with Done, Not done, or Incomplete. Tapping again updates the same student for this homework.
                  </p>
                </div>
                {selectedBatch.students.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add students first.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBatch.students.map((s) => {
                      const current = hwStatusForStudent(s);
                      return (
                        <div
                          key={s.id}
                          className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              <span className="text-primary">Roll {s.rollNo}</span> — {s.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(["Done", "Not done", "Incomplete"] as const).map((st) => {
                              const selected = current === st;
                              return (
                                <Button
                                  key={st}
                                  type="button"
                                  size="sm"
                                  variant={
                                    !selected ? "outline" : st === "Not done" ? "destructive" : "default"
                                  }
                                  className={cn(
                                    "flex-1 min-w-[4.5rem] text-xs",
                                    selected && st === "Incomplete" && "bg-amber-600 text-white hover:bg-amber-600/90 border-amber-600",
                                  )}
                                  onClick={() => setHomeworkQuick(s, st)}
                                >
                                  {st === "Not done" ? "Not done" : st}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tests" id="batch-section-tests" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                Add test record ({selectedBatch.testMarksRecords.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="grid grid-cols-1 gap-2">
                  <Input
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Test name (e.g. Unit Test 2 — Algebra)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use the same test name for every student. Set max marks once, then enter each student&apos;s score
                    and save.
                  </p>
                </div>

                <Tabs defaultValue="marks" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="marks">Max marks</TabsTrigger>
                    <TabsTrigger value="pct">%</TabsTrigger>
                  </TabsList>
                  <TabsContent value="marks" className="space-y-3 pt-3 mt-0">
                    <div>
                      <label className="text-sm font-medium text-foreground">Maximum marks (whole test)</label>
                      <Input
                        value={testMaxMarks}
                        onChange={(e) => setTestMaxMarks(e.target.value)}
                        placeholder="e.g. 50"
                        className="mt-1 font-mono"
                        inputMode="decimal"
                      />
                    </div>
                    {selectedBatch.students.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Add students first.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedBatch.students.map((s) => {
                          const obtained = obtainedDisplay(s);
                          const pct = computeTestPercentage(obtained, testMaxMarks);
                          return (
                            <div
                              key={s.id}
                              className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  <span className="text-primary">Roll {s.rollNo}</span> — {s.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                <div>
                                  <label className="text-[11px] font-medium text-muted-foreground">Marks obtained</label>
                                  <Input
                                    value={obtained}
                                    onChange={(e) =>
                                      setTestMarkDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                                    }
                                    placeholder="0"
                                    className="mt-0.5 font-mono"
                                    inputMode="decimal"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium text-muted-foreground">Max</label>
                                  <Input
                                    value={testMaxMarks}
                                    readOnly
                                    className="mt-0.5 font-mono bg-muted/50"
                                    tabIndex={-1}
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium text-muted-foreground">% (auto)</label>
                                  <div className="mt-0.5 h-10 flex items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-mono tabular-nums">
                                    {pct}
                                  </div>
                                </div>
                              </div>
                              <Button type="button" size="sm" className="w-full" onClick={() => saveTestMarkForStudent(s)}>
                                Save
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="pct" className="space-y-2 pt-3 mt-0">
                    <p className="text-[11px] text-muted-foreground">
                      Percentage is calculated as (marks obtained ÷ max marks) × 100. Edit scores in the &quot;Max
                      marks&quot; tab.
                    </p>
                    {!testTitle.trim() || !testMaxMarks.trim() ? (
                      <p className="text-xs text-muted-foreground">Enter test name and max marks in the other tab.</p>
                    ) : selectedBatch.students.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Add students first.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedBatch.students.map((s) => {
                          const obtained = obtainedDisplay(s);
                          const pct = computeTestPercentage(obtained, testMaxMarks);
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 truncate">
                                <span className="font-semibold text-primary">Roll {s.rollNo}</span> — {s.name}
                              </span>
                              <span className="shrink-0 font-mono font-semibold tabular-nums">{pct}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Create and select a batch to start managing students and records.
        </div>
      )}
    </div>
  );
};
