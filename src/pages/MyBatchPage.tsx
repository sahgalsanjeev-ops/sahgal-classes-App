import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, FileText, Loader2 } from "lucide-react";
import { Batch, BatchContent, computeTestPercentage, fetchBatchesSupabase, getBatches, makeId, StudentProfile } from "@/lib/batches";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { OnlineTestRow } from "@/lib/onlineTests";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle } from "lucide-react";

const MyBatchPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchOnlineTests, setBatchOnlineTests] = useState<OnlineTestRow[]>([]);
  const [attempts, setAttempts] = useState<Set<string>>(new Set());
  const [batchTestsLoading, setBatchTestsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // 1. Get user and profile
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userEmail = user.email || "";
          setEmail(userEmail);
          const { data: p } = await supabase
            .from("profiles")
            .select("*, batches(*)")
            .eq("id", user.id)
            .eq("status", "active")
            .maybeSingle();
          setProfile(p);

          // Fetch attempts
          const { data: attemptsData } = await supabase
            .from("test_attempts")
            .select("test_id")
            .eq("student_email", userEmail);
          
          if (attemptsData) {
            setAttempts(new Set(attemptsData.map(a => a.test_id)));
          }
        }
      }

      // 2. Load batches from Supabase
      const sb = await fetchBatchesSupabase();
      if (sb.length > 0) {
        setBatches(sb);
      } else {
        setBatches(getBatches());
      }
      setLoading(false);
    };
    void loadData();
  }, []);

  const { myBatch, me } = useMemo(() => {
    if (!email && !profile) return { myBatch: null, me: null };
    
    // Priority 1: Find batch by batch_code/id in profile
    const targetCode = profile?.batch_code || profile?.batches?.batch_code;
    const targetId = profile?.batch_id;
    
    if (targetId || targetCode) {
      const b = batches.find(x => (targetId && x.id === targetId) || (targetCode && x.batchCode === targetCode));
      if (b) {
        const student = b.students.find(s => s.email.toLowerCase() === email.toLowerCase()) || {
          id: profile?.id || makeId(),
          rollNo: profile?.roll_no || "",
          name: profile?.full_name || "",
          email: profile?.email || email
        };
        return { myBatch: b, me: student as StudentProfile };
      }
    }

    // Priority 2: Search all batches for this email
    const em = email.toLowerCase();
    for (const batch of batches) {
      const student = batch.students.find((s) => s.email.toLowerCase() === em) ?? null;
      if (student) return { myBatch: batch, me: student };
    }
    return { myBatch: null, me: null };
  }, [batches, email, profile]);

  const myAttendance = useMemo(() => {
    if (!myBatch || !me) return [];
    return myBatch.attendanceRecords.filter(
      (r) => r.studentEmail.toLowerCase() === me.email.toLowerCase()
    );
  }, [myBatch, me]);

  const myHomework = useMemo(() => {
    if (!myBatch || !me) return [];
    return myBatch.homeworkRecords.filter(
      (r) => r.studentEmail.toLowerCase() === me.email.toLowerCase()
    );
  }, [myBatch, me]);

  const myTests = useMemo(() => {
    if (!myBatch || !me) return [];
    return myBatch.testMarksRecords.filter(
      (r) => r.studentEmail.toLowerCase() === me.email.toLowerCase()
    );
  }, [myBatch, me]);

  useEffect(() => {
    const code = myBatch?.batchCode?.trim();
    if (!code || !isSupabaseConfigured || !supabase) {
      setBatchOnlineTests([]);
      return;
    }

    let cancelled = false;
    
    const fetchBatchTests = async () => {
      setBatchTestsLoading(true);
      const { data, error } = await supabase
        .from("online_tests")
        .select("*")
        .eq("batch_code", code)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("Batch Online Tests Fetch Error:", error);
        setBatchOnlineTests([]);
      } else {
        setBatchOnlineTests((data ?? []) as OnlineTestRow[]);
      }
      setBatchTestsLoading(false);
    };

    void fetchBatchTests();

    // Set up real-time subscription for deletions/updates
    const channel = supabase
      .channel(`online_tests_batch_${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "online_tests",
          filter: `batch_code=eq.${code}`,
        },
        () => {
          // Re-fetch when any change happens to tests in this batch
          void fetchBatchTests();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="animate-spin mb-2" size={24} />
            <p className="text-sm">Loading batch details...</p>
          </div>
        ) : !myBatch || !me ? (
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
                  <SectionList 
                    type="Video" 
                    items={(myBatch.batchContent || []).filter(c => c.type === "Video")} 
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="hw" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  HW
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList 
                    type="HW" 
                    items={(myBatch.batchContent || []).filter(c => c.type === "HW")} 
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pdf" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Study material PDF
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList 
                    type="PDF" 
                    items={(myBatch.batchContent || []).filter(c => c.type === "PDF")} 
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tests" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  Test papers
                </AccordionTrigger>
                <AccordionContent>
                  <SectionList 
                    type="Test" 
                    items={(myBatch.batchContent || []).filter(c => c.type === "Test")} 
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="onlinetests" className="border-b-0 border-t">
                <AccordionTrigger className="text-sm font-semibold py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Online tests (MCQ)</span>
                    {batchOnlineTests.length > 0 && !batchTestsLoading && (
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {batchOnlineTests.length} Live
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pb-2">
                    {!isSupabaseConfigured || !supabase ? (
                      <p className="text-xs text-muted-foreground">Online tests need Supabase to be configured.</p>
                    ) : batchTestsLoading ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                        <Loader2 className="animate-spin" size={14} />
                        <span>Syncing tests...</span>
                      </div>
                    ) : batchOnlineTests.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic opacity-60">No online tests assigned to this batch code yet.</p>
                    ) : (
                      batchOnlineTests.map((test) => {
                        const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
                        const duration = Math.max(1, Number(test.duration_minutes) || 30);
                        const isAttempted = attempts.has(test.id);
                        return (
                          <button
                            key={test.id}
                            type="button"
                            disabled={isAttempted}
                            onClick={() => !isAttempted && navigate(`/test/${test.id}`)}
                            className={`w-full text-left rounded-lg border border-border px-3 py-2.5 transition-all ${
                              isAttempted 
                                ? "bg-muted/30 opacity-70 cursor-default" 
                                : "bg-background hover:bg-muted/50 active:scale-[0.98]"
                            }`}
                          >
                            <p className={`text-xs font-semibold ${isAttempted ? "text-muted-foreground" : "text-foreground"}`}>
                              {test.test_title}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-muted-foreground flex items-center gap-3">
                                <span className="inline-flex items-center gap-0.5">
                                  <FileText size={10} /> {qCount} Qs
                                </span>
                                <span className="inline-flex items-center gap-0.5">
                                  <Clock size={10} /> {duration} min
                                </span>
                              </p>
                              {isAttempted && (
                                <span className="text-[9px] font-bold text-success flex items-center gap-1">
                                  Attempted
                                </span>
                              )}
                            </div>
                            {isAttempted && (
                              <p className="text-[9px] text-success font-medium mt-1 italic">
                                You have already attempted this test
                              </p>
                            )}
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

const SectionList = ({ type, items }: { type: string; items: BatchContent[] }) => {
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);

  const getYouTubeId = (url: string) => {
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0];
    }
    return videoId;
  };

  const handleItemClick = (item: BatchContent) => {
    if (type === "Video") {
      const videoId = getYouTubeId(item.url_or_note || "");
      if (videoId) {
        setSelectedVideo({ id: videoId, title: item.title });
      } else {
        alert("Invalid YouTube URL");
      }
    } else if (type === "PDF" || type === "Test" || type === "HW") {
      if (item.url_or_note) {
        navigate(`/notes?pdf=${encodeURIComponent(item.url_or_note)}&title=${encodeURIComponent(item.title)}`);
      }
    }
  };

  if (type === "Video") {
    return (
      <div className="pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground col-span-full">No videos yet.</p>
          ) : (
            items.map((item) => {
              const videoId = getYouTubeId(item.url_or_note || "");
              return (
                <div 
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="group cursor-pointer space-y-2"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted border border-border shadow-sm group-hover:shadow-md transition-all">
                    {videoId ? (
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="text-muted-foreground" size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <PlayCircle size={28} />
                      </div>
                    </div>
                  </div>
                  <div className="px-1">
                    <p className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Video Modal Player (Fix: Title above video, no blocking overlays, aggressive cropping) */}
        <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none sm:rounded-2xl">
            {/* Title ABOVE the video (Not absolute) */}
            <div className="p-4 bg-background border-b border-border">
              <h3 className="text-sm font-bold text-foreground truncate">
                {selectedVideo?.title}
              </h3>
            </div>
            
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {selectedVideo && (
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3`}
                  title={selectedVideo.title}
                  className="absolute left-0 w-full"
                  style={{ 
                    height: '125%', 
                    top: '-60px', // Aggressive crop
                    border: 0,
                    pointerEvents: 'auto' 
                  }}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <div className="space-y-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items yet.</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="w-full text-left py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors group flex items-center justify-between border border-transparent hover:border-border"
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-muted-foreground" />
                <p className="text-xs text-foreground font-medium group-hover:text-primary transition-colors">
                  {item.title}
                </p>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">
                {item.file_path ? "View File" : "Open Link"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default MyBatchPage;
