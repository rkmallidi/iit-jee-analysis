import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Star, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getExamResults } from "@/lib/api";
import type { ExamResultsDetail, StudentResult } from "@/types";
import { cn } from "@/lib/utils";

const SUBJ_COLOR: Record<string, string> = {
  Mathematics: "text-blue-600",
  Physics:     "text-purple-600",
  Chemistry:   "text-green-600",
};

const RANK_TIERS = ["Qualifier", "Top 10000", "Top 1000", "Top 100", "Top 10"];

function CellBg(r: { is_deleted: boolean; is_bonus: boolean; is_correct: boolean | null; student_answer: number | string }) {
  if (r.is_deleted) return "bg-slate-700 text-slate-400";
  if (r.is_bonus)   return "bg-sky-50 text-sky-600 font-semibold";
  if (r.student_answer === 0 || r.student_answer === -1000000) return "bg-slate-100 text-slate-400 italic";
  if (r.is_correct === true)  return "bg-emerald-50 text-emerald-700 font-semibold";
  if (r.is_correct === false) return "bg-red-50 text-red-600";
  return "";
}

function displayAnswer(r: { is_deleted: boolean; student_answer: number | string; correct_answer: string | null; question_type?: string | null }) {
  if (r.is_deleted) return "—";
  if (r.student_answer === -1000000 || r.student_answer === 0) return "·";
  return String(r.student_answer);
}

