import React, { useEffect, useState, useMemo } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { supabase } from "@/lib/supabase";
import { Batch, fetchBatchesSupabase, AttendanceRecord, HomeworkRecord, TestMarkRecord } from "@/lib/batches";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    attendance: AttendanceRecord[];
    homework: HomeworkRecord[];
    tests: TestMarkRecord[];
  }>({ attendance: [], homework: [], tests: [] });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const email = user.email?.toLowerCase();
        const batches = await fetchBatchesSupabase();
        
        let allAttendance: AttendanceRecord[] = [];
        let allHomework: HomeworkRecord[] = [];
        let allTests: TestMarkRecord[] = [];

        batches.forEach(batch => {
          const studentAttendance = batch.attendanceRecords.filter(r => r.studentEmail.toLowerCase() === email);
          const studentHomework = batch.homeworkRecords.filter(r => r.studentEmail.toLowerCase() === email);
          const studentTests = batch.testMarksRecords.filter(r => r.studentEmail.toLowerCase() === email);

          allAttendance = [...allAttendance, ...studentAttendance];
          allHomework = [...allHomework, ...studentHomework];
          allTests = [...allTests, ...studentTests];
        });

        setData({
          attendance: allAttendance,
          homework: allHomework,
          tests: allTests
        });
      } catch (error) {
        console.error("Dashboard data load error:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  // 1. Attendance Logic (Horizontal Bar)
  const attendancePercentage = useMemo(() => {
    if (data.attendance.length === 0) return 0;
    const present = data.attendance.filter(r => r.status === "Present" || r.status === "Late").length;
    return Math.round((present / data.attendance.length) * 100);
  }, [data.attendance]);

  // 2. Test Trends Logic (Mini Area Chart)
  const testTrends = useMemo(() => {
    return data.tests
      .slice(-5)
      .map(t => {
        const obtained = parseFloat(t.marksObtained);
        const max = parseFloat(t.maxMarks);
        const percentage = isNaN(obtained) || isNaN(max) ? 0 : Math.round((obtained / max) * 100);
        return { score: percentage };
      });
  }, [data.tests]);

  // 3. Homework Logic (Mini Pie Chart)
  const homeworkStats = useMemo(() => {
    const done = data.homework.filter(r => r.status === "Done").length;
    const notDone = data.homework.filter(r => r.status === "Not done" || r.status === "Incomplete").length;
    if (done === 0 && notDone === 0) return [{ value: 0 }, { value: 1 }];
    return [
      { name: "Done", value: done },
      { name: "Pending", value: notDone }
    ];
  }, [data.homework]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-2">
        <Loader2 className="animate-spin text-primary" size={24} />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Loading Progress...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {/* Attendance Horizontal Progress Bar - Very Compact */}
      <Card className="border border-border shadow-sm bg-card overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-primary" />
              <span className="text-[11px] font-black text-primary uppercase tracking-tight">Attendance</span>
            </div>
            <span className="text-sm font-black text-primary">{attendancePercentage}%</span>
          </div>
          <Progress value={attendancePercentage} className="h-2 bg-primary/10" />
          <p className="text-[9px] text-primary/60 font-bold mt-1 text-right uppercase">
            {data.attendance.length} Sessions Total
          </p>
        </CardContent>
      </Card>

      {/* Side-by-Side Mini Charts */}
      <div className="grid grid-cols-2 gap-3">
        {/* Homework Mini Card */}
        <Card className="border border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 size={13} className="text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-tight">Homework</span>
            </div>
            <div className="h-[60px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={homeworkStats}
                    innerRadius={18}
                    outerRadius={28}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="hsl(var(--primary))" />
                    <Cell fill="hsl(var(--primary) / 0.1)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-primary">
                  {data.homework.filter(r => r.status === "Done").length}
                </span>
              </div>
            </div>
            <p className="text-[9px] text-center text-primary/60 font-bold mt-1 uppercase">Completed</p>
          </CardContent>
        </Card>

        {/* Performance Mini Card */}
        <Card className="border border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp size={13} className="text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-tight">Tests</span>
            </div>
            <div className="h-[60px] w-full">
              {testTrends.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={testTrends} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="miniColorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#miniColorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[9px] text-primary/50 font-bold uppercase text-center leading-tight">No Test<br/>History</p>
                </div>
              )}
            </div>
            <p className="text-[9px] text-center text-primary/60 font-bold mt-1 uppercase">Trend</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
