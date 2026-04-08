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
  Trash2,
  Check,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  Batch,
  computeTestPercentage,
  getBatches,
  HomeworkStatus,
  makeId,
  saveBatches,
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

function parseDdMmYyyy(input: string): Date | undefined {
  const t = input.trim();
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(t);
  if (!m) return undefined;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return undefined;
  return d;
}

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
  const [batches, setBatches] = useState<Batch[]>(() => getBatches());

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

  const updateBatches = (next: Batch[]) => {
    setBatches(next);
    saveBatches(next);
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

  const handleCreateBatch = () => {
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
    updateBatches(next);
    setSelectedBatchId(newBatch.id);
    resetBatchForm();
    toast({ title: "Batch created", description: "New batch added successfully." });
  };

  const updateSelectedBatch = (updater: (batch: Batch) => Batch) => {
    if (!selectedBatch) return;
    const next = batches.map((batch) => (batch.id === selectedBatch.id ? updater(batch) : batch));
    updateBatches(next);
  };

  const addResource = (type: "videos" | "homework" | "studyMaterialPdfs" | "testPapers", titleValue: string, linkValue: string) => {
    if (!selectedBatch) return;
    if (!titleValue.trim()) return;
    updateSelectedBatch((batch) => ({
      ...batch,
      [type]: [
        ...batch[type],
        {
          id: makeId(),
          title: titleValue.trim(),
          link: linkValue.trim(),
        },
      ],
    }));
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
  addResource,
  updateSelectedBatch,
}: BatchManagerProps) => {
  const [studentName, setStudentName] = useState("");
  const [studentRollNo, setStudentRollNo] = useState("");
  const [studentMobile, setStudentMobile] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleLookup = async (field: "email" | "mobile" | "rollNo", val: string) => {
    const value = val.trim();
    if (!supabase || value.length < 4 || isLookingUp) return;

    setIsLookingUp(true);
    try {
      let query = supabase.from("profiles").select("roll_no, full_name, mobile, email");

      if (field === "email") {
        if (!value.includes("@")) return;
        query = query.eq("email", value.toLowerCase());
      } else if (field === "mobile") {
        if (value.length < 10) return;
        query = query.eq("mobile", value);
      } else if (field === "rollNo") {
        query = query.eq("roll_no", value);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (data) {
        setStudentName(data.full_name || "");
        setStudentRollNo(data.roll_no || "");
        setStudentMobile(data.mobile || "");
        setStudentEmail(data.email || "");
        toast({
          title: "Student Found",
          description: `Details for ${data.full_name} loaded from registration records.`,
        });
      }
    } catch (e) {
      console.error("Lookup error:", e);
    } finally {
      setIsLookingUp(false);
    }
  };

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editRoll, setEditRoll] = useState("");
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [resourceType, setResourceType] = useState<"videos" | "homework" | "studyMaterialPdfs" | "testPapers">("videos");
  
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editResourceTitle, setEditResourceTitle] = useState("");
  const [editResourceLink, setEditResourceLink] = useState("");
  const [editResourceType, setEditResourceType] = useState<"videos" | "homework" | "studyMaterialPdfs" | "testPapers">("videos");

  const [attendanceSessionDate, setAttendanceSessionDate] = useState(() => new Date());
  const [hwRecordTitle, setHwRecordTitle] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testMaxMarks, setTestMaxMarks] = useState("");
  const [testMarkDraft, setTestMarkDraft] = useState<Record<string, string>>({});
  const [hwMarkDraft, setHwMarkDraft] = useState<Record<string, { status: HomeworkStatus; details?: string }>>({});

  const attendanceDateKey = useMemo(() => format(attendanceSessionDate, "dd-MM-yyyy"), [attendanceSessionDate]);

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

  const attendanceForStudentOnDate = (student: StudentProfile) => {
    if (!selectedBatch) return null;
    const d = attendanceDateKey;
    const rec = selectedBatch.attendanceRecords.find(
      (r) => r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.date.trim() === d,
    );
    return rec ?? null;
  };

  const hwRecordForStudent = (student: StudentProfile) => {
    if (hwMarkDraft[student.id]) {
      return {
        status: hwMarkDraft[student.id].status,
        incompleteDetails: hwMarkDraft[student.id].details,
      };
    }
    if (!selectedBatch || !hwRecordTitle.trim()) return null;
    const t = hwRecordTitle.trim();
    const rec = selectedBatch.homeworkRecords.find(
      (r) => r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.homeworkTitle.trim() === t,
    );
    return rec ?? null;
  };

  const setAttendanceQuick = (student: StudentProfile, status: "Present" | "Absent" | "Late", lateTime?: string) => {
    const date = attendanceDateKey;
    updateSelectedBatch((batch) => {
      const filtered = batch.attendanceRecords.filter(
        (r) => !(r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.date.trim() === date),
      );
      return {
        ...batch,
        attendanceRecords: [
          ...filtered,
          {
            id: makeId(),
            studentEmail: student.email.toLowerCase(),
            studentRollNo: student.rollNo,
            date,
            status,
            lateTime,
          },
        ],
      };
    });
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
    setHwMarkDraft({});
  }, [selectedBatchId]);

  const saveHomeworkForStudent = (student: StudentProfile) => {
    const draft = hwMarkDraft[student.id];
    if (!draft) return;

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
            status: draft.status,
            incompleteDetails: draft.details,
          },
        ],
      };
    });

    setHwMarkDraft((prev) => {
      const next = { ...prev };
      delete next[student.id];
      return next;
    });
    toast({ title: "Saved", description: `HW record saved for ${student.name}.` });
  };

  const saveEditedResource = () => {
    if (!editingResourceId || !selectedBatch) return;
    if (!editResourceTitle.trim()) return;

    updateSelectedBatch((batch) => {
      // Remove from old type list if type changed, or update in current list
      let nextBatch = { ...batch };
      
      // We need to find which list it was in and remove it
      const types = ["videos", "homework", "studyMaterialPdfs", "testPapers"] as const;
      types.forEach(t => {
        nextBatch[t] = nextBatch[t].filter(r => r.id !== editingResourceId);
      });

      // Add to the new/current type list
      nextBatch[editResourceType] = [
        ...nextBatch[editResourceType],
        { id: editingResourceId, title: editResourceTitle.trim(), link: editResourceLink.trim() }
      ];

      return nextBatch;
    });

    setEditingResourceId(null);
    toast({ title: "Updated", description: "Resource updated successfully." });
  };

  const deleteResource = (id: string, type: "videos" | "homework" | "studyMaterialPdfs" | "testPapers") => {
     if (!selectedBatch) return;
     const ok = window.confirm("Delete this resource?");
     if (!ok) return;
 
     updateSelectedBatch((batch) => ({
       ...batch,
       [type]: batch[type].filter((r) => r.id !== id)
     }));
     toast({ title: "Deleted", description: "Resource removed." });
   };

  const saveEditedStudent = () => {
    if (!editingStudentId || !selectedBatch) return;
    if (!editName.trim() || !editMobile.trim() || !editEmail.trim() || !editRoll.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Fill roll no., name, mobile, and email.",
      });
      return;
    }
    const roll = editRoll.trim();
    const duplicate = selectedBatch.students.some(
      (s) => s.id !== editingStudentId && s.rollNo.trim().toLowerCase() === roll.toLowerCase(),
    );
    if (duplicate) {
      toast({
        variant: "destructive",
        title: "Duplicate roll no.",
        description: "Another student in this batch already has this roll number.",
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
              mobile: editMobile.trim(),
              email: editEmail.trim().toLowerCase(),
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
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Choose a batch</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.batchName} - {batch.batchCode}
            </option>
          ))}
        </select>
      </div>

      {selectedBatch ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">{selectedBatch.batchName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedBatch.courseName} | {selectedBatch.timing} | {selectedBatch.teacherName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => {
                const el = document.getElementById("batch-section-students");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Users size={14} className="text-primary mb-1" />
              Students: {selectedBatch.students.length}
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => {
                const el = document.getElementById("batch-section-content");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <BookOpen size={14} className="text-primary mb-1" />
              Built-in content: {selectedBatch.videos.length + selectedBatch.homework.length + selectedBatch.studyMaterialPdfs.length + selectedBatch.testPapers.length}
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => {
                const el = document.getElementById("batch-section-attendance");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <ClipboardCheck size={14} className="text-primary mb-1" />
              Attendance records: {selectedBatch.attendanceRecords.length}
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => {
                const el = document.getElementById("batch-section-tests");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <BarChart3 size={14} className="text-primary mb-1" />
              Test records: {selectedBatch.testMarksRecords.length}
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors col-span-2"
              onClick={() => {
                const el = document.getElementById("batch-section-hw");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <NotebookPen size={14} className="text-primary mb-1 inline mr-1" />
              HW records: {selectedBatch.homeworkRecords.length} — tap to add
            </button>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      value={studentRollNo}
                      onChange={(e) => setStudentRollNo(e.target.value)}
                      onBlur={(e) => handleLookup("rollNo", e.target.value)}
                      placeholder="Roll no. (unique ID)"
                    />
                    {isLookingUp && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Student name"
                  />
                  <div className="relative">
                    <Input
                      value={studentMobile}
                      onChange={(e) => setStudentMobile(e.target.value)}
                      onBlur={(e) => handleLookup("mobile", e.target.value)}
                      placeholder="Mobile no."
                    />
                    {isLookingUp && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      onBlur={(e) => handleLookup("email", e.target.value)}
                      placeholder="Email"
                    />
                    {isLookingUp && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-primary/80 font-medium">
                  💡 Tip: Enter Roll No, Mobile, or Email and click out to auto-fill details from registration.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Roll number is the unique reference for this batch—use it when adding attendance, HW, and test records.
                </p>
                <Button
                  onClick={() => {
                    if (!studentName.trim() || !studentMobile.trim() || !studentEmail.trim() || !studentRollNo.trim()) {
                      toast({
                        variant: "destructive",
                        title: "Missing fields",
                        description: "Enter roll no., name, mobile, and email.",
                      });
                      return;
                    }
                    const roll = studentRollNo.trim();
                    const duplicate = selectedBatch.students.some(
                      (s) => s.rollNo.trim().toLowerCase() === roll.toLowerCase(),
                    );
                    if (duplicate) {
                      toast({
                        variant: "destructive",
                        title: "Duplicate roll no.",
                        description: "This roll number is already used in this batch.",
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
                          mobile: studentMobile.trim(),
                          email: studentEmail.trim().toLowerCase(),
                        },
                      ],
                    }));
                    setStudentName("");
                    setStudentRollNo("");
                    setStudentMobile("");
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Input value={editRoll} onChange={(e) => setEditRoll(e.target.value)} placeholder="Roll no." />
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                              <Input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="Mobile" />
                              <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
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
                              <p className="text-[11px] text-muted-foreground">{s.mobile}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="shrink-0 gap-1 h-8"
                                onClick={() => {
                                  setEditingStudentId(s.id);
                                  setEditRoll(s.rollNo);
                                  setEditName(s.name);
                                  setEditMobile(s.mobile);
                                  setEditEmail(s.email);
                                }}
                              >
                                <Pencil size={12} /> Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="shrink-0 gap-1 h-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => {
                                  const ok = window.confirm(`Remove student "${s.name}" from this batch?`);
                                  if (!ok) return;
                                  updateSelectedBatch((batch) => ({
                                    ...batch,
                                    students: batch.students.filter((item) => item.id !== s.id),
                                  }));
                                  toast({
                                    title: "Student Removed",
                                    description: `${s.name} has been removed from this batch.`,
                                  });
                                }}
                              >
                                <Trash2 size={12} /> Remove
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

                <div className="mt-6 space-y-4">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Added Content</p>
                  
                  {(["videos", "homework", "studyMaterialPdfs", "testPapers"] as const).map((type) => {
                    const items = selectedBatch[type];
                    if (items.length === 0) return null;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <p className="text-[10px] font-semibold text-primary/70 uppercase">
                          {type === "videos" ? "Videos" : type === "homework" ? "HW" : type === "studyMaterialPdfs" ? "PDFs" : "Tests"}
                        </p>
                        <div className="grid gap-2">
                          {items.map((item) => (
                            <div key={item.id} className="rounded-lg border border-border bg-muted/20 p-2 text-xs">
                              {editingResourceId === item.id ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Input value={editResourceTitle} onChange={(e) => setEditResourceTitle(e.target.value)} placeholder="Title" className="h-8" />
                                    <Input value={editResourceLink} onChange={(e) => setEditResourceLink(e.target.value)} placeholder="Link" className="h-8" />
                                    <select
                                      value={editResourceType}
                                      onChange={(e) => setEditResourceType(e.target.value as any)}
                                      className="rounded-md border border-input bg-background px-3 py-1 text-xs h-8 sm:col-span-2"
                                    >
                                      <option value="videos">Videos</option>
                                      <option value="homework">HW</option>
                                      <option value="studyMaterialPdfs">PDFs</option>
                                      <option value="testPapers">Tests</option>
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="xs" className="flex-1" onClick={saveEditedResource}><Check size={12} className="mr-1" /> Save</Button>
                                    <Button size="xs" variant="outline" className="flex-1" onClick={() => setEditingResourceId(null)}><X size={12} className="mr-1" /> Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{item.title}</p>
                                    <p className="text-[10px] text-muted-foreground truncate opacity-70">{item.link}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingResourceId(item.id);
                                        setEditResourceTitle(item.title);
                                        setEditResourceLink(item.link || "");
                                        setEditResourceType(type);
                                      }}
                                    >
                                      <Pencil size={12} />
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => deleteResource(item.id, type)}
                                    >
                                      <Trash2 size={12} />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="attendance" id="batch-section-attendance" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <ClipboardCheck size={15} />
                  Add attendance ({selectedBatch.attendanceRecords.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Date for this session</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn("w-full sm:max-w-[240px] justify-start text-left font-normal")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                          {attendanceDateKey}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={attendanceSessionDate}
                          onSelect={(d) => {
                            if (d) setAttendanceSessionDate(d);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={attendanceDateKey}
                      onChange={(e) => {
                        const parsed = parseDdMmYyyy(e.target.value);
                        if (parsed) setAttendanceSessionDate(parsed);
                      }}
                      placeholder="DD-MM-YYYY"
                      className="sm:flex-1 font-mono text-sm"
                      aria-label="Attendance date (type or use calendar)"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Use the calendar or type the date. Tap Present or Absent for each student; same date + student
                    updates the row.
                  </p>
                </div>

                {selectedBatch.attendanceRecords.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Attendance Sessions</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(selectedBatch.attendanceRecords.map(r => r.date))).sort((a, b) => {
                        const dateA = parseDdMmYyyy(a) || new Date(0);
                        const dateB = parseDdMmYyyy(b) || new Date(0);
                        return dateB.getTime() - dateA.getTime();
                      }).map(date => (
                        <div key={date} className="flex items-center gap-1 bg-muted/30 rounded-md border border-border p-1 pr-2">
                          <button
                            type="button"
                            onClick={() => {
                              const parsed = parseDdMmYyyy(date);
                              if (parsed) setAttendanceSessionDate(parsed);
                            }}
                            className={cn(
                              "px-2 py-1 text-[10px] font-semibold rounded transition-colors",
                              attendanceDateKey === date ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                          >
                            {date}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const ok = window.confirm(`Delete all attendance for ${date}?`);
                              if (!ok) return;
                              updateSelectedBatch(batch => ({
                                ...batch,
                                attendanceRecords: batch.attendanceRecords.filter(r => r.date !== date)
                              }));
                              toast({ title: "Deleted", description: `Attendance for ${date} removed.` });
                            }}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBatch.students.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add students first.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedBatch.students.map((s) => {
                      const current = attendanceForStudentOnDate(s);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-xs font-semibold text-foreground uppercase truncate">
                              {s.name} - <span className="text-primary/70">{s.rollNo}</span>
                            </span>
                          </div>
                          <div className="flex gap-1.5 items-center shrink-0">
                            <Button
                              type="button"
                              size="xs"
                              variant={current?.status === "Present" ? "default" : "outline"}
                              className={cn("w-8 h-8 font-bold", current?.status === "Present" && "ring-2 ring-primary/30")}
                              onClick={() => setAttendanceQuick(s, "Present")}
                            >
                              P
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant={current?.status === "Absent" ? "destructive" : "outline"}
                              className={cn("w-8 h-8 font-bold", current?.status === "Absent" && "ring-2 ring-destructive/30")}
                              onClick={() => setAttendanceQuick(s, "Absent")}
                            >
                              A
                            </Button>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="xs"
                                variant={current?.status === "Late" ? "secondary" : "outline"}
                                className={cn("px-2.5 h-8 font-bold min-w-[3rem]", current?.status === "Late" && "ring-2 ring-secondary/30 bg-amber-500 text-white hover:bg-amber-600 border-amber-500")}
                                onClick={() => {
                                  const time = prompt("Enter late time (e.g. 10m)", current?.lateTime || "");
                                  if (time !== null) setAttendanceQuick(s, "Late", time);
                                }}
                              >
                                Late
                              </Button>
                              {current?.status === "Late" && current.lateTime && (
                                <span className="text-[10px] font-mono font-medium text-amber-600 bg-amber-50 px-1 rounded border border-amber-100 truncate max-w-[40px]">
                                  {current.lateTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

                {selectedBatch.homeworkRecords.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Previous HW Records</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(selectedBatch.homeworkRecords.map(r => r.homeworkTitle))).map(title => (
                        <div key={title} className="flex items-center gap-1 bg-muted/30 rounded-md border border-border p-1 pr-2">
                          <button
                            type="button"
                            onClick={() => setHwRecordTitle(title)}
                            className={cn(
                              "px-2 py-1 text-[10px] font-semibold rounded transition-colors",
                              hwRecordTitle === title ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                            )}
                          >
                            {title}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const ok = window.confirm(`Delete all records for HW "${title}"?`);
                              if (!ok) return;
                              updateSelectedBatch(batch => ({
                                ...batch,
                                homeworkRecords: batch.homeworkRecords.filter(r => r.homeworkTitle !== title)
                              }));
                              toast({ title: "Deleted", description: `HW "${title}" records removed.` });
                            }}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBatch.students.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add students first.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedBatch.students.map((s) => {
                      const current = hwRecordForStudent(s);
                      const isEditing = hwMarkDraft[s.id] !== undefined;
                      const savedRecord = selectedBatch.homeworkRecords.find(
                        (r) => r.studentEmail.toLowerCase() === s.email.toLowerCase() && r.homeworkTitle.trim() === hwRecordTitle.trim()
                      );

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-xs font-semibold text-foreground uppercase truncate">
                              {s.name} - <span className="text-primary/70">{s.rollNo}</span>
                            </span>
                          </div>

                          {!isEditing ? (
                            <div className="flex items-center gap-2">
                              {savedRecord ? (
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                  savedRecord.status === "Done" ? "bg-green-100 text-green-700" :
                                  savedRecord.status === "Not done" ? "bg-red-100 text-red-700" :
                                  "bg-amber-100 text-amber-700"
                                )}>
                                  {savedRecord.status === "Done" ? "D" : savedRecord.status === "Not done" ? "N" : "I"}
                                  {savedRecord.incompleteDetails && ` (${savedRecord.incompleteDetails})`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">No record</span>
                              )}
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setHwMarkDraft((prev) => ({
                                    ...prev,
                                    [s.id]: { 
                                      status: savedRecord?.status || "Done", 
                                      details: savedRecord?.incompleteDetails || "" 
                                    }
                                  }));
                                }}
                              >
                                <Pencil size={12} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5 items-center shrink-0">
                              {(["Done", "Not done", "Incomplete"] as const).map((st) => {
                                const selected = hwMarkDraft[s.id]?.status === st;
                                const label = st === "Done" ? "D" : st === "Not done" ? "N" : "I";
                                
                                return (
                                  <Button
                                    key={st}
                                    type="button"
                                    size="xs"
                                    variant={
                                      !selected ? "outline" : st === "Not done" ? "destructive" : "default"
                                    }
                                    className={cn(
                                      "w-8 h-8 font-bold text-xs",
                                      selected && st === "Incomplete" && "bg-amber-600 text-white hover:bg-amber-600/90 border-amber-600",
                                    )}
                                    onClick={() => {
                                      if (st === "Incomplete") {
                                        const details = prompt("Enter % completed (e.g. 50%)", hwMarkDraft[s.id]?.details || "");
                                        if (details !== null) {
                                          setHwMarkDraft(prev => ({ ...prev, [s.id]: { status: st, details } }));
                                        }
                                      } else {
                                        setHwMarkDraft(prev => ({ ...prev, [s.id]: { status: st, details: "" } }));
                                      }
                                    }}
                                    title={st}
                                  >
                                    {label}
                                  </Button>
                                );
                              })}
                              <div className="flex items-center gap-1 ml-1 border-l pl-2">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => saveHomeworkForStudent(s)}
                                >
                                  <Check size={14} className="text-green-600" />
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setHwMarkDraft((prev) => {
                                      const next = { ...prev };
                                      delete next[s.id];
                                      return next;
                                    });
                                  }}
                                >
                                  <X size={14} className="text-red-600" />
                                </Button>
                              </div>
                            </div>
                          )}
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
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="text-[11px] font-medium text-muted-foreground ml-1">Test Title</label>
                    <Input
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      placeholder="e.g. Unit Test 2"
                      className="h-9"
                    />
                  </div>
                  <div className="w-24 shrink-0">
                    <label className="text-[11px] font-medium text-muted-foreground ml-1">Max Marks</label>
                    <Input
                      value={testMaxMarks}
                      onChange={(e) => setTestMaxMarks(e.target.value)}
                      placeholder="Max"
                      className="h-9 font-mono"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                {selectedBatch.testMarksRecords.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Previous Test Records</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(selectedBatch.testMarksRecords.map(r => r.testTitle))).map(title => {
                        const firstRec = selectedBatch.testMarksRecords.find(r => r.testTitle === title);
                        return (
                          <div key={title} className="flex items-center gap-1 bg-muted/30 rounded-md border border-border p-1 pr-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTestTitle(title);
                                if (firstRec) setTestMaxMarks(firstRec.maxMarks);
                              }}
                              className={cn(
                                "px-2 py-1 text-[10px] font-semibold rounded transition-colors",
                                testTitle === title ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                              )}
                            >
                              {title}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const ok = window.confirm(`Delete all records for test "${title}"?`);
                                if (!ok) return;
                                updateSelectedBatch(batch => ({
                                  ...batch,
                                  testMarksRecords: batch.testMarksRecords.filter(r => r.testTitle !== title)
                                }));
                                toast({ title: "Deleted", description: `Test "${title}" records removed.` });
                              }}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedBatch.students.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add students first.</p>
                ) : (
                  <div className="space-y-1 mt-4">
                    {selectedBatch.students.map((s) => {
                      const obtained = obtainedDisplay(s);
                      const pct = computeTestPercentage(obtained, testMaxMarks);
                      const savedRecord = findTestRecord(s);
                      const isEditing = testMarkDraft[s.id] !== undefined;

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="text-xs font-semibold text-foreground uppercase truncate">
                              {s.name} - <span className="text-primary/70">{s.rollNo}</span>
                            </span>
                          </div>
                          
                          {!isEditing ? (
                            <div className="flex items-center gap-2">
                              {savedRecord ? (
                                <span className="text-[10px] font-mono font-bold bg-primary/5 text-primary px-2 py-0.5 rounded border border-primary/10">
                                  {savedRecord.marksObtained} / {savedRecord.maxMarks} ({savedRecord.percentage})
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">No marks</span>
                              )}
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setTestMarkDraft((prev) => ({
                                    ...prev,
                                    [s.id]: savedRecord?.marksObtained || ""
                                  }));
                                }}
                              >
                                <Pencil size={12} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center shrink-0">
                              <div className="w-14 shrink-0">
                                <Input
                                  value={obtained}
                                  onChange={(e) =>
                                    setTestMarkDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                                  }
                                  placeholder="Obt"
                                  className="h-8 text-[11px] px-1.5 font-mono text-center"
                                  inputMode="decimal"
                                  autoFocus
                                />
                              </div>
                              <div className="w-12 shrink-0">
                                <div className="h-8 flex items-center justify-center rounded-md border border-input bg-muted/30 px-1 text-[11px] font-mono text-muted-foreground">
                                  {testMaxMarks || "—"}
                                </div>
                              </div>
                              <div className="w-14 shrink-0">
                                <div className={cn(
                                  "h-8 flex items-center justify-center rounded-md border border-input px-1 text-[10px] font-mono tabular-nums",
                                  pct !== "—" ? "bg-primary/5 text-primary font-bold" : "bg-muted/20 text-muted-foreground"
                                )}>
                                  {pct}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-1 border-l pl-2">
                                <Button 
                                  type="button" 
                                  size="xs" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0" 
                                  onClick={() => saveTestMarkForStudent(s)}
                                >
                                  <Check size={14} className="text-green-600" />
                                </Button>
                                <Button 
                                  type="button" 
                                  size="xs" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0" 
                                  onClick={() => {
                                    setTestMarkDraft((prev) => {
                                      const next = { ...prev };
                                      delete next[s.id];
                                      return next;
                                    });
                                  }}
                                >
                                  <X size={14} className="text-red-600" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
