import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Upload, Users, Building2, Loader2,
  CheckCircle2, XCircle, GraduationCap, ShieldCheck,
  CalendarDays, BookOpen, FileText, AlertTriangle, Eraser,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAcademicYears, getExams, getExamDetail, getPrograms, getClasses, clearExamResults } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import OMRUploadDialog from "@/components/exams/OMRUploadDialog";
import type { Exam, ExamDetail, BranchDetail, BranchSectionDetail, UploadLog } from "@/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

// ── small helpers ──────────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── students popup ─────────────────────────────────────────────────────────────
interface StudentsDialogProps {
  section: BranchSectionDetail | null;
  branchName: string;
  onClose: () => void;
}
function StudentsDialog({ section, branchName, onClose }: StudentsDialogProps) {
  if (!section) return null;
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {branchName} — {section.section_name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{section.student_count} student{section.student_count !== 1 ? "s" : ""}</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-2">
          {section.student_count === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No students assigned.</p>
          ) : (
            <table className="compact-table w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-semibold">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Adm No</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Name</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {section.students.map((s, i) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-mono">{s.admission_no}</td>
                    <td className="py-2 px-3 font-medium">{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── per-branch upload summary panel ───────────────────────────────────────────
interface BranchUploadPanelProps {
  paper: Exam;
  branch: BranchDetail;
  log: UploadLog | undefined;
  onUpload: () => void;
  onClear: () => void;
  onShowStudents: (section: BranchSectionDetail) => void;
}
function BranchUploadPanel({ paper: _paper, branch, log, onUpload, onClear, onShowStudents }: BranchUploadPanelProps) {
  const totalStudents = branch.sections.reduce((s, sec) => s + sec.student_count, 0);

  return (
    <Card key={branch.id} className="border-0 overflow-hidden shadow-sm">
      {/* Branch header */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600">
        <div className="flex items-center gap-2 shrink-0">
          <Building2 className="h-4 w-4 text-white/70 shrink-0" />
          <span className="font-bold text-white text-sm">{branch.name}</span>
          <span className="text-xs text-white/50 font-mono">{branch.code}</span>
        </div>
        <div className="flex items-center gap-5">
          {[
            { icon: ShieldCheck,   label: "Principal", person: branch.principal },
            { icon: GraduationCap, label: "Dean",      person: branch.dean },
            { icon: Users,          label: "Operator",  person: branch.operator },
          ].map(({ icon: Icon, label, person }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              <Icon className="h-3.5 w-3.5 text-white/60 shrink-0" />
              <span className="text-white/60 font-medium">{label}:</span>
              <span className="font-semibold text-white">
                {person ? person.full_name : <span className="italic text-white/30">—</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <CardContent className="px-5 py-4 space-y-3">
        {/* Sections row */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Sections · {totalStudents} students
          </p>
          <div className="flex flex-wrap gap-1.5">
            {branch.sections.map((section, idx) => (
              <button
                key={idx}
                onClick={() => onShowStudents(section)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors"
              >
                {section.section_name}
                <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]">
                  <Users className="h-2.5 w-2.5" />{section.student_count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload status for this branch */}
        {log ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold text-emerald-800 truncate" title={log.file_name}>
                {log.file_name || "OMR file"}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                {new Date(log.uploaded_at).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <button
                onClick={onClear}
                title="Clear results for this branch"
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded px-2 py-0.5 transition-colors"
              >
                <Eraser className="h-3 w-3" />
                Clear
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 ml-6 flex-wrap">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {log.valid_count} Uploaded
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {log.absent_count} Absent
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600">
                <XCircle className="h-3.5 w-3.5" />
                {log.duplicate_count} Duplicate
              </div>
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-orange-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                {log.invalid_count} Invalid
              </div>
            </div>

            {/* Progress bar */}
            {(() => {
              const total = log.valid_count + log.absent_count + log.duplicate_count + log.invalid_count;
              if (total === 0) return null;
              const validPct   = (log.valid_count     / total) * 100;
              const absentPct  = (log.absent_count    / total) * 100;
              const dupPct     = (log.duplicate_count / total) * 100;
              const invalidPct = (log.invalid_count   / total) * 100;
              return (
                <div className="ml-6 space-y-1">
                  <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-200">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${validPct}%` }} title={`${log.valid_count} uploaded`} />
                    <div className="bg-amber-400 transition-all"  style={{ width: `${absentPct}%` }}  title={`${log.absent_count} absent`} />
                    <div className="bg-red-500 transition-all"    style={{ width: `${dupPct}%` }}     title={`${log.duplicate_count} duplicate`} />
                    <div className="bg-orange-400 transition-all" style={{ width: `${invalidPct}%` }} title={`${log.invalid_count} invalid`} />
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { color: "bg-emerald-500", label: "Uploaded" },
                      { color: "bg-amber-400",   label: "Absent" },
                      { color: "bg-red-500",     label: "Duplicate" },
                      { color: "bg-orange-400",  label: "Invalid" },
                    ].map(({ color, label }) => (
                      <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`inline-block h-2 w-2 rounded-sm ${color}`} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Absent list */}
            {log.absent_list.length > 0 && (
              <div className="ml-6 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <span className="font-semibold">Absent: </span>
                {log.absent_list.slice(0, 10).join(", ")}
                {log.absent_list.length > 10 && (
                  <span className="italic text-amber-600"> +{log.absent_list.length - 10} more</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4 text-muted-foreground/30" />
              No OMR results uploaded yet
            </div>
            <button
              onClick={onUpload}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Upload className="h-3 w-3" />
              Upload OMR File
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const { isAdmin, branchIds } = useAuthStore();
  const examIdParam = searchParams.get("exam");
  const examId = examIdParam ? parseInt(examIdParam) : null;
  const yearId = selectedYear?.id;

  // omrTarget = { exam, branchId, branchName }
  const [omrTarget, setOmrTarget] = useState<{ exam: Exam; branchId: number; branchName: string } | null>(null);
  const [studentsPopup, setStudentsPopup] = useState<{ section: BranchSectionDetail; branchName: string } | null>(null);

  const clearBranchMut = useMutation({
    mutationFn: ({ paperId, branchId }: { paperId: number; branchId: number }) =>
      clearExamResults(paperId, branchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-detail", examId] });
      qc.invalidateQueries({ queryKey: ["exams", yearId] });
      toast({ title: "Branch results cleared" });
    },
    onError: (err: any) => {
      toast({ title: err?.response?.data?.detail ?? "Clear failed", variant: "destructive" });
    },
  });

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  useEffect(() => {
    if (!selectedYear && years.length > 0) {
      const cur = years.find(y => y.is_current) ?? years[0];
      setSelectedYear(cur);
    }
  }, [years, selectedYear, setSelectedYear]);

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

  // Deduplicate to one entry per logical exam (same code+program+class), published only, sorted by date desc
  const uniqueExams = allExams
    .filter(e => e.status === "published")
    .filter((e, idx, arr) =>
      arr.findIndex(x => x.exam_code === e.exam_code && x.program_id === e.program_id && x.class_id === e.class_id) === idx
    )
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  const { data: examDetail, isLoading: examLoading } = useQuery<ExamDetail>({
    queryKey: ["exam-detail", examId],
    queryFn: () => examId ? getExamDetail(examId).then(r => r.data) : null,
    enabled: !!examId,
  });

  // Papers for the selected exam
  const examPapers = examDetail
    ? allExams.filter(e =>
        e.exam_code === examDetail.exam_code &&
        e.status === "published"
      )
    : [];

  // Build a map: paper → branch_id → UploadLog
  const uploadLogMap: Record<string, Record<number, UploadLog>> = {};
  for (const paper of examPapers) {
    uploadLogMap[paper.paper] = {};
    for (const log of paper.upload_logs) {
      uploadLogMap[paper.paper][log.branch_id] = log;
    }
  }

  const selectExam = (id: string) => {
    navigate(`/results?exam=${id}`);
  };

  // ── Shared top bar (always visible) ─────────────────────────────────────────
  const TopBar = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">OMR Results Upload</h2>
          <p className="text-sm text-muted-foreground">Upload OMR scan results per exam paper and branch.</p>
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

          <Select
            value={examId ? String(examId) : ""}
            onValueChange={selectExam}
            disabled={!yearId || examsLoading}
          >
            <SelectTrigger className="min-w-max h-9">
              {examDetail ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">{examDetail.exam_code}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 h-5">
                    {examDetail.program_name}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] py-0 h-5">
                    {examDetail.class_name}
                  </Badge>
                </div>
              ) : (
                <SelectValue placeholder={examsLoading ? "Loading…" : "Select exam"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {uniqueExams.map(e => {
                const prog = programs.find(p => p.id === e.program_id);
                const cls = classes.find(c => c.id === e.class_id);
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
              {uniqueExams.length === 0 && !examsLoading && (
                <div className="px-3 py-2 text-xs text-muted-foreground italic">No published exams for this year</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // ── No year ──────────────────────────────────────────────────────────────────
  if (!yearId) {
    return (
      <div className="space-y-4">
        <TopBar />
        <Alert><AlertDescription>Select an academic year to continue.</AlertDescription></Alert>
      </div>
    );
  }

  // ── No exam selected ─────────────────────────────────────────────────────────
  if (!examId) {
    return (
      <div className="space-y-5">
        <TopBar />
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">No exam selected</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Choose an exam from the dropdown above, or go to the{" "}
              <button
                onClick={() => navigate("/exams")}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Exams page
              </button>{" "}
              and click the Upload icon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading exam detail ──────────────────────────────────────────────────────
  if (examLoading) {
    return (
      <div className="space-y-5">
        <TopBar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!examDetail) {
    return (
      <div className="space-y-4">
        <TopBar />
        <Alert variant="destructive"><AlertDescription>Failed to load exam details.</AlertDescription></Alert>
      </div>
    );
  }

  const configuredBranches = examDetail.branches
    .filter(b => b.sections.length > 0)
    .filter(b => isAdmin() || branchIds.includes(b.id));
  const totalStudents = configuredBranches.reduce((sum, branch) =>
    sum + branch.sections.reduce((s, sec) => s + sec.student_count, 0), 0
  );

  // ── Exam selected ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <TopBar />

      {/* Exam summary bar */}
      <div className={cn(
        "rounded-xl border px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3",
        examDetail.exam_type === "Mains"
          ? "bg-gradient-to-r from-blue-50 to-slate-50 border-blue-200"
          : "bg-gradient-to-r from-violet-50 to-slate-50 border-violet-200"
      )}>
        <div>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider",
            examDetail.exam_type === "Mains" ? "text-blue-500" : "text-violet-500")}>
            Exam Code
          </div>
          <div className={cn("font-mono text-xl font-bold mt-0.5",
            examDetail.exam_type === "Mains" ? "text-blue-800" : "text-violet-800")}>
            {examDetail.exam_code}
          </div>
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
            <div className="text-sm font-semibold mt-0.5">{configuredBranches.length}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Students
            </div>
            <div className="text-sm font-semibold mt-0.5">{totalStudents}</div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-sm px-3 py-1 h-fit",
              examDetail.exam_type === "Mains"
                ? "bg-blue-100 text-blue-800 border-blue-300"
                : "bg-violet-100 text-violet-800 border-violet-300"
            )}
          >
            {examDetail.exam_type} · {examDetail.exam_type === "Advanced" ? "P1 + P2" : "P1"}
          </Badge>
        </div>
      </div>

      {/* Per-paper, per-branch cards */}
      {configuredBranches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <XCircle className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="font-medium">No branches configured</p>
          <p className="text-sm text-muted-foreground/60 mt-1">No sections have been set up for this program and class.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {examPapers.map(paper => (
            <div key={paper.id}>
              {examPapers.length > 1 && (
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded text-white text-[10px]",
                    paper.paper === "P1" ? "bg-emerald-600" : "bg-amber-500"
                  )}>
                    {paper.paper}
                  </span>
                  Paper {paper.paper === "P1" ? "1" : "2"}
                </div>
              )}
              <div className="space-y-3">
                {configuredBranches.map(branch => {
                  const log = uploadLogMap[paper.paper]?.[branch.id];
                  return (
                    <BranchUploadPanel
                      key={branch.id}
                      paper={paper}
                      branch={branch}
                      log={log}
                      onUpload={() => setOmrTarget({ exam: paper, branchId: branch.id, branchName: branch.name })}
                      onClear={() => clearBranchMut.mutate({ paperId: paper.id, branchId: branch.id })}
                      onShowStudents={section => setStudentsPopup({ section, branchName: branch.name })}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OMR Upload Dialog */}
      {omrTarget && (
        <OMRUploadDialog
          exam={omrTarget.exam}
          branchId={omrTarget.branchId}
          branchName={omrTarget.branchName}
          open={!!omrTarget}
          onOpenChange={open => { if (!open) setOmrTarget(null); }}
        />
      )}

      {/* Students Popup */}
      {studentsPopup && (
        <StudentsDialog
          section={studentsPopup.section}
          branchName={studentsPopup.branchName}
          onClose={() => setStudentsPopup(null)}
        />
      )}
    </div>
  );
}
