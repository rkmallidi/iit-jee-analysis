import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Building2, Download, Star, X } from "lucide-react";
import * as XLSX from "xlsx";
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
const BLANK_ANSWER_SENTINELS = new Set(["-1000000", "-20000", "-2000000"]);

function isUnattemptedAnswer(ans: number | string, questionType?: string | null) {
  const value = String(ans).trim();
  if (BLANK_ANSWER_SENTINELS.has(value)) return true;
  if (["INT", "DECIMAL"].includes((questionType || "").toUpperCase())) return false;
  return value === "0";
}

function CellBg(r: { is_deleted: boolean; is_bonus: boolean; is_correct: boolean | null; student_answer: number | string; question_type?: string | null }) {
  if (r.is_deleted) return "bg-slate-700 text-slate-400";
  if (r.is_bonus)   return "bg-sky-50 text-sky-600 font-semibold";
  if (isUnattemptedAnswer(r.student_answer, r.question_type)) return "bg-slate-100 text-slate-400 italic";
  if (r.is_correct === true)  return "bg-emerald-50 text-emerald-700 font-semibold";
  if (r.is_correct === false) return "bg-red-50 text-red-600";
  return "";
}

function displayAnswer(r: { is_deleted: boolean; student_answer: number | string; correct_answer: string | null; question_type?: string | null }) {
  if (r.is_deleted) return "-";
  if (isUnattemptedAnswer(r.student_answer, r.question_type)) return "Blank";
  if (r.is_deleted) return "—";
  if (BLANK_ANSWER_SENTINELS.has(String(r.student_answer).trim()) || r.student_answer === 0) return "·";
  return String(r.student_answer);
}

