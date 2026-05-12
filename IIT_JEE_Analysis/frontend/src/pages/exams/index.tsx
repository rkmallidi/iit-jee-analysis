import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Plus, Pencil, Trash2, CalendarCheck, Loader2, FileText,
  Upload, ChevronRight, BookOpen, GraduationCap, CalendarDays,
  BarChart3, Building2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import {
  getAcademicYears, getPrograms, getClasses, getBranches,
  getStudents, getExams, createExam, updateExam, deleteExam, getExamQuestions,
} from "@/lib/api";
import type { Branch, Class, Exam, ExamType, Program, Student, ExamQuestion } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_META: Record<ExamType, { color: string; bg: string; headerGrad: string; dot: string }> = {
  Mains: {
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    headerGrad: "from-blue-600 to-blue-700",
    dot: "bg-blue-400",
  },
  Advanced: {
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    headerGrad: "from-violet-600 to-purple-700",
    dot: "bg-violet-400",
  },
};

interface LogicalExam {
  key: string;
  rep: Exam;
  papers: Exam[];
}

function groupExams(exams: Exam[]): LogicalExam[] {
  const map = new Map<string, Exam[]>();
  for (const e of exams) {
    const k = `${e.exam_code}|${e.program_id}|${e.class_id}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  return Array.from(map.entries()).map(([key, papers]) => ({
    key,
    rep: papers[0],
    papers,
  }));
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── Add / Edit dialog ─────────────────────────────────────────────────────────
interface ExamFormDialogProps {
  exam?: Exam;
  yearId: number;
  programs: Program[];
  classes: Class[];
  onClose: () => void;
}

function ExamFormDialog({ exam, yearId, programs, classes, onClose }: ExamFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!exam;

  const [code, setCode]           = useState(exam?.exam_code ?? "");
  const [programId, setProgramId] = useState(exam ? String(exam.program_id) : "");
  const [classId, setClassId]     = useState(exam ? String(exam.class_id) : "");
  const [examType, setExamType]   = useState<ExamType>(exam?.exam_type ?? "Mains");
  const [examDate, setExamDate]   = useState(exam?.exam_date?.slice(0, 10) ?? "");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        exam_code: code.trim(),
        program_id: +programId,
        class_id: +classId,
        exam_type: examType,
        exam_date: examDate,
        ...(isEdit ? {} : { academic_year_id: yearId }),
      };
      return isEdit ? updateExam(exam!.id, payload) : createExam(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", yearId] });
      toast({ title: isEdit ? "Exam updated" : "Exam created" });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Failed to save exam";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const valid = code.trim() && programId && classId && examDate;

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Exam" : "New Exam"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Exam Code</Label>
            <Input placeholder="e.g. JEE-MOCK-01" value={code} onChange={e => setCode(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Exam Type</Label>
            <Select value={examType} onValueChange={v => setExamType(v as ExamType)} disabled={isEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Mains">Mains — 1 paper (P1)</SelectItem>
                <SelectItem value="Advanced">Advanced — 2 papers (P1 + P2)</SelectItem>
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-[11px] text-muted-foreground">Exam type cannot be changed after creation.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Program</Label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
              <SelectContent>
                {programs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Exam Date</Label>
            <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!valid || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Exam"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Difficulty calculation ────────────────────────────────────────────────────
function calculateExamDifficulty(questions: ExamQuestion[]): { avg: number; counts: Record<string, number> } {
  const activeQuestions = questions.filter(q => !q.is_deleted && !q.is_bonus);
  const diffCounts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0, "Very Hard": 0 };
  const diffWeights: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3, "Very Hard": 4 };
  let weightedSum = 0, ratedCount = 0;

  activeQuestions.forEach(q => {
    const d = q.difficulty;
    if (d && d !== "None" && d in diffCounts) {
      diffCounts[d]++;
      weightedSum += diffWeights[d];
      ratedCount++;
    }
  });

  return {
    avg: ratedCount > 0 ? weightedSum / ratedCount : 0,
    counts: diffCounts,
  };
}

// ── Exam Card ─────────────────────────────────────────────────────────────────
interface ExamCardProps {
  le: LogicalExam;
  progMap: Record<number, Program>;
  classMap: Record<number, Class>;
  branches: Branch[];
  students: Student[];
  questions?: ExamQuestion[];
  onEdit: () => void;
  onDelete: () => void;
  onUpload: () => void;
}

function ExamCard({ le, progMap, classMap, branches, students, questions, onEdit, onDelete, onUpload }: ExamCardProps) {
  const navigate = useNavigate();
  const meta = TYPE_META[le.rep.exam_type];
  const program = progMap[le.rep.program_id];
  const cls = classMap[le.rep.class_id];
  const totalQs = le.papers.reduce((s, p) => s + (p.question_count ?? 0), 0);
  const activeBranches = branches.filter(b => b.is_active);

  return (
    <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-900">
      {/* Colored top bar */}
      <div className={cn("h-1.5 bg-gradient-to-r w-full", meta.headerGrad)} />

      <CardContent className="p-0">
        {/* Header section */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className={cn("font-mono text-base font-bold tracking-wide", meta.color)}>
                  {le.rep.exam_code}
                </code>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                  meta.bg, meta.color
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  {le.rep.exam_type}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {fmt(le.rep.exam_date)}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={onUpload}
                title="Upload OMR results"
                className="rounded-md p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onEdit}
                title="Edit exam"
                className="rounded-md p-1.5 text-muted-foreground hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                title="Delete exam"
                className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
          <div className="px-5 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              <BookOpen className="h-3 w-3" /> Program
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {program?.name ?? `#${le.rep.program_id}`}
            </div>
            {program?.code && (
              <div className="text-[10px] text-muted-foreground">{program.code}</div>
            )}
          </div>
          <div className="px-5 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              <GraduationCap className="h-3 w-3" /> Class
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {cls?.name ?? `#${le.rep.class_id}`}
            </div>
          </div>
        </div>

        {/* Papers section */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            <FileText className="h-3 w-3" /> Question Papers
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {le.rep.exam_type === "Mains" ? (
              <PaperChip
                paper={le.rep}
                label="P1"
                colorClass="bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-200"
                onClick={() => navigate(`/exams/${le.rep.id}/questions`)}
              />
            ) : (
              le.papers.map(p => (
                <PaperChip
                  key={p.paper}
                  paper={p}
                  label={p.paper}
                  colorClass={
                    p.paper === "P1"
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200"
                  }
                  onClick={() => navigate(`/exams/${p.id}/questions`)}
                />
              ))
            )}

            {totalQs > 0 && (
              <div className="ml-auto flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <BarChart3 className="h-3.5 w-3.5" />
                {totalQs} Q{totalQs !== 1 ? "s" : ""} total
              </div>
            )}
          </div>
        </div>

        {/* Overall Difficulty section */}
        {questions && questions.length > 0 && (() => {
          const { avg, counts } = calculateExamDifficulty(questions);
          const STAR_COLORS: Record<string, string> = {
            Easy: "text-emerald-500",
            Medium: "text-amber-500",
            Hard: "text-orange-600",
            "Very Hard": "text-red-700",
          };
          const SUBJECT_COLORS: Record<string, string> = {
            Mathematics: "text-blue-600",
            Physics: "text-purple-600",
            Chemistry: "text-green-600",
          };
          const ratedCount = Object.values(counts).reduce((s, c) => s + c, 0);
          const activeQuestions = questions.filter(q => !q.is_deleted && !q.is_bonus);

          // Calculate subject-wise difficulty
          const subjectDiff: Record<string, { sum: number; count: number; avg: number }> = {};
          activeQuestions.forEach(q => {
            const s = q.subject;
            if (!(s in subjectDiff)) subjectDiff[s] = { sum: 0, count: 0, avg: 0 };
            const d = q.difficulty;
            const diffWeights: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3, "Very Hard": 4 };
            if (d && d !== "None" && d in diffWeights) {
              subjectDiff[s].sum += diffWeights[d];
              subjectDiff[s].count++;
            }
          });
          Object.keys(subjectDiff).forEach(s => {
            if (subjectDiff[s].count > 0) {
              subjectDiff[s].avg = subjectDiff[s].sum / subjectDiff[s].count;
            }
          });

          return avg > 0 ? (
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overall Difficulty</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="cursor-help">
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="w-72 p-3">
                        <div className="space-y-2 text-xs">
                          <p className="font-semibold">Difficulty Breakdown</p>
                          <div className="space-y-1.5">
                            {Object.entries(counts).map(([d, c]) => (
                              <div key={d} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${STAR_COLORS[d]}`}>{d}</span>
                                  <span className="text-muted-foreground">({c})</span>
                                </div>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4].map((i, idx) => {
                                    const weights: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3, "Very Hard": 4 };
                                    return (
                                      <span key={idx} className={idx < weights[d] ? STAR_COLORS[d] : "text-muted-foreground/20"} style={{ fontSize: "10px" }}>
                                        ★
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-muted-foreground/20 pt-2 mt-2">
                            <p className="text-muted-foreground">
                              Weighted average: <strong>{avg.toFixed(2)}/4.0</strong>
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map(i => (
                      <span
                        key={i}
                        className={i <= avg ? (avg < 1.5 ? "text-emerald-500" : avg < 2.5 ? "text-amber-500" : avg < 3.5 ? "text-orange-600" : "text-red-700") : "text-muted-foreground/20"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">({ratedCount}/{activeQuestions.length} rated)</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  {Object.entries(counts).map(([d, c]) => c > 0 && (
                    <span key={d} className={`font-semibold ${STAR_COLORS[d]}`}>
                      {d[0]}{d === "Very Hard" ? "H" : ""}: {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subject-wise difficulty breakdown */}
              {Object.entries(subjectDiff).length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">By Subject:</span>
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(subjectDiff).map(([subject, data]) => (
                      <div key={subject} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className={`font-semibold ${SUBJECT_COLORS[subject] ?? "text-foreground"}`}>
                          {subject}
                        </span>
                        {data.count > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4].map(i => (
                                <span
                                  key={i}
                                  className={i <= data.avg ? (data.avg < 1.5 ? "text-emerald-500" : data.avg < 2.5 ? "text-amber-500" : data.avg < 3.5 ? "text-orange-600" : "text-red-700") : "text-muted-foreground/20"}
                                  style={{ fontSize: "9px" }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground ml-1">({data.count})</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 italic">— (0)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null;
        })()}

        {/* Branches popover footer */}
        <div className="px-5 py-2.5">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200 transition-colors group/branches w-full">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">{activeBranches.length} branch{activeBranches.length !== 1 ? "es" : ""}</span>
                <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover/branches:opacity-100 transition-opacity" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="start">
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">Branches & Student Count</div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {activeBranches.map(b => {
                  const count = students.filter(s =>
                    s.section_mapping?.branch_section?.branch_id === b.id &&
                    s.section_mapping?.branch_section?.program_id === le.rep.program_id
                  ).length;
                  return (
                    <div key={b.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/60 text-xs">
                      <div>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-[10px] text-muted-foreground">{b.code}</div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{count} stu</Badge>
                    </div>
                  );
                })}
                {activeBranches.length === 0 && (
                  <div className="text-xs text-muted-foreground italic px-2 py-1">No branches configured</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}

function PaperChip({ paper, label, colorClass, onClick }: {
  paper: Exam; label: string; colorClass: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex flex-col items-center rounded-lg border px-3 py-2 transition-colors min-w-[72px]",
        colorClass
      )}
      title="Configure questions"
    >
      <div className="flex items-center gap-1 text-xs font-bold">
        <FileText className="h-3 w-3" />
        {label}
      </div>
      {paper.question_count > 0 ? (
        <span className="text-[10px] font-medium mt-0.5">{paper.question_count} Qs</span>
      ) : (
        <span className="text-[10px] opacity-60 mt-0.5">Not set</span>
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExamsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

  const [formTarget, setFormTarget] = useState<LogicalExam | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<LogicalExam | null>(null);

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  useEffect(() => {
    if (!selectedYear && years.length > 0) {
      const current = years.find(y => y.is_current) ?? years[0];
      setSelectedYear(current);
    }
  }, [years, selectedYear, setSelectedYear]);

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => getPrograms().then(r => r.data),
  });

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["classes"],
    queryFn: () => getClasses().then(r => r.data),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => getBranches().then(r => r.data),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["students", yearId],
    queryFn: () => getStudents({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  const { data: rawExams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["exams", yearId],
    queryFn: () => getExams({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  // Fetch questions for all exams (papers)
  const examIds = rawExams.map(e => e.id);
  const { data: allQuestionsData = {} } = useQuery<Record<number, ExamQuestion[]>>({
    queryKey: ["exam-questions-all", examIds],
    queryFn: async () => {
      const result: Record<number, ExamQuestion[]> = {};
      const results = await Promise.all(
        examIds.map(id => getExamQuestions(id).catch(() => []))
      );
      examIds.forEach((id, i) => {
        result[id] = results[i] || [];
      });
      return result;
    },
    enabled: !!yearId && examIds.length > 0,
  });

  const exams = groupExams(rawExams).sort((a, b) =>
    new Date(b.rep.exam_date).getTime() - new Date(a.rep.exam_date).getTime()
  );

  const remove = useMutation({
    mutationFn: (repId: number) => deleteExam(repId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", yearId] });
      toast({ title: "Exam deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const progMap  = Object.fromEntries(programs.map(p => [p.id, p]));
  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));

  // Summary stats
  const mainsCount    = exams.filter(e => e.rep.exam_type === "Mains").length;
  const advancedCount = exams.filter(e => e.rep.exam_type === "Advanced").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Exams</h2>
          <p className="text-sm text-muted-foreground">Manage exam schedule for the selected academic year.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear ? String(selectedYear.id) : ""}
            onValueChange={v => {
              const yr = years.find(y => y.id === +v);
              if (yr) setSelectedYear(yr);
            }}
          >
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y.id} value={String(y.id)}>
                  {y.name}{y.is_current ? " ★" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setFormTarget("new")} disabled={!yearId}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Exam
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      {yearId && !isLoading && exams.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <CalendarCheck className="h-3.5 w-3.5" />
            {exams.length} exam{exams.length !== 1 ? "s" : ""}
          </div>
          {mainsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              {mainsCount} Mains
            </div>
          )}
          {advancedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {advancedCount} Advanced
            </div>
          )}
        </div>
      )}

      {/* No year selected */}
      {!yearId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="font-medium text-muted-foreground">Select an academic year to view exams</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {yearId && isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Empty */}
      {yearId && !isLoading && exams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <CalendarCheck className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-semibold text-muted-foreground">No exams scheduled yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Click "Add Exam" to schedule the first exam.</p>
            <Button size="sm" className="mt-5" onClick={() => setFormTarget("new")}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Exam
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Exam cards grid */}
      {yearId && !isLoading && exams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {exams.map(le => (
            <ExamCard
              key={le.key}
              le={le}
              progMap={progMap}
              classMap={classMap}
              branches={branches}
              students={students}
              questions={allQuestionsData[le.rep.id]}
              onEdit={() => setFormTarget(le)}
              onDelete={() => setDeleteTarget(le)}
              onUpload={() => navigate(`/results?exam=${le.rep.id}`)}
            />
          ))}
        </div>
      )}

      {formTarget !== null && yearId && (
        <ExamFormDialog
          exam={formTarget === "new" ? undefined : formTarget.rep}
          yearId={yearId}
          programs={programs}
          classes={classes}
          onClose={() => setFormTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Exam"
        description={`Delete "${deleteTarget?.rep.exam_code}" (${deleteTarget?.rep.exam_type}${deleteTarget?.rep.exam_type === "Advanced" ? " — P1 + P2" : ""})?`}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.rep.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
