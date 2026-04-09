import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { Batch, computeTestPercentage, getBatches, fetchBatchesFromSupabase, StudentProfile } from "@/lib/batches";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchProfile, ProfileRow } from "@/lib/profiles";
import type { OnlineTestRow } from "@/lib/onlineTests";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const MyBatchPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("rahul@example.com");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchOnlineTests, setBatchOnlineTests] = useState<OnlineTestRow[]>([]);
  const [batchTestsLoading, setBatchTestsLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email?.toLowerCase();
        if (userEmail) {
          setEmail(userEmail);
          const p = await fetchProfile(user?.id);
          setProfile(p);
        }
      }
      // Combine localStorage batches with Supabase batches
      const localBatches = getBatches();
      const dbBatches = await fetchBatchesFromSupabase();
      
      // Merge: priority to localStorage if ID matches (to keep local resources for now)
      const merged = [...dbBatches];
      localBatches.forEach(lb => {
        const idx = merged.findIndex(mb => mb.id === lb.id || mb.batchCode === lb.batchCode);
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...lb };
        } else {
          merged.push(lb);
        }
      });

      setBatches(merged);
    };
    void run();
  }, []);

  const { myBatch, me } = useMemo(() => {
    // 1. Try finding by batch_id/batch_code from profile directly
    const targetBatchCode = profile?.batch_code || profile?.batches?.batch_code;
    const targetBatchId = profile?.batch_id;

    if (targetBatchId || targetBatchCode) {
      const b = batches.find(x => (targetBatchId && x.id === targetBatchId) || (targetBatchCode && x.batchCode === targetBatchCode));
      if (b) {
        // Find me in this batch or create a mock student profile from profile row
        const student = b.students.find(s => s.email.toLowerCase() === email.toLowerCase()) || {
          id: profile!.id,
          rollNo: profile!.roll_no || "",
          name: profile!.full_name || "",
          mobile: profile!.mobile || "",
          email: profile!.email || email
        };
        return { myBatch: b, me: student as StudentProfile };
      }
    }

    // 2. Fallback to searching all batches
    const em = email.toLowerCase();
    for (const batch of batches) {
      const student = batch.students.find((s) => s.email.toLowerCase() === em) ?? null;
      if (student) return { myBatch: batch, me: student };
    }
    return { myBatch: null as Batch | null, me: null as StudentProfile | null };
  }, [batches, email, profile]);

  const myAttendance = useMemo(() => {
    if (!myBatch || !me) return [];
    return myBatch.attendanceRecords.filter(
      (r) =>
        r.studentEmail.toLowerCase() === me.email.toLowerCase() ||
        (r.studentRollNo && r.studentRollNo.trim().toLowerCase() === me.rollNo.trim().toLowerCase()),
    );
  }, [myBatch, me]);

  const myHomework = useMemo(() => {
    if (!myBatch || !me) return [];
    return myBatch.homeworkRecords.filter(
      (r) =>
        r.studentEmail.toLowerCase() === me.email.toLowerCase() ||
        (r.studentRollNo && r.studentRollNo.trim().toLowerCase() === me.rollNo.trim().toLowerCase()),
    );
  }, [myBatch, me]);

  const myTests = useMemo(() => {
    if (!myBatch || !me) return [];
    return myBatch.testMarksRecords.filter(
      (r) =>
        r.studentEmail.toLowerCase() === me.email.toLowerCase() ||
        (r.studentRollNo && r.studentRollNo.trim().toLowerCase() === me.rollNo.trim().toLowerCase()),
    );
  }, [myBatch, me]);

  useEffect(() => {
    const code = myBatch?.batchCode?.trim();
    if (!code) {
      setBatchOnlineTests([]);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setBatchOnlineTests([]);
      return;
    }

    let cancelled = false;
    setBatchTestsLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("online_tests")
        .select("id, title, duration_minutes, questions, created_at, batch_code")
        .eq("batch_code", code)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setBatchOnlineTests([]);
        setBatchTestsLoading(false);
        return;
      }
      setBatchOnlineTests((data ?? []) as OnlineTestRow[]);
      setBatchTestsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [myBatch?.batchCode, myBatch?.id]);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="bg-primary px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <ArrowLeft size={22} className="text-primary-foreground" />
          </button>
          <h1 className="text-base font-bold text-primary-foreground">My Batch</h1>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {!myBatch || !me ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold text-foreground">No batch assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask admin to add your profile (email must match your login): {email}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-base font-bold text-foreground">{myBatch.batchName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Roll no.: <span className="font-semibold text-foreground">{me.rollNo}</span> · {me.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {myBatch.courseName} | Code: {myBatch.batchCode}
              </p>
              <p className="text-xs text-muted-foreground">
                Timing: {myBatch.timing} | Teacher: {myBatch.teacherName}
              </p>
            </div>

            <Accordion type="multiple" className="rounded-xl border border-border bg-card px-2 shadow-sm">
              <AccordionItem value="videos" className="border-b-0">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Course videos
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList title="" items={myBatch.videos} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hw" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  HW
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList title="" items={myBatch.homework} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pdf" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Study material PDF
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList title="" items={myBatch.studyMaterialPdfs} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tests" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Test papers
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList title="" items={myBatch.testPapers} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="onlinetests" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Online tests (MCQ)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {!isSupabaseConfigured || !supabase ? (
                      <p className="text-xs text-muted-foreground">Online tests need Supabase to be configured.</p>
                    ) : batchTestsLoading ? (
                      <p className="text-xs text-muted-foreground">Loading online tests…</p>
                    ) : batchOnlineTests.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No online tests assigned to this batch code yet.</p>
                    ) : (
                      batchOnlineTests.map((test) => {
                        const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
                        const duration = Math.max(1, Number(test.duration_minutes) || 30);
                        return (
                          <button
                            key={test.id}
                            type="button"
                            onClick={() => navigate(`/test/${test.id}`)}
                            className="w-full text-left rounded-lg border border-border bg-background px-3 py-2.5 hover:bg-muted/50 transition-colors"
                          >
                            <p className="text-xs font-semibold text-foreground">{test.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-3">
                              <span className="inline-flex items-center gap-0.5">
                                <FileText size={10} /> {qCount} Qs
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Clock size={10} /> {duration} min
                              </span>
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="att" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Student attendance
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pb-2">
                    {myAttendance.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No attendance records yet.</p>
                    ) : (
                      myAttendance.map((item) => (
                        <p key={item.id} className="text-xs text-foreground">
                          {item.date} — {item.status}
                        </p>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hwrec" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  HW record
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pb-2">
                    {myHomework.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No homework records yet.</p>
                    ) : (
                      myHomework.map((item) => (
                        <p key={item.id} className="text-xs text-foreground">
                          {item.homeworkTitle} — {item.status}
                        </p>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="testmarks" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Test marks record
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pb-2">
                    {myTests.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No test marks yet.</p>
                    ) : (
                      myTests.map((item) => {
                        const legacy = item as { marks?: string; marksObtained?: string; maxMarks?: string };
                        const obtained = legacy.marksObtained ?? legacy.marks ?? "";
                        const max = legacy.maxMarks ?? "";
                        const pct =
                          legacy.percentage ??
                          (max ? computeTestPercentage(obtained, max) : "—");
                        return (
                          <p key={item.id} className="text-xs text-foreground">
                            {item.testTitle} — {obtained}
                            {max ? ` / ${max}` : ""} ({pct})
                          </p>
                        );
                      })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </div>
    </div>
  );
};

const SectionList = ({ title, items }: { title: string; items: { id: string; title: string; link: string }[] }) => (
  <div className="pb-2">
    {title ? <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3> : null}
    <div className="space-y-1">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items yet.</p>
      ) : (
        items.map((item) => (
          <a
            key={item.id}
            href={item.link || "#"}
            target={item.link ? "_blank" : undefined}
            rel={item.link ? "noreferrer" : undefined}
            className="block text-xs text-primary hover:underline break-all"
          >
            {item.title}
          </a>
        ))
      )}
    </div>
  </div>
);

export default MyBatchPage;
