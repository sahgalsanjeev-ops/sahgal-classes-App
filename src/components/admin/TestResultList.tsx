import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, User, Clock, Award, Eye } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface TestAttempt {
  id: string;
  student_email: string;
  score: number;
  total_questions: number;
  time_taken: number;
  created_at: string;
  answers: Record<string, number>;
  profiles?: {
    full_name: string;
  };
}

interface TestInfo {
  test_title: string;
  questions: any[];
}

interface TestResultListProps {
  testId: string;
}

const TestResultList: React.FC<TestResultListProps> = ({ testId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<TestAttempt[]>([]);
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        // Fetch test info (title and questions)
        const { data: testData, error: testError } = await supabase
          .from("online_tests")
          .select("test_title, questions")
          .eq("id", testId)
          .single();

        if (testError) throw testError;
        setTestInfo(testData);

        // Fetch attempts
        const { data: attemptsData, error: attemptsError } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("test_id", testId)
          .order("score", { ascending: false });

        if (attemptsError) throw attemptsError;

        if (attemptsData && attemptsData.length > 0) {
          const emails = attemptsData.map(a => a.student_email);
          
          // Fetch profiles for these emails
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("email, full_name")
            .in("email", emails);

          if (profilesError) {
            console.error("Error fetching profiles:", profilesError);
          }

          const profilesMap = new Map(profilesData?.map(p => [p.email?.toLowerCase(), p.full_name]) || []);
          
          const combined = attemptsData.map(a => ({
            ...a,
            profiles: {
              full_name: profilesMap.get(a.student_email?.toLowerCase()) || "Unknown Student"
            }
          }));

          setResults(combined);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Error fetching test results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [testId]);

  const handleReview = (res: TestAttempt) => {
    if (!testInfo) return;
    navigate(`/test-result/${testId}`, {
      state: {
        testTitle: testInfo.test_title,
        answers: res.answers,
        questions: testInfo.questions,
        score: res.score,
        total: res.total_questions,
        timeTaken: res.time_taken,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Loader2 className="animate-spin text-primary" size={24} />
        <p className="text-sm text-muted-foreground">Loading results...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-xl">
        <p className="text-sm text-muted-foreground">No students have taken this test yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] uppercase font-bold">Student</TableHead>
            <TableHead className="text-[11px] uppercase font-bold text-center">Score</TableHead>
            <TableHead className="text-[11px] uppercase font-bold text-center">Time</TableHead>
            <TableHead className="text-[11px] uppercase font-bold text-center">Date</TableHead>
            <TableHead className="text-[11px] uppercase font-bold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((res) => {
            const mins = Math.floor(res.time_taken / 60);
            const secs = res.time_taken % 60;
            return (
              <TableRow key={res.id}>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{res.profiles?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{res.student_email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-bold">
                    <Award size={12} />
                    {res.score}/{res.total_questions}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                    <Clock size={12} />
                    {mins}m {secs}s
                  </div>
                </TableCell>
                <TableCell className="text-center text-[10px] text-muted-foreground">
                  {new Date(res.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px] font-bold uppercase tracking-tight gap-1 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => handleReview(res)}
                  >
                    <Eye size={12} />
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TestResultList;
