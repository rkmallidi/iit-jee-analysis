import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Building2, Users, FileText, BarChart2,
  TrendingUp, Award, CalendarDays, BookOpen, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAcademicYears, getExams, getExamDetail, getExamResults, getPrograms, getClasses } from "@/lib/api";
import ResultsDrawer from "@/components/exams/ResultsDrawer";
import type { Exam, ExamDetail, ExamResultsDetail, StudentResult } from "@/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmtScore(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ── Branch summary card ────────────────────────────────────────────────────────
interface BranchCardProps {
  branchId: number;
  branchName: string;
  students: StudentResult[];
  mas: { math: number | null; physics: number | null; chemistry: number | null };
  onClick: () => void;
}

function BranchCard({ branchName, students, mas, onClick }: BranchCardProps) {
  const totalScores = students.map(s => s.total_score);
  const topScore = totalScores.length ? Math.max(...totalScores) : 0;
  const avgScore = avg(totalScores);
  const top5 = [...students].sort((a, b) => b.total_score - a.total_score).slice(0, 5);

  const mathTop = students.length ? Math.max(...students.map(s => s.math_score)) : 0;
  const physTop = students.length ? Math.max(...students.map(s => s.physics_score)) : 0;
  const chemTop = students.length ? Math.max(...students.map(s => s.chemistry_score)) : 0;

  const mathAvg   = avg(students.map(s => s.math_score));
  const physAvg   = avg(students.map(s => s.physics_score));
  const chemAvg   = avg(students.map(s => s.chemistry_score));

  const attempted = students.filter(s => s.attempted > 0).length;

  const aboveMas = {
    math:  mas.math    != null ? students.filter(s => s.math_score    >= mas.math!).length    : null,
    phys:  mas.physics != null ? students.filter(s => s.physics_score >= mas.physics!).length : null,
    chem:  mas.chemistry != null ? students.filter(s => s.chemistry_score >= mas.chemistry!).length : null,
  };
  const hasMas = mas.math != null || mas.physics != null || mas.chemistry != null;

  return (
    <Card
      onClick={onClick}
      className="border hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-white/70 shrink-0" />
          <span className="font-bold text-white text-sm">{branchName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/80">
          <Users className="h-3.5 w-3.5" />
          <span>{students.length} students</span>
          <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      <CardContent className="px-5 py-4 space-y-4">
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No results uploaded yet.</p>
        ) : (
          <>
            {/* Top-level stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-50 border px-3 py-2 text-center">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3" /> Avg Score
                </div>
                <div className="text-xl font-bold text-foreground">{fmtScore(avgScore)}</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide flex items-center justify-center gap-1 mb-1">
                  <Award className="h-3 w-3" /> Top Score
                </div>
                <div className="text-xl font-bold text-amber-700">{fmtScore(topScore)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border px-3 py-2 text-center">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Appeared</div>
                <div className="text-xl font-bold text-foreground">{attempted}</div>
              </div>
            </div>

            {/* Subject breakdown: Avg / Top / MAS / Above MAS */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Subject Breakdown</p>
              <table className="compact-table w-full text-[11px] border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-muted-foreground">
                    <th className="text-left px-2 py-1.5 font-semibold w-12"></th>
                    <th className="text-center px-2 py-1.5 font-semibold">Avg</th>
                    <th className="text-center px-2 py-1.5 font-semibold">Top</th>
                    {hasMas && <th className="text-center px-2 py-1.5 font-semibold">MAS</th>}
                    {hasMas && <th className="text-center px-2 py-1.5 font-semibold">≥ MAS</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: "Math", color: "text-blue-600",   avgVal: mathAvg, topVal: mathTop, masVal: mas.math,      aboveVal: aboveMas.math  },
                    { label: "Phys", color: "text-purple-600", avgVal: physAvg, topVal: physTop, masVal: mas.physics,   aboveVal: aboveMas.phys  },
                    { label: "Chem", color: "text-green-600",  avgVal: chemAvg, topVal: chemTop, masVal: mas.chemistry, aboveVal: aboveMas.chem  },
                  ].map(({ label, color, avgVal, topVal, masVal, aboveVal }) => (
                    <tr key={label} className="bg-white hover:bg-slate-50">
                      <td className={cn("px-2 py-1.5 font-bold", color)}>{label}</td>
                      <td className="px-2 py-1.5 text-center font-medium">{fmtScore(avgVal)}</td>
                      <td className={cn("px-2 py-1.5 text-center font-bold", color)}>{fmtScore(topVal)}</td>
                      {hasMas && (
                        <td className="px-2 py-1.5 text-center text-muted-foreground">
                          {masVal != null ? masVal : <span className="italic text-muted-foreground/40">—</span>}
                        </td>
                      )}
                      {hasMas && (
                        <td className="px-2 py-1.5 text-center">
                          {aboveVal != null ? (
                            <span className={cn(
                              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                              aboveVal === 0
                                ? "bg-red-50 text-red-600 border border-red-200"
                                : aboveVal === students.length
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                            )}>
                              {aboveVal}/{students.length}
                            </span>
                          ) : <span className="italic text-muted-foreground/40">—</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top 5 */}
            {top5.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Award className="h-3 w-3" /> Top {top5.length}
                </p>
                <div className="space-y-1">
                  {top5.map((s, i) => (
                    <div key={s.student_id} className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md text-xs",
                      i === 0 ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-100"
                    )}>
                      <span className={cn(
                        "w-4 text-center font-bold shrink-0",
                        i === 0 ? "text-amber-500" : "text-muted-foreground/50"
                      )}>
                        {i + 1}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{s.admission_no}</span>
                      <span className="font-medium truncate flex-1">{s.name}</span>
                      <span className={cn("font-bold shrink-0", i === 0 ? "text-amber-700" : "text-foreground")}>
                        {fmtScore(s.total_score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View results CTA */}
            <button
              onClick={onClick}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 text-blue-700 text-xs font-semibold py-2 transition-colors"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              View Detailed Results
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
function BranchCardSkeleton() {
  const shimmer = "relative overflow-hidden bg-slate-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent";

  return (
    <Card className="border overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-slate-200 to-slate-100">
        <div className="flex items-center gap-2 flex-1">
          <div className={cn("h-4 w-4 rounded", shimmer)} />
          <div className={cn("h-4 w-44 max-w-[70%] rounded", shimmer)} />
        </div>
        <div className={cn("h-4 w-20 rounded", shimmer)} />
      </div>
      <CardContent className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-lg border px-3 py-2 space-y-2">
              <div className={cn("h-3 w-16 mx-auto rounded", shimmer)} />
              <div className={cn("h-6 w-12 mx-auto rounded", shimmer)} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className={cn("h-3 w-28 rounded", shimmer)} />
          {[0, 1, 2].map(i => (
            <div key={i} className="grid grid-cols-5 gap-2 rounded-md border px-2 py-2">
              <div className={cn("h-3 w-10 rounded", shimmer)} />
              <div className={cn("h-3 rounded", shimmer)} />
              <div className={cn("h-3 rounded", shimmer)} />
              <div className={cn("h-3 rounded", shimmer)} />
              <div className={cn("h-3 rounded", shimmer)} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className={cn("h-3 w-16 rounded", shimmer)} />
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-2 rounded-md border px-2 py-2">
              <div className={cn("h-4 w-4 rounded", shimmer)} />
              <div className={cn("h-3 w-16 rounded", shimmer)} />
              <div className={cn("h-3 flex-1 rounded", shimmer)} />
              <div className={cn("h-3 w-10 rounded", shimmer)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BranchResultCard({
  paper,
  branchId,
  branchName,
  examCode,
  onOpen,
}: {
  paper: Exam;
  branchId: number;
  branchName: string;
  examCode: string;
  onOpen: (drawer: {
    paperId: number;
    examCode: string;
    paper: string;
    mas: { math: number | null; physics: number | null; chemistry: number | null };
    branchId: number;
    branchName: string;
  }) => void;
}) {
  const { data, isLoading } = useQuery<ExamResultsDetail>({
    queryKey: ["exam-results", paper.id, "branch-summary", branchId],
    queryFn: () => getExamResults(paper.id, { branch_id: branchId, include_responses: false }).then(r => r.data),
    enabled: !!paper.id && !!branchId,
    staleTime: 60_000,
  });

  if (isLoading || !data) return <BranchCardSkeleton />;

  const paperMas = {
    math: paper.mas_mathematics ?? null,
    physics: paper.mas_physics ?? null,
    chemistry: paper.mas_chemistry ?? null,
  };

  return (
    <BranchCard
      branchId={branchId}
      branchName={branchName}
      students={data.students}
      mas={paperMas}
      onClick={() => onOpen({
        paperId: paper.id,
        examCode,
        paper: paper.paper,
        mas: paperMas,
        branchId,
        branchName,
      })}
    />
  );
}

export default function BranchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const { isAdmin, branchIds } = useAuthStore();

  const examIdParam = searchParams.get("exam");
  const examId = examIdParam ? parseInt(examIdParam) : null;
  const yearId = selectedYear?.id;

  // drawer state: which branch + which paper to show
  const [drawer, setDrawer] = useState<{
    paperId: number;
    examCode: string;
    paper: string;
    mas: { math: number | null; physics: number | null; chemistry: number | null };
    branchId: number;
    branchName: string;
  } | null>(null);

  // ── queries ──────────────────────────────────────────────────────────────────
  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getPrograms().then(r => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => getClasses().then(r => r.data),
  });

  const { data: allExams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["exams", yearId],
    queryFn: () => getExams({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  // Only completed/published exams that have at least one result uploaded
  const eligibleExams = allExams
    .filter(e => e.status === "published" || e.status === "completed")
    .filter(e => e.result_count > 0)
    .filter((e, idx, arr) =>
      arr.findIndex(x => x.exam_code === e.exam_code && x.program_id === e.program_id && x.class_id === e.class_id) === idx
    )
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  useEffect(() => {
    if (!examId && eligibleExams.length > 0) {
      navigate(`/branch-results?exam=${eligibleExams[0].id}`, { replace: true });
    }
  }, [examId, eligibleExams, navigate]);

  const { data: examDetail, isLoading: detailLoading } = useQuery<ExamDetail>({
    queryKey: ["exam-detail", examId],
    queryFn: () => getExamDetail(examId!).then(r => r.data),
    enabled: !!examId,
  });

  // All papers for selected exam
  const examPapers = examDetail
    ? allExams.filter(e => e.exam_code === examDetail.exam_code && (e.status === "published" || e.status === "completed"))
    : [];

  // All unique branches across papers — only those with students configured, filtered by role
  const branchSummaries = useMemo(() => {
    return (examDetail?.branches ?? [])
      .filter(branch => branch.sections.some(sec => sec.student_count > 0))
      .filter(branch => isAdmin() || branchIds.includes(branch.id))
      .map(branch => ({
        id: branch.id,
        name: branch.name,
        studentCount: branch.sections.reduce((sum, sec) => sum + sec.student_count, 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [examDetail, isAdmin, branchIds]);

  const totalConfiguredStudents = branchSummaries.reduce((sum, branch) => sum + branch.studentCount, 0);

  const selectExam = (id: string) => navigate(`/branch-results?exam=${id}`);

  // ── Top bar ──────────────────────────────────────────────────────────────────
  const TopBar = () => (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 className="text-xl font-bold">Branch-wise Results</h2>
        <p className="text-sm text-muted-foreground">View student performance split by branch for any exam.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={selectedYear ? String(selectedYear.id) : ""}
          onValueChange={v => { const yr = years.find(y => y.id === +v); if (yr) setSelectedYear(yr); }}
        >
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y.id} value={String(y.id)}>{y.name}{y.is_current ? " ★" : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={examId ? String(examId) : ""} onValueChange={selectExam} disabled={!yearId || examsLoading}>
          <SelectTrigger className="min-w-max h-9">
            {examDetail ? (
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm">{examDetail.exam_code}</span>
                <Badge variant="secondary" className="text-[10px] py-0 h-5">{examDetail.program_name}</Badge>
                <Badge variant="secondary" className="text-[10px] py-0 h-5">{examDetail.class_name}</Badge>
              </div>
            ) : (
              <SelectValue placeholder={examsLoading ? "Loading…" : "Select exam"} />
            )}
          </SelectTrigger>
          <SelectContent>
            {eligibleExams.map(e => {
              const prog = programs.find(p => p.id === e.program_id);
              const cls  = classes.find(c => c.id === e.class_id);
              return (
                <SelectItem key={e.id} value={String(e.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold">{e.exam_code}</span>
                    <span className="text-muted-foreground text-xs">
                      {e.exam_type} · {new Date(e.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                    {prog && cls && (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] py-0 h-4">{prog.name}</Badge>
                        <Badge variant="outline" className="text-[9px] py-0 h-4">{cls.name}</Badge>
                      </div>
                    )}
                  </div>
                </SelectItem>
              );
            })}
            {eligibleExams.length === 0 && !examsLoading && (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">No exams with results for this year</div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (!yearId) return (
    <div className="space-y-4">
      <TopBar />
      <Alert><AlertDescription>Select an academic year to continue.</AlertDescription></Alert>
    </div>
  );

  if (!examId) return (
    <div className="space-y-5">
      <TopBar />
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <BarChart2 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">No exam selected</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Choose an exam with uploaded results from the dropdown above.
          </p>
        </div>
      </div>
    </div>
  );

  const skeletonCardCount = Math.max(3, Math.min(9, examDetail?.branches.length || 6));

  if (detailLoading) return (
    <div className="space-y-5">
      <TopBar />
      <div className="rounded-xl border bg-gradient-to-r from-blue-50 to-slate-50 border-blue-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
          </div>
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: skeletonCardCount }).map((_, i) => (
          <BranchCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  if (!examDetail) return (
    <div className="space-y-4">
      <TopBar />
      <Alert variant="destructive"><AlertDescription>Failed to load exam details.</AlertDescription></Alert>
    </div>
  );

  const isAdvanced = examDetail.exam_type === "Advanced";

  return (
    <div className="space-y-5">
      <TopBar />

      {/* Exam summary bar */}
      <div className={cn(
        "rounded-xl border px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3",
        isAdvanced
          ? "bg-gradient-to-r from-violet-50 to-slate-50 border-violet-200"
          : "bg-gradient-to-r from-blue-50 to-slate-50 border-blue-200"
      )}>
        <div>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider",
            isAdvanced ? "text-violet-500" : "text-blue-500")}>Exam Code</div>
          <div className={cn("font-mono text-xl font-bold mt-0.5",
            isAdvanced ? "text-violet-800" : "text-blue-800")}>{examDetail.exam_code}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> Date
          </div>
          <div className="text-sm font-semibold mt-0.5">{fmt(examDetail.exam_date)}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Program
          </div>
          <div className="text-sm font-semibold mt-0.5">{examDetail.program_name}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class</div>
          <div className="text-sm font-semibold mt-0.5">{examDetail.class_name}</div>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Branches
            </div>
            <div className="text-sm font-semibold mt-0.5">{branchSummaries.length}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Total Students
            </div>
            <div className="text-sm font-semibold mt-0.5">{totalConfiguredStudents}</div>
          </div>
          <Badge variant="outline" className={cn("text-sm px-3 py-1 h-fit",
            isAdvanced ? "bg-violet-100 text-violet-800 border-violet-300" : "bg-blue-100 text-blue-800 border-blue-300"
          )}>
            {examDetail.exam_type} · {isAdvanced ? "P1 + P2" : "P1"}
          </Badge>
        </div>
      </div>

      {/* Per-paper branch cards */}
      {examPapers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <FileText className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="font-medium">No results available</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Upload OMR files on the OMR Results page first.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {examPapers.map(paper => {
            return (
              <div key={paper.id}>
                {/* Paper label (only for Advanced) */}
                {isAdvanced && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("px-2.5 py-1 rounded-md text-white text-xs font-bold",
                      paper.paper === "P1" ? "bg-emerald-600" : "bg-amber-500"
                    )}>
                      {paper.paper}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Paper {paper.paper === "P1" ? "1" : "2"}
                    </span>
                  </div>
                )}

                {branchSummaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No branch data found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchSummaries.map(branch => (
                      <BranchResultCard
                        key={`${paper.id}-${branch.id}`}
                        paper={paper}
                        branchId={branch.id}
                        branchName={branch.name}
                        examCode={examDetail.exam_code}
                        onOpen={setDrawer}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Results drawer — pre-filtered to selected branch */}
      {drawer && (
        <ResultsDrawer
          examId={drawer.paperId}
          examCode={drawer.examCode}
          paper={drawer.paper}
          mas={drawer.mas}
          open={!!drawer}
          onClose={() => setDrawer(null)}
          initialBranchFilter={String(drawer.branchId)}
        />
      )}
    </div>
  );
}