function fmt(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function displayTotal(student: StudentResult) {
  return student.math_score + student.physics_score + student.chemistry_score;
}

// Sticky column offsets
const OFF_RANK    = "left-0";
const OFF_STUDENT = "left-8";
const OFF_SECTION = "left-[148px]";
const OFF_TOTAL   = "left-[248px]";
const OFF_MATH    = "left-[300px]";
const OFF_PHYSICS = "left-[344px]";
const OFF_CHEM    = "left-[388px]";
const W_SECTION   = "min-w-[96px]";
const W_TOTAL     = "min-w-[52px]";
const W_SUBJECT   = "min-w-[44px]";
const SHIMMER = "relative overflow-hidden bg-slate-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent";

function ResultsTableSkeleton() {
  return (
    <div className="min-w-full w-max">
      <div className="sticky top-0 z-20 border-b-2 border-slate-200 bg-slate-50">
        <div className="flex border-b border-slate-200">
          {[36, 140, 96, 52, 44, 44, 44, ...Array(24).fill(28)].map((width, i) => (
            <div key={i} className="border-r border-slate-100 px-1 py-1.5" style={{ width }}>
              <div className={cn("h-3 rounded", SHIMMER)} />
            </div>
          ))}
        </div>
        <div className="flex bg-emerald-600">
          {[36, 140, 96, 52, 44, 44, 44, ...Array(24).fill(28)].map((width, i) => (
            <div key={i} className="border-r border-emerald-500 px-1 py-1.5" style={{ width }}>
              <div className="h-3 rounded bg-emerald-400/70" />
            </div>
          ))}
        </div>
      </div>

      <div>
        {Array.from({ length: 12 }).map((_, row) => (
          <div key={row} className="flex border-b border-slate-100 bg-white">
            {[36, 140, 96, 52, 44, 44, 44, ...Array(24).fill(28)].map((width, col) => (
              <div key={col} className="border-r border-slate-50 px-1 py-2" style={{ width }}>
                <div className={cn("h-3 rounded", SHIMMER, col === 1 ? "w-24" : "w-full")} />
                {col === 1 && <div className={cn("h-2 w-16 rounded mt-1", SHIMMER)} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentRow({ student, questions, rank, maxScores }: {
  student: StudentResult;
  questions: ExamResultsDetail["questions"];
  rank: number;
  maxScores: { math: number; physics: number; chemistry: number };
}) {
  const totalScore = displayTotal(student);
  const scoreBadge = (
    score: number,
    maxScore: number,
    topClass: string,
    textClass: string,
  ) => (
    <span className={cn(
      "inline-flex min-w-8 items-center justify-center rounded px-1.5 py-0.5",
      score === maxScore && maxScore > 0 ? `${topClass} text-white` : textClass
    )}>
      {fmt(score)}
    </span>
  );

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
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-2 py-1.5 border-r border-slate-100 text-[10px] text-muted-foreground truncate", OFF_SECTION, W_SECTION)}>
        {student.section_name ?? "—"}
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-2 py-1.5 text-center border-r border-slate-200", OFF_TOTAL, W_TOTAL)}>
        <span className="text-sm font-bold text-foreground">{fmt(totalScore)}</span>
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-1.5 py-1.5 text-center border-r border-slate-100 text-[11px] font-semibold", OFF_MATH, W_SUBJECT)}>
        {scoreBadge(student.math_score, maxScores.math, "bg-blue-600", "text-blue-600")}
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-1.5 py-1.5 text-center border-r border-slate-100 text-[11px] font-semibold", OFF_PHYSICS, W_SUBJECT)}>
        {scoreBadge(student.physics_score, maxScores.physics, "bg-purple-600", "text-purple-600")}
      </td>
      <td className={cn("sticky z-10 bg-white group-hover:bg-muted/30 px-1.5 py-1.5 text-center border-r border-slate-200 text-[11px] font-semibold", OFF_CHEM, W_SUBJECT)}>
        {scoreBadge(student.chemistry_score, maxScores.chemistry, "bg-green-600", "text-green-600")}
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
  const [searchParams] = useSearchParams();
  const queryBranchFilter = searchParams.get("branchid") ?? searchParams.get("branch_id") ?? undefined;
  const lockedBranchFilter = initialBranchFilter ?? queryBranchFilter;
  const [branchFilter, setBranchFilter] = useState<string>(lockedBranchFilter ?? "all");
  const isBranchLocked = !!lockedBranchFilter && lockedBranchFilter !== "all";
  const branchParam = isBranchLocked
    ? lockedBranchFilter
    : branchFilter !== "all"
      ? branchFilter
      : undefined;

  useEffect(() => {
    setBranchFilter(lockedBranchFilter ?? "all");
  }, [lockedBranchFilter, open]);

  const { data, isLoading, error } = useQuery<ExamResultsDetail>({
    queryKey: ["exam-results", examId, branchParam],
    queryFn: () => getExamResults(examId!, { branch_id: branchParam, include_responses: true }).then(r => r.data),
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
    const students = branchFilter === "all"
      ? data.students
      : data.students.filter(s => String(s.branch_id) === branchFilter);
    return [...students].sort((a, b) => displayTotal(b) - displayTotal(a));
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
  const masRows = [
    {
      key: "math",
      label: "Math",
      value: mas.math,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      count: mas.math != null ? filtered.filter(s => s.math_score >= mas.math!).length : null,
    },
    {
      key: "physics",
      label: "Physics",
      value: mas.physics,
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
      count: mas.physics != null ? filtered.filter(s => s.physics_score >= mas.physics!).length : null,
    },
    {
      key: "chemistry",
      label: "Chem",
      value: mas.chemistry,
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      count: mas.chemistry != null ? filtered.filter(s => s.chemistry_score >= mas.chemistry!).length : null,
    },
  ];
  const hasMas = masRows.some(row => row.value != null);
  const selectedBranchName = isBranchLocked
    ? branches.find(([id]) => id === lockedBranchFilter)?.[1] ?? filtered[0]?.branch_name ?? "Selected Branch"
    : branchFilter === "all"
      ? "All Branches"
      : branches.find(([id]) => id === branchFilter)?.[1] ?? "Selected Branch";

  const downloadExcel = () => {
    if (!data || filtered.length === 0) return;

    const rows = filtered.map((student, index) => {
      const row: Record<string, string | number> = {
        Rank: index + 1,
        "Admission No": student.admission_no,
        Name: student.name,
        Section: student.section_name ?? "N/A",
        "Target Rank": student.target_rank ?? "",
        Total: displayTotal(student),
        Mathematics: student.math_score,
        Physics: student.physics_score,
        Chemistry: student.chemistry_score,
        Attempted: student.attempted,
        Correct: student.correct,
        Wrong: student.wrong,
        Unattempted: student.unattempted,
      };

      data.questions.forEach((question, i) => {
        const response = student.responses[i];
        const prefix = `Q${question.qno}`;
        row[`${prefix} Answer`] = response ? displayAnswer(response) : "";
        row[`${prefix} Marks`] = response?.marks_awarded ?? "";
        row[`${prefix} Status`] = question.is_deleted
          ? "Deleted"
          : question.is_bonus
            ? "Bonus"
            : response?.is_correct === true
              ? "Correct"
              : response?.is_correct === false
                ? "Wrong"
                : "Unattempted";
      });

      return row;
    });

    const summaryRows = [
      { Field: "Exam", Value: examCode },
      { Field: "Paper", Value: paper },
      { Field: "Branch", Value: selectedBranchName },
      { Field: "Students", Value: filtered.length },
      { Field: "Questions", Value: data.questions.filter(q => !q.is_deleted).length },
      { Field: "MAS Mathematics", Value: mas.math ?? "" },
      { Field: "MAS Physics", Value: mas.physics ?? "" },
      { Field: "MAS Chemistry", Value: mas.chemistry ?? "" },
      { Field: ">= MAS Count Mathematics", Value: masRows.find(row => row.key === "math")?.count ?? "" },
      { Field: ">= MAS Count Physics", Value: masRows.find(row => row.key === "physics")?.count ?? "" },
      { Field: ">= MAS Count Chemistry", Value: masRows.find(row => row.key === "chemistry")?.count ?? "" },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Results");

    const safeBranch = selectedBranchName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "branch";
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${examCode}_${paper}_${safeBranch}_results_${date}.xlsx`);
  };

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
                <Badge variant="outline" className="max-w-[320px] gap-1.5 truncate border-blue-200 bg-blue-50 text-blue-700">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{selectedBranchName}</span>
                </Badge>
              )}
              {data && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {filtered.length}/{data.students.length} students · {data.questions.filter(q => !q.is_deleted).length} Qs
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={downloadExcel}
                disabled={!data || filtered.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
              <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {hasMas && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">MAS</span>
              {masRows.map(row => (
                <span
                  key={row.key}
                  className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", row.bg, row.border, row.color)}
                >
                  <span>{row.label}</span>
                  <span className="font-mono">Value {row.value != null ? fmt(row.value) : "-"}</span>
                  <span className="h-3 w-px bg-current opacity-20" />
                  <span className="font-mono">
                    {">="} MAS{" "}
                    {row.count != null ? (
                      isLoading ? <span className={cn("inline-block h-2.5 w-8 rounded align-middle", SHIMMER)} /> : `${row.count}/${filtered.length}`
                    ) : (
                      "-"
                    )}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Branch filter chips */}
          {!isBranchLocked && branches.length > 1 && (
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
                { cls: "bg-slate-100 text-slate-400 border border-slate-200 italic", label: "Blank = Unattempted" },
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
            <ResultsTableSkeleton />
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
                  <th className={cn("sticky z-30 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-bold text-muted-foreground border-r border-slate-200", OFF_SECTION, W_SECTION)}>Section</th>
                  <th className={cn("sticky z-30 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-muted-foreground border-r border-slate-300", OFF_TOTAL, W_TOTAL)}>Total</th>
                  {subjects.map(s => (
                    <th key={s} className={cn(
                      "sticky z-30 bg-slate-50 px-2 py-1.5 text-[10px] font-bold border-r border-slate-200",
                      W_SUBJECT,
                      s === "Mathematics" ? OFF_MATH : s === "Physics" ? OFF_PHYSICS : OFF_CHEM,
                      SUBJ_COLOR[s]
                    )}>
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
                  <td className={cn("sticky z-30 bg-emerald-600 px-2 py-1.5 border-r border-emerald-500", OFF_SECTION, W_SECTION)} />
                  <td className={cn("sticky z-30 bg-emerald-600 px-2 py-1.5 border-r border-emerald-500", OFF_TOTAL, W_TOTAL)} />
                  {subjects.map(s => (
                    <td
                      key={s}
                      className={cn(
                        "sticky z-30 bg-emerald-600 px-2 py-1.5 border-r border-emerald-500",
                        W_SUBJECT,
                        s === "Mathematics" ? OFF_MATH : s === "Physics" ? OFF_PHYSICS : OFF_CHEM
                      )}
                    />
                  ))}
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