function fmt(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// Sticky column offsets
const OFF_RANK    = "left-0";
const OFF_STUDENT = "left-8";
const OFF_BRANCH  = "left-[148px]";
const OFF_TOTAL   = "left-[248px]";
const W_BRANCH    = "min-w-[96px]";
const W_TOTAL     = "min-w-[52px]";

function StudentRow({ student, questions, rank, maxScores }: {
  student: StudentResult;
  questions: ExamResultsDetail["questions"];
  rank: number;
  maxScores: { math: number; physics: number; chemistry: number };
}) {
  return (
    <tr className="border-b hover:bg-muted/30 group">
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground text-center border-r border-slate-100 w-8", OFF_RANK)}>
        {rank}
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-3 py-1.5 border-r border-slate-100 min-w-[140px]", OFF_STUDENT)}>
        <div className="font-mono text-[11px] font-semibold">{student.admission_no}</div>
        <div className="text-[10px] text-muted-foreground truncate max-w-[130px]">{student.name}</div>
        <div className="flex items-center gap-0.5 mt-0.5" title={student.target_rank ?? "No target rank"}>
          {RANK_TIERS.map((_, i) => {
            const filled = student.target_rank ? i < RANK_TIERS.indexOf(student.target_rank) + 1 : false;
            return <Star key={i} className={`w-2.5 h-2.5 ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />;
          })}
        </div>
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-2 py-1.5 border-r border-slate-100 text-[10px] text-muted-foreground truncate", OFF_BRANCH, W_BRANCH)}>
        {student.branch_name ?? "—"}
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-2 py-1.5 text-center border-r border-slate-200", OFF_TOTAL, W_TOTAL)}>
        <span className="text-sm font-bold text-foreground">{fmt(student.total_score)}</span>
      </td>
      <td className={cn("px-2 py-1.5 text-center border-r border-slate-100 text-[11px] font-semibold min-w-[44px]",
        student.math_score === maxScores.math && maxScores.math > 0
          ? "bg-blue-600 text-white rounded"
          : "text-blue-600"
      )}>
        {fmt(student.math_score)}
      </td>
      <td className={cn("px-2 py-1.5 text-center border-r border-slate-100 text-[11px] font-semibold min-w-[44px]",
        student.physics_score === maxScores.physics && maxScores.physics > 0
          ? "bg-purple-600 text-white rounded"
          : "text-purple-600"
      )}>
        {fmt(student.physics_score)}
      </td>
      <td className={cn("px-2 py-1.5 text-center border-r border-slate-200 text-[11px] font-semibold min-w-[44px]",
        student.chemistry_score === maxScores.chemistry && maxScores.chemistry > 0
          ? "bg-green-600 text-white rounded"
          : "text-green-600"
      )}>
        {fmt(student.chemistry_score)}
      </td>
      {student.responses.map((r, i) => (
        <td key={i} className={cn("px-1 py-1.5 text-center text-[10px] min-w-[28px] border-r border-slate-50", CellBg(r))}>
          {displayAnswer(r)}
        </td>
      ))}
    </tr>
  );
}

interface ResultsDrawerProps {
  examId: number | null;
  examCode: string;
  paper: string;
  mas: { math: number | null; physics: number | null; chemistry: number | null };
  open: boolean;
  onClose: () => void;
  initialBranchFilter?: string;
}

export default function ResultsDrawer({ examId, examCode, paper, mas, open, onClose, initialBranchFilter }: ResultsDrawerProps) {
  const [branchFilter, setBranchFilter] = useState<string>(initialBranchFilter ?? "all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["exam-results", examId],
    queryFn: () => getExamResults(examId!).then(r => r.data),
    enabled: open && !!examId,
    staleTime: 0,
  });

  const branches = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    data.students.forEach(s => {
      if (s.branch_id != null && s.branch_name) seen.set(String(s.branch_id), s.branch_name);
    });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (branchFilter === "all") return data.students;
    return data.students.filter(s => String(s.branch_id) === branchFilter);
  }, [data, branchFilter]);

  const maxScores = useMemo(() => {
    if (!filtered.length) return { math: 0, physics: 0, chemistry: 0 };
    return {
      math:      Math.max(...filtered.map(s => s.math_score)),
      physics:   Math.max(...filtered.map(s => s.physics_score)),
      chemistry: Math.max(...filtered.map(s => s.chemistry_score)),
    };
  }, [filtered]);

  const subjects = ["Mathematics", "Physics", "Chemistry"];

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
        <SheetHeader className="px-5 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <SheetTitle className="text-base shrink-0">
                Results — <span className="font-mono">{examCode}</span>
              </SheetTitle>
              <Badge variant="secondary">{paper}</Badge>
              {data && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {filtered.length}/{data.students.length} students · {data.questions.filter(q => !q.is_deleted).length} Qs
                </span>
              )}
              {/* MAS badges */}
              {[
                { label: "M", value: mas.math,     bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   star: "text-blue-400"   },
                { label: "P", value: mas.physics,  bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", star: "text-purple-400" },
                { label: "C", value: mas.chemistry,bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  star: "text-green-400"  },
              ].filter(m => m.value != null).map(m => (
                <span key={m.label} className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold shrink-0", m.bg, m.border, m.text)}>
                  <Star className={cn("w-2.5 h-2.5 fill-current", m.star)} />
                  {m.label} {m.value}
                </span>
              ))}
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Branch filter chips */}
          {branches.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[["all", "All"] as [string, string], ...branches].map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => setBranchFilter(id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                    branchFilter === id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Legend */}
          {data && (
            <div className="flex items-center gap-4 mt-1">
              {[
                { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "Correct" },
                { cls: "bg-red-50 text-red-600 border border-red-200", label: "Wrong" },
                { cls: "bg-slate-100 text-slate-400 border border-slate-200 italic", label: "Unattempted" },
                { cls: "bg-sky-50 text-sky-600 border border-sky-200", label: "Bonus" },
                { cls: "bg-slate-700 text-slate-300 border border-slate-600", label: "Deleted" },
              ].map(({ cls, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={cn("inline-block w-4 h-4 rounded text-center text-[9px] leading-4", cls)}>A</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-destructive text-sm">
              Failed to load results.
            </div>
          )}
          {data && filtered.length === 0 && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No results for the selected branch.
            </div>
          )}

          {data && filtered.length > 0 && (
            <table className="compact-table text-xs border-collapse w-max min-w-full">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b-2 border-slate-200">
                {/* Row 1 — column headers */}
                <tr className="border-b border-slate-200">
                  <th className={cn("sticky z-30 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-muted-foreground border-r border-slate-200 w-8", OFF_RANK)}>#</th>
                  <th className={cn("sticky z-30 bg-slate-50 px-3 py-1.5 text-left text-[10px] font-bold text-muted-foreground border-r border-slate-200 min-w-[140px]", OFF_STUDENT)}>Student</th>
                  <th className={cn("sticky z-30 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-muted-foreground border-r border-slate-200", OFF_BRANCH, W_BRANCH)}>Branch</th>
                  <th className={cn("sticky z-30 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-muted-foreground border-r border-slate-300", OFF_TOTAL, W_TOTAL)}>Total</th>
                  {subjects.map(s => (
                    <th key={s} className={cn("px-2 py-1.5 text-[10px] font-bold border-r border-slate-200 min-w-[44px]", SUBJ_COLOR[s])}>
                      {s.slice(0, 4)}
                    </th>
                  ))}
                  {data.questions.map(q => (
                    <th key={q.qno} className={cn(
                      "px-1 py-1.5 text-[10px] font-semibold border-r border-slate-100 min-w-[28px] text-center",
                      q.is_deleted ? "text-slate-400" : q.is_bonus ? "text-sky-500" : SUBJ_COLOR[q.subject] ?? "text-slate-500"
                    )}>
                      <div>{q.qno}</div>
                      {q.is_bonus   && <div className="text-[8px] text-sky-400">B</div>}
                      {q.is_deleted && <div className="text-[8px] text-slate-400">D</div>}
                    </th>
                  ))}
                </tr>
                {/* Row 2 — correct answer key */}
                <tr className="bg-emerald-600 border-b border-emerald-700">
                  <td className={cn("sticky z-30 bg-emerald-600 px-2 py-1.5 border-r border-emerald-500", OFF_RANK)} />
                  <td className={cn("sticky z-30 bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white border-r border-emerald-500", OFF_STUDENT)}>Answer Key</td>
                  <td className={cn("sticky z-30 bg-emerald-600 px-2 py-1.5 border-r border-emerald-500", OFF_BRANCH, W_BRANCH)} />
                  <td className={cn("sticky z-30 bg-emerald-600 px-2 py-1.5 border-r border-emerald-500", OFF_TOTAL, W_TOTAL)} />
                  {subjects.map(s => <td key={s} className="bg-emerald-600 px-2 py-1.5 border-r border-emerald-500" />)}
                  {data.questions.map(q => {
                    const key = q.akc || q.bkc;
                    return (
                      <td key={q.qno} className={cn(
                        "px-1 py-1.5 text-center text-[10px] font-bold border-r border-emerald-500 min-w-[28px]",
                        q.is_deleted ? "bg-slate-700 text-slate-400" :
                        q.is_bonus   ? "bg-sky-400 text-white" :
                        q.akc        ? "bg-amber-400 text-amber-900" :
                        key          ? "text-white" : "text-emerald-300"
                      )}>
                        {q.is_deleted ? "—" : q.is_bonus ? "★" : key ?? "?"}
                      </td>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student, i) => (
                  <StudentRow key={student.student_id} student={student} questions={data.questions} rank={i + 1} maxScores={maxScores} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
