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
  Trash2,
  Search,
  Filter,
  PlayCircle,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  Batch,
  computeTestPercentage,
  deleteBatchSupabase,
  enrollStudentInBatch,
  fetchBatchesSupabase,
  getBatches,
  HomeworkStatus,
  makeId,
  saveBatches,
  saveBatchSupabase,
  StudentProfile,
  unenrollStudentFromBatch,
} from "@/lib/batches";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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

  const refreshBatches = async () => {
    const data = await fetchBatchesSupabase();
    setBatches(data);
  };

  const addBatchContent = async (type: "Video" | "PDF" | "HW" | "Test", title: string, urlOrNote: string | null, filePath: string | null) => {
    if (!selectedBatch || !supabase) return;
    const { error } = await supabase.from("batch_content").insert({
      batch_id: selectedBatch.id,
      type,
      title,
      url_or_note: urlOrNote,
      file_path: filePath
    });
    if (error) {
      toast({ variant: "destructive", title: "Failed to add content", description: error.message });
    } else {
      toast({ title: "Content added", description: `${type} added to batch.` });
      await refreshBatches();
    }
  };

  const deleteBatchContent = async (id: string) => {
    if (!supabase || !selectedBatch) return;
    
    // Find the item first to check if there's a file to delete
    const item = (selectedBatch.batchContent || []).find(c => c.id === id);
    
    const { error } = await supabase.from("batch_content").delete().eq("id", id);
    
    if (error) {
      toast({ variant: "destructive", title: "Failed to delete content", description: error.message });
    } else {
      // If there was an uploaded file, try to delete it from storage too
      if (item?.file_path) {
        const { error: storageError } = await supabase.storage
          .from("course-materials")
          .remove([item.file_path]);
        
        if (storageError) {
          console.warn("Could not delete file from storage:", storageError.message);
        }
      }
      
      toast({ title: "Content deleted" });
      await refreshBatches();
    }
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
            addBatchContent={addBatchContent}
            deleteBatchContent={deleteBatchContent}
            updateSelectedBatch={updateSelectedBatch}
            refreshBatches={refreshBatches}
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
            <AdminStudentProfilesSection refreshBatches={refreshBatches} />
          </div>
        )}
      </div>
    </div>
  );
};

interface StudentEnrollmentModalProps {
  batchId: string;
  enrolledEmails: string[];
  onSuccess: () => void;
}

