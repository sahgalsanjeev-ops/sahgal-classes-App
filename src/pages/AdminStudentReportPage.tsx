import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, isFuture, parse } from "date-fns";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/profiles";
import { fetchBatchesSupabase, type AttendanceRecord, type HomeworkRecord, type TestMarkRecord } from "@/lib/batches";

/**
 * Safely parse date strings in dd-MM-yyyy or ISO format
 * Prioritizes dd-MM-yyyy to avoid browser-specific MM-DD-YYYY swap (e.g. 11-04 being April 11 vs Nov 4)
 */
const parseDateSafe = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null;
  
  // 1. Try dd-MM-yyyy format manually first (as used by Batch Manager)
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Try ISO format (e.g. 2026-04-19T...)
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  return null;
};

const formatDateSafe = (dateStr: string | undefined | null, formatStr: string): string => {
  const d = parseDateSafe(dateStr);
  if (!d) return "—";
  try {
    return format(d, formatStr);
  } catch (e) {
    return "—";
  }
};

const AdminStudentReportPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [homework, setHomework] = useState<HomeworkRecord[]>([]);
  const [testMarks, setTestMarks] = useState<TestMarkRecord[]>([]);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!studentId || !isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Profile
      const { data: p, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();

      if (pError || !p) {
        toast({ variant: "destructive", title: "Student not found" });
        navigate("/admin");
        return;
      }
      setProfile(p as ProfileRow);
      const email = p.email?.toLowerCase();

      if (!email) {
        toast({ variant: "destructive", title: "Student has no email" });
        setLoading(false);
        return;
      }

      // 2. Fetch Batches for records
      const allBatches = await fetchBatchesSupabase();
      
      const studentAttendance: AttendanceRecord[] = [];
      const studentHomework: HomeworkRecord[] = [];
      const studentTestMarks: TestMarkRecord[] = [];

      allBatches.forEach(batch => {
        // Filter attendance
        const att = batch.attendanceRecords?.filter(r => r.studentEmail?.toLowerCase() === email) || [];
        studentAttendance.push(...att);

        // Filter homework
        const hw = batch.homeworkRecords?.filter(r => r.studentEmail?.toLowerCase() === email) || [];
        studentHomework.push(...hw);

        // Filter test marks
        const tm = batch.testMarksRecords?.filter(r => r.studentEmail?.toLowerCase() === email) || [];
        studentTestMarks.push(...tm);
      });

      // Filter and sort
      setAttendance(studentAttendance
        .filter(r => {
          const d = parseDateSafe(r.date);
          return d && !isFuture(d); // Remove future records
        })
        .sort((a, b) => (parseDateSafe(b.date)?.getTime() || 0) - (parseDateSafe(a.date)?.getTime() || 0))
      );
      setHomework(studentHomework
        .filter(r => {
          const d = parseDateSafe(r.date);
          return !d || !isFuture(d); // Remove future records (if date exists)
        })
        .sort((a, b) => {
          const da = parseDateSafe(a.date)?.getTime() || 0;
          const db = parseDateSafe(b.date)?.getTime() || 0;
          return db - da;
        })
      );
      setTestMarks(studentTestMarks
        .filter(r => {
          const d = parseDateSafe(r.date);
          return !d || !isFuture(d); // Remove future records (if date exists)
        })
        .sort((a, b) => {
          const da = parseDateSafe(a.date)?.getTime() || 0;
          const db = parseDateSafe(b.date)?.getTime() || 0;
          return db - da;
        })
      );

      // 3. Fetch Test Attempts (Online Tests)
      // Note: Joining online_tests for title. If this fails (400), we fetch separately.
      const { data: attempts, error: attError } = await supabase
        .from("test_attempts")
        .select(`
          id,
          test_id,
          score,
          total_questions,
          created_at,
          online_tests:test_id (
            test_title
          )
        `)
        .eq("student_email", email)
        .order("created_at", { ascending: false });

      if (attError) {
        console.error("Error fetching test attempts:", attError);
        // Fallback: fetch without join
        const { data: simpleAttempts } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("student_email", email)
          .order("created_at", { ascending: false });
        setTestAttempts(simpleAttempts || []);
      } else {
        setTestAttempts(attempts || []);
      }

    } catch (err) {
      console.error("Error loading report data:", err);
      toast({ variant: "destructive", title: "Error loading report" });
    } finally {
      setLoading(false);
    }
  }, [studentId, navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground font-medium">Generating Report...</span>
      </div>
    );
  }

  if (!profile) return null;

  // Summaries
  const totalClasses = attendance.length;
  const presentCount = attendance.filter(r => r.status === "Present").length;
  const absentCount = attendance.filter(r => r.status === "Absent").length;
  const attendancePct = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  const totalHW = homework.length;
  const completedHW = homework.filter(r => r.status === "Done").length;
  const pendingHW = totalHW - completedHW;

  // Unified tests
  const unifiedTests = [
    ...testMarks.map(tm => ({
      title: tm.testTitle,
      date: tm.date || "",
      obtained: tm.marksObtained,
      max: tm.maxMarks,
      pct: tm.percentage || "—"
    })),
    ...testAttempts.map(ta => ({
      title: ta.online_tests?.test_title || "Online Test",
      date: ta.created_at, // Keep original string for sorting
      formattedDate: formatDateSafe(ta.created_at, "dd MMM yyyy"),
      obtained: ta.score.toString(),
      max: ta.total_questions.toString(),
      pct: `${Math.round((ta.score / ta.total_questions) * 100)}%`
    }))
  ]
  .filter(r => {
    const d = parseDateSafe(r.date);
    return !d || !isFuture(d); // Remove future records
  })
  .sort((a, b) => {
    const da = parseDateSafe(a.date)?.getTime() || 0;
    const db = parseDateSafe(b.date)?.getTime() || 0;
    return db - da;
  });

  const avgScore = unifiedTests.length > 0 
    ? Math.round(unifiedTests.reduce((acc, curr) => {
        const p = parseFloat(curr.pct);
        return acc + (isNaN(p) ? 0 : p);
      }, 0) / unifiedTests.length)
    : 0;

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 print:p-0 print:m-0">
      {/* Action Header - Hidden on Print */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft size={18} /> Back to Admin
        </Button>
        <Button onClick={handlePrint} className="gap-2 bg-primary text-white hover:bg-primary/90">
          <Download size={18} /> Download Report as PDF
        </Button>
      </div>

      {/* Report Container */}
      <div className="max-w-4xl mx-auto border p-8 bg-white shadow-sm print:shadow-none print:border-none">
        
        {/* 1. Header */}
        <div className="text-center border-b-2 border-primary pb-6 mb-8">
          <h1 className="text-3xl font-bold text-primary mb-1">Sahgal Classes</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-4">Student Performance Report</p>
          
          <div className="grid grid-cols-3 gap-4 text-left mt-6">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Student Name</p>
              <p className="font-semibold text-lg">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Roll Number</p>
              <p className="font-semibold text-lg">{profile.roll_no || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Batch / Class</p>
              <p className="font-semibold text-lg">{profile.batch_code || profile.class_selection}</p>
            </div>
          </div>
        </div>

        {/* 2. Attendance Section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold border-l-4 border-primary pl-3 mb-4">Attendance Section</h2>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length > 0 ? (
                  attendance.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDateSafe(r.date, "dd MMM yyyy")}</TableCell>
                      <TableCell>{formatDateSafe(r.date, "EEEE")}</TableCell>
                      <TableCell className="text-right">
                        <span className={
                          r.status === "Present" ? "text-green-600 font-medium" : 
                          r.status === "Absent" ? "text-red-600 font-medium" : "text-yellow-600 font-medium"
                        }>
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">No attendance records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="bg-gray-50 p-3 flex justify-between text-sm font-bold border-t">
              <span>Total Classes: {totalClasses}</span>
              <span>Present: {presentCount}</span>
              <span>Absent: {absentCount}</span>
              <span className="text-primary">Attendance %: {attendancePct}%</span>
            </div>
          </div>
        </section>

        {/* 3. Homework Section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold border-l-4 border-primary pl-3 mb-4">Homework Section</h2>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>HW Title</TableHead>
                  <TableHead className="w-[150px]">Date Assigned</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homework.length > 0 ? (
                  homework.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.homeworkTitle}</TableCell>
                      <TableCell>{formatDateSafe(r.date, "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <span className={
                          r.status === "Done" ? "text-green-600 font-medium" : 
                          r.status === "Not done" ? "text-red-600 font-medium" : "text-yellow-600 font-medium"
                        }>
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">No homework records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="bg-gray-50 p-3 flex justify-between text-sm font-bold border-t">
              <span>Total HW Given: {totalHW}</span>
              <span>Completed: {completedHW}</span>
              <span className="text-primary">Pending/Incomplete: {pendingHW}</span>
            </div>
          </div>
        </section>

        {/* 4. Test Section */}
        <section className="mb-10">
          <h2 className="text-lg font-bold border-l-4 border-primary pl-3 mb-4">Test Section</h2>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Test Title</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="text-center">Marks</TableHead>
                  <TableHead className="text-center">Max</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unifiedTests.length > 0 ? (
                  unifiedTests.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{formatDateSafe(r.date, "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-center">{r.obtained}</TableCell>
                      <TableCell className="text-center">{r.max}</TableCell>
                      <TableCell className="text-right font-semibold">{r.pct}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No test records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="bg-gray-50 p-3 flex justify-end text-sm font-bold border-t">
              <span className="text-primary text-lg">Average Score: {avgScore}%</span>
            </div>
          </div>
        </section>

        {/* Footer info for print */}
        <div className="hidden print:block mt-20 text-center border-t pt-4">
          <p className="text-xs text-muted-foreground">This is a computer-generated report. No signature required.</p>
          <p className="text-xs text-muted-foreground mt-1">© {new Date().getFullYear()} Sahgal Classes. All rights reserved.</p>
        </div>

      </div>
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; padding: 0 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1cm; }
        }
      `}} />
    </div>
  );
};

export default AdminStudentReportPage;
