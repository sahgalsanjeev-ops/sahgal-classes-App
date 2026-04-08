export type StudentProfile = {
  id: string;
  /** Unique within the batch; used to look up records */
  rollNo: string;
  name: string;
  mobile: string;
  email: string;
};

export type BatchResource = {
  id: string;
  title: string;
  link: string;
};

export type AttendanceRecord = {
  id: string;
  studentEmail: string;
  studentRollNo?: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  lateTime?: string;
};

export type HomeworkStatus = "Done" | "Not done" | "Incomplete";

export type HomeworkRecord = {
  id: string;
  studentEmail: string;
  studentRollNo?: string;
  homeworkTitle: string;
  status: HomeworkStatus;
};

export type TestMarkRecord = {
  id: string;
  studentEmail: string;
  studentRollNo?: string;
  testTitle: string;
  /** Marks obtained / scored */
  marksObtained: string;
  /** Maximum marks for this test */
  maxMarks: string;
  /** Cached display; can be recomputed from obtained ÷ max */
  percentage?: string;
};

/** Legacy field name from older saves */
export type LegacyTestMarkRecord = TestMarkRecord & { marks?: string };

export function computeTestPercentage(obtained: string, max: string): string {
  const o = parseFloat(String(obtained).replace(/,/g, "").trim());
  const m = parseFloat(String(max).replace(/,/g, "").trim());
  if (!Number.isFinite(o) || !Number.isFinite(m) || m <= 0) return "—";
  const pct = (o / m) * 100;
  return `${Math.round(pct * 10) / 10}%`;
}

export type Batch = {
  id: string;
  batchName: string;
  courseName: string;
  batchCode: string;
  timing: string;
  teacherName: string;
  videos: BatchResource[];
  homework: BatchResource[];
  studyMaterialPdfs: BatchResource[];
  testPapers: BatchResource[];
  students: StudentProfile[];
  attendanceRecords: AttendanceRecord[];
  homeworkRecords: HomeworkRecord[];
  testMarksRecords: TestMarkRecord[];
  createdAt: string;
};

const STORAGE_KEY = "sahgal-batches-v1";

/** Resolve email or roll number to a student in this batch */
export const findStudentByRef = (batch: Batch, ref: string): StudentProfile | null => {
  const t = ref.trim();
  if (!t) return null;
  if (t.includes("@")) {
    const email = t.toLowerCase();
    return batch.students.find((s) => s.email.toLowerCase() === email) ?? null;
  }
  const roll = t.toLowerCase();
  return batch.students.find((s) => s.rollNo.trim().toLowerCase() === roll) ?? null;
};

export const getBatches = (): Batch[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Batch[];
    return parsed.map((batch) => ({
      ...batch,
      students: batch.students.map((s) => ({
        ...s,
        rollNo: typeof (s as StudentProfile).rollNo === "string" ? (s as StudentProfile).rollNo : "",
      })),
      homeworkRecords: (batch.homeworkRecords ?? []).map((r) => {
        const raw = r as HomeworkRecord & { status?: string };
        let status: HomeworkStatus = raw.status === "Done" || raw.status === "Not done" || raw.status === "Incomplete" ? raw.status : "Not done";
        if (raw.status === "Pending") status = "Not done";
        return { ...raw, status };
      }),
      testMarksRecords: (batch.testMarksRecords ?? []).map((r) => {
        const raw = r as LegacyTestMarkRecord;
        const marksObtained = raw.marksObtained ?? raw.marks ?? "";
        const maxMarks = raw.maxMarks ?? "";
        const pct = computeTestPercentage(marksObtained, maxMarks);
        return {
          id: raw.id,
          studentEmail: raw.studentEmail,
          studentRollNo: raw.studentRollNo,
          testTitle: raw.testTitle,
          marksObtained,
          maxMarks,
          percentage: pct === "—" ? undefined : pct,
        };
      }),
    }));
  } catch {
    return [];
  }
};

export const saveBatches = (batches: Batch[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
};

export const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
