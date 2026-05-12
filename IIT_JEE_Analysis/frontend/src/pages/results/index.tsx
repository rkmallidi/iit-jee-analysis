import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Upload, Trash2, Users, Building2, Loader2,
  CheckCircle2, XCircle, GraduationCap, ShieldCheck,
  CalendarDays, BookOpen, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { getAcademicYears, getExams, getExamDetail, getPrograms, getClasses } from "@/lib/api";
import OMRUploadDialog from "@/components/exams/OMRUploadDialog";
import type { Exam, ExamDetail, BranchDetail, BranchSectionDetail } from "@/types";
import { cn } from "@/lib/utils";

// ── small helpers ──────────────────────────────────────────────────────────────
const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// paper row colors
const PAPER_STYLE: Record<string, string> = {
  P1: "bg-emerald-50 border-emerald-200 text-emerald-800",
  P1_mains: "bg-sky-50 border-sky-200 text-sky-800",
  P2: "bg-amber-50 border-amber-200 text-amber-800",
};

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
            <table className="w-full text-xs">
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

// ── branch panel ───────────────────────────────────────────────────────────────
interface BranchPanelProps {
  branch: BranchDetail;
  examDetail: ExamDetail;
  uploadedPapers: Set<string>;
  onUpload: (paper: "P1" | "P2") => void;
  onClear: (key: string) => void;
  onShowStudents: (section: BranchSectionDetail) => void;
}
function BranchPanel({ branch, examDetail, uploadedPapers, onUpload, onClear, onShowStudents }: BranchPanelProps) {
  if (branch.sections.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground italic">
        <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        No sections configured for this program &amp; class in this branch.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">Section</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">Students</th>
              {examDetail.exam_type === "Mains" ? (
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-sky-700">P1 Upload</th>
              ) : (
                <>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-emerald-700">P1 Upload</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-amber-700">P2 Upload</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {branch.sections.map((section, idx) => {
              const p1Key = `${branch.id}-${section.section_name}-P1`;
              const p2Key = `${branch.id}-${section.section_name}-P2`;
              const p1Done = uploadedPapers.has(p1Key);
              const p2Done = uploadedPapers.has(p2Key);

              return (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  {/* Section name */}
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm">{section.section_name}</span>
                  </td>

                  {/* Student count - clickable */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onShowStudents(section)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-200"
                    >
                      <Users className="h-3 w-3" />
                      {section.student_count}
                    </button>
                  </td>

                  {/* P1 */}
                  <td className="px-4 py-3">
                    <div className={cn(
                      "flex items-center justify-between rounded px-2.5 py-1.5 border text-xs",
                      examDetail.exam_type === "Mains" ? PAPER_STYLE.P1_mains : PAPER_STYLE.P1
                    )}>
                      <div className="flex items-center gap-1.5">
                        {p1Done
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                        <span className={p1Done ? "text-green-700 font-medium" : "text-muted-foreground"}>
                          {p1Done ? "Done" : "Pending"}
                        </span>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => onUpload("P1")}
                          className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/80 border hover:bg-white transition-colors"
                        >
                          <Upload className="h-2.5 w-2.5" />
                          {p1Done ? "Re-upload" : "Upload"}
                        </button>
                        {p1Done && (
                          <button
                            onClick={() => onClear(p1Key)}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/80 border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* P2 (Advanced only) */}
                  {examDetail.exam_type === "Advanced" && (
                    <td className="px-4 py-3">
                      <div className={cn("flex items-center justify-between rounded px-2.5 py-1.5 border text-xs", PAPER_STYLE.P2)}>
                        <div className="flex items-center gap-1.5">
                          {p2Done
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                          <span className={p2Done ? "text-green-700 font-medium" : "text-muted-foreground"}>
                            {p2Done ? "Done" : "Pending"}
                          </span>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => onUpload("P2")}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/80 border hover:bg-white transition-colors"
                          >
                            <Upload className="h-2.5 w-2.5" />
                            {p2Done ? "Re-upload" : "Upload"}
                          </button>
                          {p2Done && (
                            <button
                              onClick={() => onClear(p2Key)}
                              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/80 border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/20 border-t">
              <td className="px-4 py-2 text-xs font-semibold text-muted-foreground">{branch.sections.length} section{branch.sections.length !== 1 ? "s" : ""}</td>
              <td className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">{branch.sections.reduce((s, sec) => s + sec.student_count, 0)} total</td>
              {examDetail.exam_type === "Mains"
                ? <td />
                : <><td /><td /></>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const examIdParam = searchParams.get("exam");
  const examId = examIdParam ? parseInt(examIdParam) : null;
  const yearId = selectedYear?.id;

  const [omrTarget, setOmrTarget] = useState<Exam | null>(null);
  const [uploadedPapers, setUploadedPapers] = useState<Set<string>>(new Set());
  const [studentsPopup, setStudentsPopup] = useState<{ section: BranchSectionDetail; branchName: string } | null>(null);

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

  // Programs and classes lookup
  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getPrograms().then(r => r.data),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => getClasses().then(r => r.data),
  });

  // All exams for the selected year — for the exam selector
  const { data: allExams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["exams", yearId],
    queryFn: () => getExams({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  // Deduplicate to one entry per logical exam (same code+program+class), sorted by date desc
  const uniqueExams = allExams
    .filter((e, idx, arr) =>
      arr.findIndex(x => x.exam_code === e.exam_code && x.program_id === e.program_id && x.class_id === e.class_id) === idx
    )
    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());

  const { data: examDetail, isLoading: examLoading } = useQuery({
    queryKey: ["exam-detail", examId],
    queryFn: () => examId ? getExamDetail(examId).then(r => r.data) : null,
    enabled: !!examId,
  });

  const handleClear = (key: string) => {
    setUploadedPapers(prev => { const s = new Set(prev); s.delete(key); return s; });
    toast({ title: "Results cleared" });
  };

  const makeVirtualExam = (paper: "P1" | "P2"): Exam => ({
    id: examDetail!.id,
    academic_year_id: 0,
    program_id: 0,
    class_id: 0,
    exam_code: examDetail!.exam_code,
    exam_type: examDetail!.exam_type,
    paper,
    exam_date: examDetail!.exam_date,
    created_at: "",
    updated_at: "",
    question_count: 0,
  });

  const selectExam = (id: string) => {
    navigate(`/results?exam=${id}`);
    setUploadedPapers(new Set());
  };

  // ── Shared top bar (always visible) ─────────────────────────────────────────
  const TopBar = () => (
    <div className="space-y-3">
      {/* Title and Selectors — single line */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">OMR Results Upload</h2>
          <p className="text-sm text-muted-foreground">Upload OMR scan results per exam paper and branch.</p>
        </div>

        {/* Year and Exam selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Academic year picker */}
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

          {/* Exam picker with Program and Class badges in trigger */}
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
                const fullExam = allExams.find(x => x.id === e.id);
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
                <div className="px-3 py-2 text-xs text-muted-foreground italic">No exams for this year</div>
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

  // ── Exam selected ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <TopBar />

      {/* Exam summary bar */}
      {(() => {
        const totalStudents = examDetail.branches.reduce((sum, branch) =>
          sum + branch.sections.reduce((s, sec) => s + sec.student_count, 0), 0
        );
        return (
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
                  <Users className="h-3 w-3" /> Total Students
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
        );
      })()}

      {/* Branch panels */}
      <div className="space-y-3">
        {examDetail.branches.map(branch => {
          const total = branch.sections.reduce((s, sec) => s + sec.student_count, 0);
          return (
            <Card key={branch.id} className="border-slate-200 overflow-hidden shadow-sm">
              {/* Compact dark header */}
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 text-white/70 shrink-0" />
                  <span className="font-bold text-white text-sm">{branch.name}</span>
                  <span className="text-white/50 text-xs">{branch.code}</span>
                </div>

                <Badge variant="outline" className="border-white/30 text-white/80 text-[10px] py-0 shrink-0">
                  {total} students · {branch.sections.length} section{branch.sections.length !== 1 ? "s" : ""}
                </Badge>

                <div className="flex items-center gap-4 ml-auto flex-wrap">
                  {[
                    { icon: Users, color: "text-orange-300", label: "Operator", person: branch.operator },
                    { icon: ShieldCheck, color: "text-blue-300", label: "Principal", person: branch.principal },
                    { icon: GraduationCap, color: "text-green-300", label: "Dean", person: branch.dean },
                  ].map(({ icon: Icon, color, label, person }) => (
                    <div key={label} className="flex items-center gap-1 text-[11px]">
                      <Icon className={cn("h-3 w-3 shrink-0", color)} />
                      <span className={cn("font-semibold", color)}>{label}:</span>
                      <span className="text-white/70 truncate max-w-[120px]">
                        {person ? person.full_name : <span className="italic text-white/30">—</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <CardContent className="pt-4 pb-4">
                <BranchPanel
                  branch={branch}
                  examDetail={examDetail}
                  uploadedPapers={uploadedPapers}
                  onUpload={paper => setOmrTarget(makeVirtualExam(paper))}
                  onClear={handleClear}
                  onShowStudents={section => setStudentsPopup({ section, branchName: branch.name })}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* OMR Upload Dialog */}
      {omrTarget && (
        <OMRUploadDialog
          exam={omrTarget}
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
