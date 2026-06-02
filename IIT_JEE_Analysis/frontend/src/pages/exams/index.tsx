import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Plus, Pencil, Trash2, CalendarCheck, Loader2, FileText,
  Upload, ChevronRight, BookOpen, GraduationCap, CalendarDays,
  BarChart3, BarChart2, Building2, Info, CheckCircle2, Send, RotateCcw, Lock, Eraser, FlaskConical,
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
  getStudents, getExams, createExam, updateExam, updateExamMas, deleteExam, getExamQuestions,
  publishExam, unpublishExam, completeExam, reopenExam, clearExamResults,
  evaluateExam, clearExamEvaluation, getEvaluationStatus,
} from "@/lib/api";
import type { Branch, Class, Exam, ExamStatus, ExamType, Program, Student, ExamQuestion, EvaluationStatus } from "@/types";
import { cn } from "@/lib/utils";
import ResultsDrawer from "@/components/exams/ResultsDrawer";
import { useAuthStore } from "@/store/auth";

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

const STATUS_META: Record<ExamStatus, { label: string; badgeClass: string; sectionLabel: string; sectionClass: string }> = {
  published: {
    label: "Upcoming",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300",
    sectionLabel: "Upcoming (Published)",
    sectionClass: "text-emerald-700",
  },
  draft: {
    label: "Draft",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300",
    sectionLabel: "Draft",
    sectionClass: "text-slate-600",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-slate-200 text-slate-500 border-slate-300",
    sectionLabel: "Completed",
    sectionClass: "text-slate-400",
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
  allQuestionsData: Record<number, ExamQuestion[]>;
  yearId: number;
  canEdit: boolean;
  canUpload: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpload: () => void;
  onEvaluate: (examId: number, paper: string, mas: { math: number | null; physics: number | null; chemistry: number | null }) => void;
}

function ExamCard({ le, progMap, classMap, branches, students, questions, allQuestionsData, yearId, canEdit, canUpload, onEdit, onDelete, onUpload, onEvaluate }: ExamCardProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [clearEvaluationOpen, setClearEvaluationOpen] = useState(false);
  const meta = TYPE_META[le.rep.exam_type];
  const statusMeta = STATUS_META[le.rep.status ?? "draft"];
  const program = progMap[le.rep.program_id];
  const cls = classMap[le.rep.class_id];
  const totalQs = le.papers.reduce((s, p) => s + (p.question_count ?? 0), 0);
  const activeBranches = branches.filter(b => b.is_active);
  const status = le.rep.status ?? "draft";

  const onMutateError = (err: any) => {
    const msg = err?.response?.data?.detail ?? "Action failed";
    toast({ title: msg, variant: "destructive" });
  };

  const applyStatusUpdate = (updatedExam: Exam) => {
    qc.setQueryData<Exam[]>(["exams", yearId], old =>
      old?.map(e =>
        e.exam_code === updatedExam.exam_code &&
        e.program_id === updatedExam.program_id &&
        e.class_id   === updatedExam.class_id
          ? { ...e, status: updatedExam.status }
          : e
      ) ?? old
    );
  };

  const publishMut = useMutation({
    mutationFn: () => publishExam(le.rep.id),
    onSuccess: (res) => {
      applyStatusUpdate(res.data);
      toast({ title: "Exam published" });
    },
    onError: onMutateError,
  });

  const unpublishMut = useMutation({
    mutationFn: () => unpublishExam(le.rep.id),
    onSuccess: (res) => {
      applyStatusUpdate(res.data);
      toast({ title: "Exam moved back to draft" });
    },
    onError: onMutateError,
  });

  const completeMut = useMutation({
    mutationFn: () => completeExam(le.rep.id),
    onSuccess: (res) => {
      applyStatusUpdate(res.data);
      toast({ title: "Exam marked as completed" });
    },
    onError: onMutateError,
  });

  const reopenMut = useMutation({
    mutationFn: () => reopenExam(le.rep.id),
    onSuccess: (res) => {
      applyStatusUpdate(res.data);
      toast({ title: "Exam reopened to Published" });
    },
    onError: onMutateError,
  });

  const clearResultsMut = useMutation({
    mutationFn: () => Promise.all(le.papers.map(p => clearExamResults(p.id))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      toast({ title: "Results cleared" });
    },
    onError: onMutateError,
  });

  const { data: evalStatus } = useQuery<EvaluationStatus>({
    queryKey: ["eval-status", le.rep.id],
    queryFn: () => getEvaluationStatus(le.rep.id).then(r => r.data),
    enabled: status === "completed" && le.papers.some(p => p.result_count > 0),
    staleTime: 30_000,
  });

  const evaluateMut = useMutation({
    mutationFn: () => evaluateExam(le.rep.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["eval-status", le.rep.id] });
      qc.invalidateQueries({ queryKey: ["evaluated-exams"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
      const s = res.data;
      toast({ title: `Evaluation complete — ${s.total_evaluated} students evaluated` });
    },
    onError: onMutateError,
  });

  const clearEvaluationMut = useMutation({
    mutationFn: () => clearExamEvaluation(le.rep.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["eval-status", le.rep.id] });
      qc.invalidateQueries({ queryKey: ["evaluated-exams"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
      qc.invalidateQueries({ queryKey: ["student-report"] });
      const s = res.data;
      toast({
        title: "Evaluation cleared",
        description: `${s.deleted_evaluations ?? 0} paper rows and ${s.deleted_cumulative_evaluations ?? 0} cumulative rows removed.`,
      });
    },
    onError: onMutateError,
  });

  const isBusy = publishMut.isPending || unpublishMut.isPending || completeMut.isPending || reopenMut.isPending || clearResultsMut.isPending || evaluateMut.isPending || clearEvaluationMut.isPending;

  return (
    <>
    <Card className={cn(
      "group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-900",
      status === "completed" && "opacity-80"
    )}>
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
                {/* Status badge */}
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                  statusMeta.badgeClass
                )}>
                  {status === "published" && <CheckCircle2 className="h-2.5 w-2.5" />}
                  {status === "completed" && <Lock className="h-2.5 w-2.5" />}
                  {statusMeta.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {fmt(le.rep.exam_date)}
              </div>
            </div>

            {/* Action buttons — conditional per status and role */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mr-1" />}

              {status === "draft" && canEdit && (
                <>
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
                  {totalQs > 0 && (
                    <button
                      onClick={() => !isBusy && publishMut.mutate()}
                      title="Publish exam"
                      disabled={isBusy}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}

              {status === "published" && (
                <>
                  {canUpload && (
                    <button
                      onClick={onUpload}
                      title="Upload OMR results"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canEdit && le.papers.some(p => p.result_count > 0) && (
                    <button
                      onClick={() => !isBusy && clearResultsMut.mutate()}
                      title="Clear ALL results"
                      disabled={isBusy}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => !isBusy && unpublishMut.mutate()}
                        title="Unpublish (move back to Draft)"
                        disabled={isBusy}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => !isBusy && completeMut.mutate()}
                        title="Mark as Completed"
                        disabled={isBusy}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}

              {status === "completed" && (
                <>
                  {canEdit && le.papers.some(p => p.result_count > 0) && (
                    <button
                      onClick={() => !isBusy && evaluateMut.mutate()}
                      title={evalStatus?.evaluated ? "Re-run Evaluation" : "Run Evaluation"}
                      disabled={isBusy}
                      className={cn(
                        "rounded-md p-1.5 transition-colors disabled:opacity-50",
                        evalStatus?.evaluated
                          ? "text-violet-500 hover:text-violet-700 hover:bg-violet-50"
                          : "text-muted-foreground hover:text-violet-600 hover:bg-violet-50"
                      )}
                    >
                      {evaluateMut.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <FlaskConical className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                  {canEdit && evalStatus?.evaluated && (
                    <button
                      onClick={() => !isBusy && setClearEvaluationOpen(true)}
                      title="Clear Evaluation"
                      disabled={isBusy}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {clearEvaluationMut.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Eraser className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                  {canEdit && !evalStatus?.evaluated && (
                    <button
                      onClick={() => !isBusy && reopenMut.mutate()}
                      title="Reopen to Published"
                      disabled={isBusy}
                      className="rounded-md p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={onDelete}
                      title="Delete exam"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
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
            {status === "completed" && (
              <div className="ml-auto flex items-center gap-1.5">
                {evalStatus?.evaluated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[10px] font-semibold text-violet-700">
                    <FlaskConical className="h-2.5 w-2.5" />
                    Evaluated
                  </span>
                )}
                {le.papers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onEvaluate(p.id, p.paper, { math: p.mas_mathematics ?? null, physics: p.mas_physics ?? null, chemistry: p.mas_chemistry ?? null })}
                    className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 font-semibold px-1.5 py-0.5 rounded hover:bg-violet-50 transition-colors"
                  >
                    <BarChart2 className="h-3 w-3" />
                    {le.papers.length > 1 ? `${p.paper} Results` : "Results"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            {le.papers.map(p => (
              <PaperRow
                key={p.id}
                paper={p}
                paperQuestions={allQuestionsData[p.id] ?? []}
                onClick={() => navigate(`/exams/${p.id}/questions`)}
                canEditMas={status !== "completed"}
                yearId={yearId!}
              />
            ))}
          </div>

          {status === "draft" && totalQs === 0 && (
            <p className="mt-2 text-[11px] text-amber-600">Configure questions before publishing.</p>
          )}

          {/* Result summary — pending branches only */}
          {status === "published" && (() => {
            const branchesWithStudents = activeBranches.filter(b =>
              students.some(s =>
                s.section_mapping?.branch_section?.branch_id === b.id &&
                s.section_mapping?.branch_section?.program_id === le.rep.program_id
              )
            );
            const pendingItems: { paperLabel: string; branchName: string }[] = [];
            for (const p of le.papers) {
              const uploadedBranchIds = new Set(p.upload_logs.map(l => l.branch_id));
              for (const b of branchesWithStudents) {
                if (!uploadedBranchIds.has(b.id)) {
                  pendingItems.push({
                    paperLabel: le.papers.length > 1 ? p.paper : "",
                    branchName: b.name,
                  });
                }
              }
            }
            if (branchesWithStudents.length === 0) return null;
            if (pendingItems.length === 0) return (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                All branches uploaded
              </div>
            );
            return (
              <div className="mt-2 space-y-1">
                {pendingItems.map((item, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-700 mr-1.5 mb-0.5">
                    <Upload className="h-3 w-3 shrink-0" />
                    <span className="font-semibold">
                      {item.paperLabel ? `${item.paperLabel} · ` : ""}{item.branchName}
                    </span>
                    <span className="text-amber-500">pending</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

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
            <PopoverContent className="w-72 p-2" align="start">
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">Branches & Student Count</div>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                {activeBranches.map(b => {
                  const count = students.filter(s =>
                    s.section_mapping?.branch_section?.branch_id === b.id &&
                    s.section_mapping?.branch_section?.program_id === le.rep.program_id
                  ).length;
                  return (
                    <div key={b.id} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium leading-snug">{b.name}</div>
                        <div className="text-[10px] text-muted-foreground">{b.code}</div>
                      </div>
                      <Badge variant="secondary" className="h-8 w-14 justify-center rounded-md px-1 py-0 text-center leading-none">
                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-[11px] font-bold leading-none">{count}</span>
                          <span className="text-[9px] font-medium leading-none text-muted-foreground">students</span>
                        </span>
                      </Badge>
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
    <ConfirmDialog
      open={clearEvaluationOpen}
      title="Clear Evaluation"
      description={`Clear computed evaluations for "${le.rep.exam_code}"? OMR results will remain, but ranks, MI, analytics and student report entries for this exam will be removed until evaluation is run again.`}
      confirmLabel="Clear Evaluation"
      onConfirm={() => clearEvaluationMut.mutate()}
      onCancel={() => setClearEvaluationOpen(false)}
    />
    </>
  );
}

const DIFF_WEIGHTS: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3, "Very Hard": 4 };
const SUBJ_META: Record<string, { short: string; color: string; labelClass: string }> = {
  Mathematics: { short: "M", color: "text-blue-600",   labelClass: "text-blue-700" },
  Physics:     { short: "P", color: "text-purple-600", labelClass: "text-purple-700" },
  Chemistry:   { short: "C", color: "text-green-600",  labelClass: "text-green-700" },
};

function Stars({ avg, size = 10 }: { avg: number; size?: number }) {
  const color = avg < 1.5 ? "text-emerald-500" : avg < 2.5 ? "text-amber-500" : avg < 3.5 ? "text-orange-600" : "text-red-700";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <span key={i} className={i <= avg ? color : "text-muted-foreground/20"} style={{ fontSize: size }}>★</span>
      ))}
    </div>
  );
}

function PaperRow({ paper, paperQuestions, onClick, canEditMas, yearId }: {
  paper: Exam;
  paperQuestions: ExamQuestion[];
  onClick: () => void;
  canEditMas: boolean;
  yearId: number;
}) {
  const qc = useQueryClient();
  const [masOpen, setMasOpen] = useState(false);
  const [masMath, setMasMath] = useState(paper.mas_mathematics != null ? String(paper.mas_mathematics) : "");
  const [masPhys, setMasPhys] = useState(paper.mas_physics != null ? String(paper.mas_physics) : "");
  const [masChem, setMasChem] = useState(paper.mas_chemistry != null ? String(paper.mas_chemistry) : "");

  useEffect(() => {
    if (!masOpen) {
      setMasMath(paper.mas_mathematics != null ? String(paper.mas_mathematics) : "");
      setMasPhys(paper.mas_physics != null ? String(paper.mas_physics) : "");
      setMasChem(paper.mas_chemistry != null ? String(paper.mas_chemistry) : "");
    }
  }, [paper.mas_mathematics, paper.mas_physics, paper.mas_chemistry, masOpen]);

  // Subject max marks (active questions only)
  const subjectMax = paperQuestions
    .filter(q => !q.is_deleted)
    .reduce<Record<string, number>>((acc, q) => {
      acc[q.subject] = (acc[q.subject] ?? 0) + (q.marks ?? 0);
      return acc;
    }, {});

  const parseMas = (v: string) => v.trim() === "" ? null : Number(v);
  const masValues = { Mathematics: masMath, Physics: masPhys, Chemistry: masChem };
  const masSetters = { Mathematics: setMasMath, Physics: setMasPhys, Chemistry: setMasChem };

  const errors = {
    Mathematics: masMath.trim() !== "" && subjectMax["Mathematics"] != null && Number(masMath) > subjectMax["Mathematics"]
      ? `Max ${subjectMax["Mathematics"]}` : null,
    Physics: masPhys.trim() !== "" && subjectMax["Physics"] != null && Number(masPhys) > subjectMax["Physics"]
      ? `Max ${subjectMax["Physics"]}` : null,
    Chemistry: masChem.trim() !== "" && subjectMax["Chemistry"] != null && Number(masChem) > subjectMax["Chemistry"]
      ? `Max ${subjectMax["Chemistry"]}` : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const saveMas = useMutation({
    mutationFn: () => updateExamMas(paper.id, parseMas(masMath), parseMas(masPhys), parseMas(masChem)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams", yearId] }); setMasOpen(false); toast({ title: "MAS saved" }); },
    onError: (err: any) => toast({ title: err?.response?.data?.detail ?? "Failed to save MAS", variant: "destructive" }),
  });

  // Difficulty stats
  const active = paperQuestions.filter(q => !q.is_deleted && !q.is_bonus);
  const subjSum: Record<string, number> = {};
  const subjCnt: Record<string, number> = {};
  let totalDiffSum = 0, totalDiffCnt = 0;
  active.forEach(q => {
    if (q.difficulty && q.difficulty !== "None" && q.difficulty in DIFF_WEIGHTS) {
      const w = DIFF_WEIGHTS[q.difficulty];
      subjSum[q.subject] = (subjSum[q.subject] ?? 0) + w;
      subjCnt[q.subject] = (subjCnt[q.subject] ?? 0) + 1;
      totalDiffSum += w; totalDiffCnt++;
    }
  });
  const overallAvg = totalDiffCnt > 0 ? totalDiffSum / totalDiffCnt : 0;
  const hasDiff = overallAvg > 0;
  const totalMarks = active.reduce((s, q) => s + (q.marks ?? 0), 0);

  const paperColor = paper.paper === "P1"
    ? "bg-sky-100 text-sky-700 border-sky-200"
    : "bg-amber-100 text-amber-700 border-amber-200";
  const hasMas = paper.mas_mathematics != null || paper.mas_physics != null || paper.mas_chemistry != null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Row 1 — clickable: badge + Q count + overall difficulty */}
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2 px-3 pt-2 pb-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded border shrink-0", paperColor)}>
          {paper.paper}
        </span>

        <span className="text-[11px] text-muted-foreground shrink-0">
          {paper.question_count > 0 ? (
            <span className="font-semibold text-foreground">{paper.question_count}</span>
          ) : (
            <span className="italic opacity-50">—</span>
          )} Qs
        </span>

        {totalMarks > 0 && (
          <span className="text-[11px] text-muted-foreground shrink-0">
            <span className="font-semibold text-foreground">{totalMarks}</span> Marks
          </span>
        )}

        {hasDiff && (
          <div className="ml-auto flex min-w-0 items-center gap-1.5">
            <span className="hidden text-[10px] text-muted-foreground/50 font-medium sm:inline">Overall</span>
            <Stars avg={overallAvg} size={10} />
            <span className={cn(
              "whitespace-nowrap text-[10px] font-semibold",
              overallAvg < 1.5 ? "text-emerald-600" :
              overallAvg < 2.5 ? "text-amber-600" :
              overallAvg < 3.5 ? "text-orange-600" : "text-red-700"
            )}>
              {overallAvg < 1.5 ? "Easy" : overallAvg < 2.5 ? "Medium" : overallAvg < 3.5 ? "Hard" : "Very Hard"}
            </span>
          </div>
        )}
      </button>

      {/* Row 2 — per-subject difficulty + MAS inline */}
      <div className="space-y-1 px-3 pb-2 pt-0.5">
        {/* Subject difficulty stars */}
        {hasDiff && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            {Object.entries(SUBJ_META).map(([subj, { labelClass }]) => {
              if (!subjCnt[subj]) return null;
              const a = subjSum[subj] / subjCnt[subj];
              return (
                <div key={subj} className="flex shrink-0 items-center gap-0.5">
                  <span className={cn("font-semibold text-[10px]", labelClass)}>{subj.slice(0, 4)}</span>
                  <Stars avg={a} size={9} />
                </div>
              );
            })}
          </div>
        )}

        {/* MAS values */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="shrink-0 text-[10px] font-bold text-amber-600 uppercase tracking-wide">MAS</span>
          {Object.entries(SUBJ_META).map(([subj, { short, color }]) => {
            const val = subj === "Mathematics" ? paper.mas_mathematics : subj === "Physics" ? paper.mas_physics : paper.mas_chemistry;
            return (
              <span key={subj} className="flex shrink-0 items-center gap-0.5 text-[10px]">
                <span className={cn("font-bold", color)}>{short}</span>
                <span className={val != null ? "font-semibold text-foreground" : "text-muted-foreground/40 italic"}>
                  {val ?? "—"}
                </span>
              </span>
            );
          })}

          {canEditMas && (
            <Popover open={masOpen} onOpenChange={setMasOpen}>
              <PopoverTrigger asChild>
                <button className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded text-amber-600 hover:bg-amber-50 hover:text-amber-800">
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-64 p-3 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700">MAS — {paper.paper}</div>
                <p className="text-[11px] text-muted-foreground leading-tight">Min score per subject. Leave blank to unset.</p>
                <div className="space-y-2">
                  {(["Mathematics", "Physics", "Chemistry"] as const).map(subj => {
                    const { labelClass } = SUBJ_META[subj];
                    const val = masValues[subj];
                    const setVal = masSetters[subj];
                    const max = subjectMax[subj] ?? null;
                    const err = errors[subj];
                    return (
                      <div key={subj} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label className={cn("text-[11px] font-semibold w-24 shrink-0", labelClass)}>{subj}</Label>
                          <Input
                            type="number" min={0} step={0.5}
                            placeholder={max != null ? `0–${max}` : "—"}
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            className={cn("h-7 text-xs", err && "border-red-400 focus-visible:ring-red-300")}
                          />
                        </div>
                        {err
                          ? <p className="text-[10px] text-red-600 ml-[100px]">{err}</p>
                          : max != null && <p className="text-[10px] text-muted-foreground ml-[100px]">max {max} marks</p>
                        }
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMasOpen(false)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => saveMas.mutate()} disabled={saveMas.isPending || hasErrors}>
                    {saveMas.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Save
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status section header ─────────────────────────────────────────────────────
function StatusSectionHeader({ status, count }: { status: ExamStatus; count: number }) {
  const meta = STATUS_META[status];
  const icons: Record<ExamStatus, React.ReactNode> = {
    published: <CheckCircle2 className="h-4 w-4" />,
    draft: <FileText className="h-4 w-4" />,
    completed: <Lock className="h-4 w-4" />,
  };
  return (
    <div className={cn("flex items-center gap-2 text-sm font-bold mb-3", meta.sectionClass)}>
      {icons[status]}
      <span>{meta.sectionLabel}</span>
      <span className="text-xs font-normal text-muted-foreground">({count})</span>
      <div className="flex-1 h-px bg-border ml-1" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExamsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;
  const { isAdmin, branchIds, isOperator } = useAuthStore();

  const [formTarget, setFormTarget] = useState<LogicalExam | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<LogicalExam | null>(null);
  const [resultsTarget, setResultsTarget] = useState<{ examId: number; examCode: string; paper: string; mas: { math: number | null; physics: number | null; chemistry: number | null } } | null>(null);

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

  const examIds = rawExams.map(e => e.id);
  const { data: allQuestionsData = {} } = useQuery<Record<number, ExamQuestion[]>>({
    queryKey: ["exam-questions-all", examIds],
    queryFn: async () => {
      const result: Record<number, ExamQuestion[]> = {};
      const results = await Promise.all(
        examIds.map(id => getExamQuestions(id).then(r => r.data).catch(() => [] as ExamQuestion[]))
      );
      examIds.forEach((id, i) => {
        result[id] = results[i] || [];
      });
      return result;
    },
    enabled: !!yearId && examIds.length > 0,
  });

  const allLogical = groupExams(rawExams).sort((a, b) =>
    new Date(b.rep.exam_date).getTime() - new Date(a.rep.exam_date).getTime()
  );

  // Group by status: published first, draft second, completed last
  const publishedExams  = allLogical.filter(le => le.rep.status === "published");
  const draftExams      = allLogical.filter(le => (le.rep.status ?? "draft") === "draft");
  const completedExams  = allLogical.filter(le => le.rep.status === "completed");

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

  const mainsCount    = allLogical.filter(e => e.rep.exam_type === "Mains").length;
  const advancedCount = allLogical.filter(e => e.rep.exam_type === "Advanced").length;

  // Non-admin users see only their own branches in exam cards
  const visibleBranches = isAdmin() ? branches : branches.filter(b => branchIds.includes(b.id));

  const renderGrid = (items: LogicalExam[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map(le => (
        <ExamCard
          key={le.key}
          le={le}
          progMap={progMap}
          classMap={classMap}
          branches={visibleBranches}
          students={students}
          questions={allQuestionsData[le.rep.id]}
          allQuestionsData={allQuestionsData}
          yearId={yearId!}
          canEdit={isAdmin()}
          canUpload={isAdmin() || !isOperator()}
          onEdit={() => setFormTarget(le)}
          onDelete={() => setDeleteTarget(le)}
          onUpload={() => navigate(`/results?exam=${le.rep.id}`)}
          onEvaluate={(examId, paper, mas) => setResultsTarget({ examId, examCode: le.rep.exam_code, paper, mas })}
        />
      ))}
    </div>
  );

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
          {isAdmin() && (
            <Button size="sm" onClick={() => setFormTarget("new")} disabled={!yearId}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Exam
            </Button>
          )}
        </div>
      </div>

      {/* Summary chips */}
      {yearId && !isLoading && allLogical.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <CalendarCheck className="h-3.5 w-3.5" />
            {allLogical.length} exam{allLogical.length !== 1 ? "s" : ""}
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
          {publishedExams.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              {publishedExams.length} Upcoming
            </div>
          )}
          {completedExams.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-500">
              <Lock className="h-3 w-3" />
              {completedExams.length} Completed
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
      {yearId && !isLoading && allLogical.length === 0 && (
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

      {/* Grouped exam sections */}
      {yearId && !isLoading && allLogical.length > 0 && (
        <div className="space-y-8">
          {publishedExams.length > 0 && (
            <div>
              <StatusSectionHeader status="published" count={publishedExams.length} />
              {renderGrid(publishedExams)}
            </div>
          )}

          {draftExams.length > 0 && (
            <div>
              <StatusSectionHeader status="draft" count={draftExams.length} />
              {renderGrid(draftExams)}
            </div>
          )}

          {completedExams.length > 0 && (
            <div>
              <StatusSectionHeader status="completed" count={completedExams.length} />
              {renderGrid(completedExams)}
            </div>
          )}
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

      <ResultsDrawer
        examId={resultsTarget?.examId ?? null}
        examCode={resultsTarget?.examCode ?? ""}
        paper={resultsTarget?.paper ?? ""}
        mas={resultsTarget?.mas ?? { math: null, physics: null, chemistry: null }}
        open={!!resultsTarget}
        onClose={() => setResultsTarget(null)}
      />

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