const StudentEnrollmentModal = ({ batchId, enrolledEmails, onSuccess }: StudentEnrollmentModalProps) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      console.log("Fetching student data for modal...");
      
      try {
        // Fetch active profiles, enrollments, and batches separately to avoid relation errors
        const [
          { data: profilesData, error: profileError },
          { data: enrollmentsData, error: enrollError },
          { data: batchesData, error: batchError }
        ] = await Promise.all([
          supabase!.from("profiles").select("id, full_name, mobile, class_selection, email").eq("status", "active").order("full_name"),
          supabase!.from("batch_enrollments").select("batch_id, student_email"),
          supabase!.from("batches").select("id, batch_name")
        ]);

        if (profileError) throw profileError;
        if (enrollError) console.error("Enrollment fetch error:", enrollError);
        if (batchError) console.error("Batch fetch error:", batchError);

        console.log("Profiles fetched:", profilesData?.length || 0);
        console.log("Enrollments fetched:", enrollmentsData?.length || 0);

        setProfiles(profilesData || []);
        setEnrollments(enrollmentsData || []);
        setBatchesList(batchesData || []);
      } catch (err) {
        console.error("Error loading data for enrollment modal:", err);
        toast({ variant: "destructive", title: "Error", description: "Failed to load students list." });
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const filtered = profiles.filter(p => {
    const nameMatch = p.full_name?.toLowerCase().includes(search.toLowerCase());
    const mobileMatch = p.mobile?.includes(search);
    const searchMatch = !search || nameMatch || mobileMatch;
    
    // Exact match for class_selection column values
    const classMatch = classFilter === "all" || p.class_selection === classFilter;
    
    return searchMatch && classMatch;
  });

  const handleEnroll = async () => {
    if (selectedEmails.length === 0) return;
    setEnrolling(true);
    try {
      for (const email of selectedEmails) {
        await enrollStudentInBatch(batchId, email);
      }
      toast({ title: "Enrolled", description: `${selectedEmails.length} students added to batch.` });
      onSuccess();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not enroll students." });
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <>
      <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Search Name or Mobile..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 h-10 text-sm font-semibold min-w-[100px]"
          >
            <option value="all">All Classes</option>
            <option value="11th">11th</option>
            <option value="12th">12th</option>
            <option value="12th_pass">12th Pass</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filtered.map(p => {
            const isAlreadyEnrolled = enrolledEmails.includes(p.email?.toLowerCase());
            const isSelected = selectedEmails.includes(p.email);
            
            // Match enrollments client-side
            const studentEnrollments = enrollments.filter(e => e.student_email?.toLowerCase() === p.email?.toLowerCase());
            const otherBatches = studentEnrollments
              .filter(e => e.batch_id !== batchId)
              .map(e => {
                const b = batchesList.find(batch => batch.id === e.batch_id);
                return b?.batch_name;
              })
              .filter(Boolean);

            return (
              <div 
                key={p.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                  isAlreadyEnrolled ? "opacity-50 bg-muted border-transparent" : 
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/20"
                )}
              >
                {!isAlreadyEnrolled && (
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedEmails(prev => [...prev, p.email]);
                      else setSelectedEmails(prev => prev.filter(e => e !== p.email));
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{p.full_name || "Unknown"}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{p.mobile || "No Mobile"} • {p.class_selection}</p>
                  {otherBatches.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {otherBatches.map((name: string) => (
                        <span key={name} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
                {isAlreadyEnrolled && <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-2 py-1 rounded">Enrolled</span>}
              </div>
            );
          })}
        </div>
      </div>
      <DialogFooter className="p-6 border-t bg-muted/20">
        <Button 
          className="w-full h-12 font-bold text-base" 
          disabled={selectedEmails.length === 0 || enrolling}
          onClick={handleEnroll}
        >
          {enrolling ? <Loader2 className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
          Enroll {selectedEmails.length} Students
        </Button>
      </DialogFooter>
    </>
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
  addBatchContent: (type: "Video" | "PDF" | "HW" | "Test", title: string, urlOrNote: string | null, filePath: string | null) => Promise<void>;
  deleteBatchContent: (id: string) => Promise<void>;
  updateSelectedBatch: (updater: (batch: Batch) => Batch) => void;
  refreshBatches: () => void;
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
  addBatchContent,
  deleteBatchContent,
  updateSelectedBatch,
  refreshBatches,
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
  const [resourceType, setResourceType] = useState<"Video" | "PDF" | "HW" | "Test">("Video");
  const [contentUploadOption, setContentUploadOption] = useState<"link" | "file">("link");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hwRecordTitle, setHwRecordTitle] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testMaxMarks, setTestMaxMarks] = useState("");
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, { status: "Present" | "Absent" | "Late"; minutesLate?: number }>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Homework Records State
  const [hwSessionDate, setHwSessionDate] = useState(() => new Date());
  const hwDateKey = useMemo(() => format(hwSessionDate, "dd-MM-yyyy"), [hwSessionDate]);
  const [hwDraft, setHwDraft] = useState<Record<string, { status: HomeworkStatus; percent?: number }>>({});
  const [isSavingHw, setIsSavingHw] = useState(false);
  const [editingHwKey, setEditingHwKey] = useState<string | null>(null);

  // Test Records State
  const [testSessionDate, setTestSessionDate] = useState(() => new Date());
  const testDateKey = useMemo(() => format(testSessionDate, "dd-MM-yyyy"), [testSessionDate]);
  const [testDraft, setTestDraft] = useState<Record<string, { marks: string; absent: boolean }>>({});
  const [isSavingTest, setIsSavingTest] = useState(false);

  const [studentSortOrder, setStudentSortOrder] = useState<"name" | "roll">("name");

  const sortedStudents = useMemo(() => {
    if (!selectedBatch) return [];
    return [...selectedBatch.students].sort((a, b) => {
      if (studentSortOrder === "name") {
        return (a.name || "").localeCompare(b.name || "");
      } else {
        const rollA = parseInt(a.rollNo) || 0;
        const rollB = parseInt(b.rollNo) || 0;
        return rollA - rollB;
      }
    });
  }, [selectedBatch?.students, studentSortOrder]);

  const handleUploadAndAdd = async () => {
    if (!selectedBatch || !resourceTitle.trim()) {
      toast({ variant: "destructive", title: "Title required" });
      return;
    }

    setIsUploading(true);
    try {
      let finalUrlOrNote = resourceLink.trim();
      let finalFilePath = null;

      const isUploadType = resourceType === "PDF" || resourceType === "HW" || resourceType === "Test";

      if (isUploadType && contentUploadOption === "file" && selectedFile) {
        // Automatic Naming: Type_Batch_Date.extension
        const extension = selectedFile.name.split('.').pop();
        const batchName = selectedBatch.batchName.replace(/\s+/g, '_');
        const dateStr = format(new Date(), "dd-MM-yyyy");
        const formattedFileName = `${resourceType}_${batchName}_${dateStr}_${Date.now()}.${extension}`;
        
        const filePath = `course-materials/${selectedBatch.id}/${formattedFileName}`;
        
        const { error: uploadError } = await supabase!.storage
          .from("course-materials")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase!.storage.from("course-materials").getPublicUrl(filePath);
        finalUrlOrNote = publicUrlData.publicUrl;
        finalFilePath = filePath;
      }

      await addBatchContent(resourceType, resourceTitle.trim(), finalUrlOrNote || null, finalFilePath);
      
      // Reset form
      setResourceTitle("");
      setResourceLink("");
      setSelectedFile(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Load existing test into draft when date/title changes
  useEffect(() => {
    if (!selectedBatch || !testTitle.trim()) {
      setTestDraft({});
      return;
    }
    const date = testDateKey;
    const title = testTitle.trim();
    const draft: Record<string, { marks: string; absent: boolean }> = {};

    selectedBatch.testMarksRecords.forEach((r) => {
      if (r.date === date && r.testTitle === title) {
        const student = selectedBatch.students.find(s => s.email.toLowerCase() === r.studentEmail.toLowerCase());
        if (student) {
          draft[student.id] = { 
            marks: r.marksObtained === "A" ? "" : r.marksObtained, 
            absent: r.marksObtained === "A" 
          };
        }
      }
    });
    setTestDraft(draft);
    if (selectedBatch.testMarksRecords.length > 0) {
      const firstMatch = selectedBatch.testMarksRecords.find(r => r.date === date && r.testTitle === title);
      if (firstMatch) setTestMaxMarks(firstMatch.maxMarks);
    }
  }, [selectedBatchId, testDateKey, testTitle, selectedBatch?.students]);

  const saveTestSet = async () => {
    if (!selectedBatch || !testTitle.trim() || !testMaxMarks.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Test name, total marks, and date are required." });
      return;
    }
    setIsSavingTest(true);
    try {
      const date = testDateKey;
      const title = testTitle.trim();
      const max = testMaxMarks.trim();

      await updateSelectedBatch((batch) => {
        const otherRecords = batch.testMarksRecords.filter(
          (r) => !(r.date === date && r.testTitle === title)
        );

        const newRecords = batch.students
          .filter((s) => testDraft[s.id])
          .map((s) => {
            const marks = testDraft[s.id].absent ? "A" : testDraft[s.id].marks;
            const pct = computeTestPercentage(marks, max);
            return {
              id: makeId(),
              studentEmail: s.email.toLowerCase(),
              studentRollNo: s.rollNo,
              date,
              testTitle: title,
              maxMarks: max,
              marksObtained: marks,
              percentage: pct,
            };
          });

        return {
          ...batch,
          testMarksRecords: [...otherRecords, ...newRecords as any],
        };
      });

      toast({ title: "Test Record Saved", description: `Test "${title}" for ${date} saved.` });
      setTestTitle("");
      setTestMaxMarks("");
      setTestDraft({});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } finally {
      setIsSavingTest(false);
    }
  };

  const deleteTestSet = async (date: string, title: string) => {
    if (!window.confirm(`Delete all records for "${title}" on ${date}?`)) return;
    try {
      await updateSelectedBatch((batch) => ({
        ...batch,
        testMarksRecords: batch.testMarksRecords.filter(
          (r) => !(r.date === date && r.testTitle === title)
        ),
      }));
      toast({ title: "Deleted", description: "Test records removed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    }
  };

  const editTestSet = (date: string, title: string) => {
    setTestTitle(title);
    const parsedDate = parseDdMmYyyy(date);
    if (parsedDate) setTestSessionDate(parsedDate);
    const el = document.getElementById("batch-section-tests");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const testHistory = useMemo(() => {
    if (!selectedBatch) return [];
    const groups: Record<string, { date: string; title: string }> = {};
    selectedBatch.testMarksRecords.forEach((r) => {
      const key = `${r.date || "N/A"}_${r.testTitle}`;
      if (!groups[key]) {
        groups[key] = { date: r.date || "N/A", title: r.testTitle };
      }
    });
    return Object.values(groups).sort((a, b) => {
      const da = parseDdMmYyyy(a.date)?.getTime() || 0;
      const db = parseDdMmYyyy(b.date)?.getTime() || 0;
      return db - da;
    });
  }, [selectedBatch?.testMarksRecords]);

  // Load existing homework into draft when date/title changes
  useEffect(() => {
    if (!selectedBatch || !hwRecordTitle.trim()) {
      setHwDraft({});
      return;
    }
    const date = hwDateKey;
    const title = hwRecordTitle.trim();
    const draft: Record<string, { status: HomeworkStatus; percent?: number }> = {};

    selectedBatch.homeworkRecords.forEach((r) => {
      if (r.date === date && r.homeworkTitle === title) {
        const student = selectedBatch.students.find(s => s.email.toLowerCase() === r.studentEmail.toLowerCase());
        if (student) {
          draft[student.id] = { status: r.status, percent: r.completionPercent };
        }
      }
    });
    setHwDraft(draft);
  }, [selectedBatchId, hwDateKey, hwRecordTitle, selectedBatch?.students]);

  const saveHomework = async () => {
    if (!selectedBatch || !hwRecordTitle.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Assignment name and date are required." });
      return;
    }
    setIsSavingHw(true);
    try {
      const date = hwDateKey;
      const title = hwRecordTitle.trim();

      await updateSelectedBatch((batch) => {
        // Remove existing records for THIS date and title
        const otherRecords = batch.homeworkRecords.filter(
          (r) => !(r.date === date && r.homeworkTitle === title)
        );

        // Add new records from draft
        const newRecords = batch.students
          .filter((s) => hwDraft[s.id])
          .map((s) => ({
            id: makeId(),
            studentEmail: s.email.toLowerCase(),
            studentRollNo: s.rollNo,
            date,
            homeworkTitle: title,
            status: hwDraft[s.id].status,
            completionPercent: hwDraft[s.id].percent,
          }));

        return {
          ...batch,
          homeworkRecords: [...otherRecords, ...newRecords as any],
        };
      });

      toast({ title: "HW Record Saved", description: `Homework "${title}" for ${date} saved.` });
      setHwRecordTitle("");
      setHwDraft({});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } finally {
      setIsSavingHw(false);
    }
  };

  const deleteHwRecordSet = async (date: string, title: string) => {
    if (!window.confirm(`Delete all records for "${title}" on ${date}?`)) return;
    try {
      await updateSelectedBatch((batch) => ({
        ...batch,
        homeworkRecords: batch.homeworkRecords.filter(
          (r) => !(r.date === date && r.homeworkTitle === title)
        ),
      }));
      toast({ title: "Deleted", description: "Homework records removed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    }
  };

  const editHwRecordSet = (date: string, title: string) => {
    setHwRecordTitle(title);
    const parsedDate = parseDdMmYyyy(date);
    if (parsedDate) setHwSessionDate(parsedDate);
    const el = document.getElementById("batch-section-hw");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Grouped HW history for display
  const hwHistory = useMemo(() => {
    if (!selectedBatch) return [];
    const groups: Record<string, { date: string; title: string }> = {};
    selectedBatch.homeworkRecords.forEach((r) => {
      const key = `${r.date || "N/A"}_${r.homeworkTitle}`;
      if (!groups[key]) {
        groups[key] = { date: r.date || "N/A", title: r.homeworkTitle };
      }
    });
    return Object.values(groups).sort((a, b) => {
      const da = parseDdMmYyyy(a.date)?.getTime() || 0;
      const db = parseDdMmYyyy(b.date)?.getTime() || 0;
      return db - da;
    });
  }, [selectedBatch?.homeworkRecords]);

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

  const hwStatusForStudent = (student: StudentProfile) => {
    if (!selectedBatch || !hwRecordTitle.trim()) return null;
    const t = hwRecordTitle.trim();
    const rec = selectedBatch.homeworkRecords.find(
      (r) => r.studentEmail.toLowerCase() === student.email.toLowerCase() && r.homeworkTitle.trim() === t,
    );
    return rec?.status ?? null;
  };

  useEffect(() => {
    setTestTitle("");
    setTestMaxMarks("");
  }, [selectedBatchId]);

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
              <AccordionContent className="space-y-4 pb-4 px-1">
                <div className="flex flex-col gap-3 bg-muted/30 p-4 rounded-xl border-2 border-dashed border-primary/20">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="default" className="flex-1 gap-2 h-11 font-bold shadow-lg shadow-primary/10">
                          <Users size={18} />
                          Select from Registered Students
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
                        <DialogHeader className="p-6 pb-2">
                          <DialogTitle className="flex items-center gap-2 text-xl">
                            <Users className="text-primary" />
                            Registered Students
                          </DialogTitle>
                        </DialogHeader>
                        <StudentEnrollmentModal 
                          batchId={selectedBatch.id}
                          enrolledEmails={selectedBatch.students.map(s => s.email.toLowerCase())}
                          onSuccess={() => {
                            void refreshBatches();
                          }}
                        />
                      </DialogContent>
                    </Dialog>

                    <div className="flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase px-2">OR</div>

                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input 
                          value={studentEmail} 
                          onChange={(e) => setStudentEmail(e.target.value)} 
                          placeholder="Enter Student Email" 
                          className="h-11 font-semibold border-2"
                        />
                        <Button 
                          onClick={async () => {
                            if (!studentEmail.trim()) return;
                            const email = studentEmail.trim().toLowerCase();
                            const exists = selectedBatch.students.some(s => s.email.toLowerCase() === email);
                            if (exists) {
                              toast({ variant: "destructive", title: "Already added", description: "Student is already in this batch." });
                              return;
                            }
                            const ok = await enrollStudentInBatch(selectedBatch.id, email);
                            if (ok) {
                              toast({ title: "Enrolled", description: "Student added successfully." });
                              setStudentEmail("");
                              void refreshBatches();
                            }
                          }}
                          className="h-11 px-6 font-bold"
                        >
                          Add Manually
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBatch.students.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Enrolled Students</p>
                    {selectedBatch.students.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg border-2 border-border bg-card p-2 group transition-all hover:border-primary/20"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">
                            {s.name} <span className="text-primary font-medium ml-1">({s.rollNo || "No Roll"})</span>
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                            onClick={async () => {
                              if (!window.confirm(`Remove ${s.name} from this batch?`)) return;
                              const ok = await unenrollStudentFromBatch(selectedBatch.id, s.email);
                              if (ok) {
                                toast({ title: "Removed", description: "Student removed from batch." });
                                void refreshBatches();
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="content" id="batch-section-content" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <NotebookPen size={15} />
                  Protected Course Content (Videos, PDFs, HW)
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                {/* Content Upload Form */}
                <div className="bg-muted/30 p-4 rounded-xl border-2 border-dashed border-primary/20 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Content Type</label>
                      <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value as any)}
                        className="w-full h-10 rounded-lg border-2 border-input bg-background px-3 text-sm font-bold"
                      >
                        <option value="Video">Video (YouTube Unlisted)</option>
                        <option value="PDF">PDF (Document)</option>
                        <option value="HW">Homework (HW)</option>
                        <option value="Test">Test Paper</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Title</label>
                      <Input 
                        value={resourceTitle} 
                        onChange={(e) => setResourceTitle(e.target.value)} 
                        placeholder={resourceType === "Video" ? "e.g. Intro to React" : `e.g. ${resourceType} 1`} 
                        className="h-10 font-semibold border-2"
                      />
                    </div>
                  </div>

                  {resourceType !== "Video" && (
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="contentOption"
                            checked={contentUploadOption === "link"} 
                            onChange={() => setContentUploadOption("link")} 
                          />
                          Paste Link
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input 
                            type="radio" 
                            name="contentOption"
                            checked={contentUploadOption === "file"} 
                            onChange={() => setContentUploadOption("file")} 
                          />
                          Upload File
                        </label>
                      </div>
                      
                      {contentUploadOption === "file" ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            type="file" 
                            accept={resourceType === "Video" ? "video/*" : "application/pdf"}
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="h-10 text-xs flex-1"
                          />
                        </div>
                      ) : (
                        <Input 
                          value={resourceLink} 
                          onChange={(e) => setResourceLink(e.target.value)} 
                          placeholder={`Paste ${resourceType} link here...`} 
                          className="h-10 font-semibold border-2"
                        />
                      )}
                    </div>
                  )}

                  {resourceType === "Video" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">
                        YouTube Video URL (Unlisted)
                      </label>
                      <Input 
                        value={resourceLink} 
                        onChange={(e) => setResourceLink(e.target.value)} 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        className="h-10 font-semibold border-2"
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleUploadAndAdd} 
                    disabled={isUploading || !resourceTitle.trim()} 
                    className="w-full h-11 font-bold gap-2 shadow-lg"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    {isUploading ? "Uploading..." : `Add ${resourceType}`}
                  </Button>
                </div>

                {/* Content List View */}
                <div className="space-y-6 pt-2">
                  {(["Video", "PDF", "HW", "Test"] as const).map((type) => {
                    const items = (selectedBatch.batchContent || []).filter(c => c.type === type);
                    if (items.length === 0) return null;

                    return (
                      <div key={type} className="space-y-3">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">{type}s</h4>
                        
                        {type === "Video" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.map((item) => {
                              // Simple YouTube ID extraction
                              let videoId = "";
                              const url = item.url_or_note || "";
                              if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
                              else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
                              else if (url.includes("embed/")) videoId = url.split("embed/")[1]?.split("?")[0];

                              return (
                                <div 
                                  key={item.id} 
                                  className="group relative flex flex-col gap-2 p-2 rounded-xl border-2 border-border bg-card hover:border-primary/20 transition-all shadow-sm"
                                >
                                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                                    {videoId ? (
                                      <img 
                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <PlayCircle className="text-muted-foreground" size={24} />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                      <PlayCircle className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-start justify-between gap-2 px-1">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">{item.url_or_note}</p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                                      onClick={() => {
                                        if (window.confirm("Delete this video?")) {
                                          void deleteBatchContent(item.id);
                                        }
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {items.map((item) => (
                              <div 
                                key={item.id} 
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-border bg-card group hover:border-primary/20 transition-all shadow-sm"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{item.url_or_note || "Uploaded file"}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      if (window.confirm("Delete this content?")) {
                                        void deleteBatchContent(item.id);
                                      }
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Mark Attendance</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-[10px] font-bold uppercase tracking-tight text-primary hover:bg-primary/5"
                        onClick={() => setStudentSortOrder(prev => prev === "name" ? "roll" : "name")}
                      >
                        <ArrowUpDown size={12} />
                        Sort: {studentSortOrder === "name" ? "Name" : "Roll No"}
                      </Button>
                    </div>
                    {sortedStudents.map((s) => {
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
                <span className="flex items-center gap-2">
                  <NotebookPen size={15} />
                  Add HW record ({selectedBatch.homeworkRecords.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4 px-1">
                <div className="space-y-3 bg-muted/30 p-3 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
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
                            {hwDateKey}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={hwSessionDate}
                            onSelect={(d) => d && setHwSessionDate(d)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Assignment Name</label>
                      <Input
                        value={hwRecordTitle}
                        onChange={(e) => setHwRecordTitle(e.target.value)}
                        placeholder="e.g. Integration Set 3"
                        className="h-11 font-semibold border-2 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {selectedBatch.students.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground">Add students first.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Mark HW</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-[10px] font-bold uppercase tracking-tight text-primary hover:bg-primary/5"
                        onClick={() => setStudentSortOrder(prev => prev === "name" ? "roll" : "name")}
                      >
                        <ArrowUpDown size={12} />
                        Sort: {studentSortOrder === "name" ? "Name" : "Roll No"}
                      </Button>
                    </div>
                    {sortedStudents.map((s) => {
                      const draft = hwDraft[s.id];
                      const status = draft?.status;

                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "flex flex-col gap-2 rounded-lg border-2 p-2 transition-all",
                            status === "Done" ? "border-green-100 bg-green-50/30" : 
                            status === "Not done" ? "border-red-100 bg-red-50/30" : 
                            status === "Incomplete" ? "border-yellow-200 bg-yellow-50" : 
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
                                variant={status === "Done" ? "default" : "ghost"}
                                className={cn(
                                  "h-7 px-2.5 text-[10px] font-bold rounded-md transition-all",
                                  status === "Done" ? "bg-green-600 hover:bg-green-700 shadow-sm" : "text-muted-foreground hover:text-green-600"
                                )}
                                onClick={() => setHwDraft(prev => ({ ...prev, [s.id]: { status: "Done" } }))}
                              >
                                Done
                              </Button>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={status === "Incomplete" ? "default" : "ghost"}
                                    className={cn(
                                      "h-7 px-2.5 text-[10px] font-bold rounded-md transition-all min-w-[4.5rem]",
                                      status === "Incomplete" ? "bg-yellow-500 hover:bg-yellow-600 shadow-sm" : "text-muted-foreground hover:text-yellow-600"
                                    )}
                                  >
                                    {status === "Incomplete" && draft?.percent ? `${draft.percent}%` : "Incomplete"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-3" side="top" align="center">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Completion %</label>
                                    <Input
                                      type="number"
                                      autoFocus
                                      value={draft?.percent || ""}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        setHwDraft(prev => ({ 
                                          ...prev, 
                                          [s.id]: { status: "Incomplete", percent: isNaN(val) ? 0 : Math.min(100, Math.max(0, val)) } 
                                        }));
                                      }}
                                      className="h-8 text-xs font-bold"
                                      placeholder="0-100"
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>

                              <Button
                                type="button"
                                size="sm"
                                variant={status === "Not done" ? "default" : "ghost"}
                                className={cn(
                                  "h-7 px-2.5 text-[10px] font-bold rounded-md transition-all",
                                  status === "Not done" ? "bg-red-600 hover:bg-red-700 shadow-sm" : "text-muted-foreground hover:text-red-600"
                                )}
                                onClick={() => setHwDraft(prev => ({ ...prev, [s.id]: { status: "Not done" } }))}
                              >
                                Not Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button 
                      onClick={saveHomework} 
                      disabled={isSavingHw}
                      className="w-full h-14 mt-4 text-base font-bold gap-2 rounded-xl shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      {isSavingHw ? <Loader2 className="animate-spin" size={20} /> : <NotebookPen size={20} />}
                      {isSavingHw ? "Saving HW Record..." : "Save Record"}
                    </Button>
                  </div>
                )}

                {/* HW History Section */}
                {hwHistory.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">HW History</h4>
                    <div className="space-y-2">
                      {hwHistory.map((h) => (
                        <div key={`${h.date}_${h.title}`} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm group">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{h.title}</p>
                            <p className="text-[11px] font-medium text-primary">{h.date}</p>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => editHwRecordSet(h.date, h.title)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteHwRecordSet(h.date, h.title)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tests" id="batch-section-tests" className="border-b-0 border-t">
              <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <BarChart3 size={15} />
                  Add test record ({selectedBatch.testMarksRecords.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4 px-1">
                <div className="space-y-3 bg-muted/30 p-3 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Test Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn("w-full justify-start text-left font-semibold h-11 rounded-lg border-2", 
                              "hover:border-primary/50 hover:bg-background transition-all")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {testDateKey}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={testSessionDate}
                            onSelect={(d) => d && setTestSessionDate(d)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Test Name</label>
                      <Input
                        value={testTitle}
                        onChange={(e) => setTestTitle(e.target.value)}
                        placeholder="e.g. Algebra Unit Test"
                        className="h-11 font-semibold border-2 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Total Marks</label>
                      <Input
                        value={testMaxMarks}
                        onChange={(e) => setTestMaxMarks(e.target.value)}
                        placeholder="Max Marks"
                        className="h-11 font-semibold border-2 rounded-lg"
                        type="number"
                      />
                    </div>
                  </div>
                </div>

                {selectedBatch.students.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl">
                    <p className="text-sm text-muted-foreground">Add students first.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Mark Test Marks</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-[10px] font-bold uppercase tracking-tight text-primary hover:bg-primary/5"
                        onClick={() => setStudentSortOrder(prev => prev === "name" ? "roll" : "name")}
                      >
                        <ArrowUpDown size={12} />
                        Sort: {studentSortOrder === "name" ? "Name" : "Roll No"}
                      </Button>
                    </div>
                    {sortedStudents.map((s) => {
                      const draft = testDraft[s.id] || { marks: "", absent: false };
                      const pct = computeTestPercentage(draft.absent ? "A" : draft.marks, testMaxMarks);

                      return (
                        <div
                          key={s.id}
                          className={cn(
                            "flex flex-col gap-2 rounded-lg border-2 p-2 transition-all",
                            draft.absent ? "border-red-100 bg-red-50/30" : 
                            draft.marks ? "border-green-100 bg-green-50/30" : 
                            "border-border bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-foreground">
                                {s.name} <span className="text-primary font-medium ml-1">({s.rollNo})</span>
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 mr-2">
                                <Checkbox 
                                  id={`absent-${s.id}`} 
                                  checked={draft.absent}
                                  onCheckedChange={(checked) => {
                                    setTestDraft(prev => ({ 
                                      ...prev, 
                                      [s.id]: { ...prev[s.id], absent: !!checked } 
                                    }));
                                  }}
                                />
                                <label htmlFor={`absent-${s.id}`} className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer">Absent</label>
                              </div>

                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  disabled={draft.absent}
                                  value={draft.marks}
                                  onChange={(e) => {
                                    setTestDraft(prev => ({ 
                                      ...prev, 
                                      [s.id]: { ...prev[s.id], marks: e.target.value } 
                                    }));
                                  }}
                                  className="h-8 w-20 text-xs font-bold"
                                  placeholder="Marks"
                                />
                                <div className={cn(
                                  "h-8 px-2 flex items-center justify-center rounded border bg-muted/50 text-[10px] font-bold min-w-[3rem]",
                                  pct === "A" ? "text-destructive" : "text-primary"
                                )}>
                                  {pct}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button 
                      onClick={saveTestSet} 
                      disabled={isSavingTest}
                      className="w-full h-14 mt-4 text-base font-bold gap-2 rounded-xl shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      {isSavingTest ? <Loader2 className="animate-spin" size={20} /> : <BarChart3 size={20} />}
                      {isSavingTest ? "Saving Test Records..." : "Save Test Record"}
                    </Button>
                  </div>
                )}

                {/* Test History Section */}
                {testHistory.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Test History</h4>
                    <div className="space-y-2">
                      {testHistory.map((h) => (
                        <div key={`${h.date}_${h.title}`} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm group">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{h.title}</p>
                            <p className="text-[11px] font-medium text-primary">{h.date}</p>
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={() => editTestSet(h.date, h.title)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteTestSet(h.date, h.title)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
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
