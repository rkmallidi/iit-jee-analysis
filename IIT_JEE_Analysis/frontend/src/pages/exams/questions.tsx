import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, BookOpenCheck, Info, Pencil, Key, Flag, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/hooks/use-toast";
import { getExams, getPrograms, getClasses, getExamQuestions, updateExamQuestion, downloadExamQuestionTemplate, uploadExamQuestionsExcel, clearExamQuestions } from "@/lib/api";
import type { ExamQuestion, ExamStatus, UploadResult } from "@/types";

const DIFFICULTY_COLORS: Record<string, string> = {
  None:      "bg-muted text-muted-foreground border-muted-foreground/20",
  Easy:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  Medium:    "bg-amber-100 text-amber-700 border-amber-200",
  Hard:      "bg-red-100 text-red-700 border-red-200",
  "Very Hard": "bg-rose-200 text-rose-800 border-rose-300",
};

const DIFFICULTY_STARS: Record<string, number> = {
  None:      0,
  Easy:      1,
  Medium:    2,
  Hard:      3,
  "Very Hard": 4,
};

const STAR_COLORS: Record<string, string> = {
  None:      "text-muted-foreground/30",
  Easy:      "text-emerald-500",
  Medium:    "text-amber-500",
  Hard:      "text-orange-600",
  "Very Hard": "text-red-700",
};

function DifficultyStars({ difficulty }: { difficulty?: string | null }) {
  const stars = difficulty ? DIFFICULTY_STARS[difficulty] ?? 0 : 0;
  const color = difficulty ? STAR_COLORS[difficulty] ?? "text-muted-foreground/30" : "text-muted-foreground/30";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <span key={i} className={i <= stars ? color : "text-muted-foreground/20"}>
          ★
        </span>
      ))}
    </div>
  );
}
const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "text-blue-600",
  Physics:     "text-purple-600",
  Chemistry:   "text-green-600",
};
const PAPER_COLORS: Record<string, string> = {
  P1: "bg-emerald-100 text-emerald-700",
  P2: "bg-amber-100 text-amber-700",
};

const QUESTION_TYPES = [
  {
    code: "SCQ",
    label: "Single Correct",
    desc: "4 options, exactly one correct. Key is pipe-separated alternates (any one accepted). Negative marking applies.",
    answer: "A / B / C / D  or  A|B for alternates",
    marks: "+marks",
    neg: "−neg",
    partial: "—",
  },
  {
    code: "INT",
    label: "Integer Type",
    desc: "Answer is a single digit 0–9. Key is pipe-separated alternates (any one accepted). Negative marking applies.",
    answer: "0 – 9  or  1|2 for alternates",
    marks: "+marks",
    neg: "−neg",
    partial: "—",
  },
  {
    code: "DECIMAL",
    label: "Decimal / Range",
    desc: "Answer is a decimal value. Key is a colon-separated range e.g. 3.14:3.15 — answer must fall within bounds. Negative marking applies.",
    answer: "e.g. 3.14  (key: 3.14:3.15)",
    marks: "+marks",
    neg: "−neg",
    partial: "—",
  },
  {
    code: "MCQ",
    label: "Multiple Correct",
    desc: "4 options, one or more correct. Full match → full marks. Any wrong option selected → negative. Correct subset only → partial marks per correct option chosen.",
    answer: "e.g. ACD or 134 (no separator)",
    marks: "+marks",
    neg: "−neg",
    partial: "+partial × n",
  },
] as const;


function QuestionTypeGuide() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ml-1 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[480px] p-0">
        <div className="px-4 py-3 border-b">
          <p className="font-semibold text-sm">Question Type Reference</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Use these codes in the <code className="bg-muted px-1 rounded">question_type</code> column of your Excel upload.
          </p>
        </div>
        <div className="divide-y">
          {QUESTION_TYPES.map(qt => (
            <div key={qt.code} className="px-4 py-2.5 flex items-start gap-3">
              <code className="mt-0.5 shrink-0 text-[11px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded w-14 text-center">
                {qt.code}
              </code>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{qt.label}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{qt.desc}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-medium">
                  <span className="text-muted-foreground">Answer: <span className="text-foreground font-mono">{qt.answer}</span></span>
                  <span className="text-emerald-600">Marks: {qt.marks}</span>
                  <span className="text-red-600">Neg: {qt.neg}</span>
                  {qt.partial !== "—" && <span className="text-amber-600">Partial: {qt.partial}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 bg-muted/40 border-t">
          <p className="text-[10px] text-muted-foreground">
            Values are indicative — actual marks/negative marking come from the <code className="bg-muted px-1 rounded">marks</code> and <code className="bg-muted px-1 rounded">negative_marks</code> columns in your sheet.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const SUBJECTS = ["Mathematics", "Physics", "Chemistry"] as const;
const DIFFICULTIES = ["None", "Easy", "Medium", "Hard", "Very Hard"] as const;
const QT_CODES = QUESTION_TYPES.map(qt => qt.code);
const NONE = "_none_"; // sentinel for Radix Select "no selection"

interface EditDialogProps {
  question: ExamQuestion;
  examId: number;
  examStatus: ExamStatus;
  onClose: () => void;
}

function ExamQuestionEditDialog({ question: q, examId, examStatus, onClose }: EditDialogProps) {
  const qc = useQueryClient();
  const isPublished  = examStatus === "published";
  const isCompleted  = examStatus === "completed";
  const isLocked     = isPublished || isCompleted;
  const fullyLocked  = isCompleted;

  const [subject, setSubject]           = useState(q.subject);
  const [topic, setTopic]               = useState(q.topic ?? "");
  const [subTopic, setSubTopic]         = useState(q.sub_topic ?? "");
  const [difficulty, setDifficulty]     = useState(q.difficulty ?? NONE);
  const [questionType, setQuestionType] = useState(q.question_type ?? NONE);
  const isMCQ = questionType === "MCQ";
  const [marks, setMarks]               = useState(q.marks != null ? String(q.marks) : "");
  const [negMarks, setNegMarks]         = useState(q.negative_marks != null ? String(q.negative_marks) : "");
  const [answer, setAnswer]             = useState(q.bkc ?? "");
  const [partial, setPartial]           = useState(q.partial_marks != null ? String(q.partial_marks) : "");
  const [isDeleted, setIsDeleted]       = useState(q.is_deleted);
  const [isBonus, setIsBonus]           = useState(q.is_bonus);
  const [akc, setAkc]                  = useState(q.akc ?? "");
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender                   = useRef(true);

  const toFloat = (v: string) => v.trim() === "" ? null : parseFloat(v);
  const fromSel = (v: string) => v === NONE ? null : v;

  const buildPayload = useCallback(() =>
    isPublished
      ? { akc: akc.trim() || null, is_deleted: isDeleted, is_bonus: isBonus }
      : {
          subject,
          topic: topic.trim() || null,
          sub_topic: subTopic.trim() || null,
          difficulty: fromSel(difficulty),
          question_type: fromSel(questionType),
          marks: toFloat(marks),
          negative_marks: toFloat(negMarks),
          bkc: answer.trim() || null,
          partial_marks: fromSel(questionType) === "MCQ" ? toFloat(partial) : null,
          is_deleted: isDeleted,
          is_bonus: isBonus,
          akc: akc.trim() || null,
        },
  [isPublished, akc, isDeleted, isBonus, subject, topic, subTopic, difficulty, questionType, marks, negMarks, answer, partial]);

  const save = useMutation({
    mutationFn: () => updateExamQuestion(examId, q.id, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      setSaveStatus("saved");
    },
    onError: (err: any) => {
      setSaveStatus("error");
      toast({ title: err?.response?.data?.detail ?? "Auto-save failed", variant: "destructive" });
    },
  });

  // Auto-save on any field change, debounced 800 ms
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (fullyLocked) return;
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { save.mutate(); }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [subject, topic, subTopic, difficulty, questionType, marks, negMarks, answer, partial, isDeleted, isBonus, akc]);

  const answerHint: Record<string, string> = {
    SCQ:     "e.g. A  or  A|B for alternates",
    INT:     "e.g. 5  or  1|2 for alternates",
    DECIMAL: "e.g. 3.14:3.15 (range) or 3.14 (exact)",
    MCQ:     "e.g. ACD or 134 (no separator needed)",
  };
  const bkcHint = questionType !== NONE ? answerHint[questionType] : "Select a question type first";

  return (
    <Sheet open onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] flex flex-col p-0 gap-0">

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <SheetTitle className="flex items-center gap-2.5">
            <span>Edit Question</span>
            <span className="font-mono text-sm bg-background border px-2 py-0.5 rounded text-muted-foreground">#{q.qno}</span>
            {q.subject && (
              <span className={`text-xs font-semibold ${SUBJECT_COLORS[q.subject] ?? "text-foreground"}`}>{q.subject}</span>
            )}
          </SheetTitle>
          {isLocked && (
            <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium mt-1 ${
              fullyLocked
                ? "bg-slate-100 text-slate-600 border border-slate-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {fullyLocked
                ? "Exam is completed — all editing is disabled."
                : "Exam is published — only AKC and Flags can be edited."}
            </div>
          )}
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Classification ─────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Classification</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select value={subject} onValueChange={setSubject} disabled={isLocked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {DIFFICULTIES.map(d => d !== "None" && (
                      <SelectItem key={d} value={d}>
                        <span className="flex items-center gap-1.5">
                          {d}
                          <span className="inline-flex gap-0.5">
                            {Array.from({ length: DIFFICULTY_STARS[d] ?? 0 }, (_, i) => (
                              <span key={i} className={STAR_COLORS[d]}>★</span>
                            ))}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Question Type</Label>
                <Select value={questionType} onValueChange={v => { setQuestionType(v); if (v !== "MCQ") setPartial(""); }} disabled={isLocked}>
                  <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {QT_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <Input placeholder="e.g. Limits" value={topic} onChange={e => setTopic(e.target.value)} disabled={isLocked} />
              </div>
              <div className="space-y-1.5">
                <Label>Sub-topic</Label>
                <Input placeholder="e.g. L'Hôpital" value={subTopic} onChange={e => setSubTopic(e.target.value)} disabled={isLocked} />
              </div>
            </div>
          </section>

          <div className="border-t" />

          {/* ── Scoring ────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Scoring</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Marks</Label>
                <Input type="number" placeholder="4" value={marks} onChange={e => setMarks(e.target.value)} disabled={isLocked} />
              </div>
              <div className="space-y-1.5">
                <Label>Negative Marks</Label>
                <Input type="number" placeholder="1" value={negMarks} onChange={e => setNegMarks(e.target.value)} disabled={isLocked} />
              </div>
              <div className="space-y-1.5">
                <Label className={!isMCQ ? "text-muted-foreground" : undefined}>
                  Partial Marks
                  {isMCQ && <span className="ml-1 text-[10px] text-amber-600 font-normal">per option</span>}
                </Label>
                <Input
                  type="number"
                  placeholder={isMCQ ? "e.g. 1" : "MCQ only"}
                  value={partial}
                  onChange={e => setPartial(e.target.value)}
                  disabled={isLocked || !isMCQ}
                  className={!isMCQ ? "opacity-40 cursor-not-allowed bg-muted" : undefined}
                />
              </div>
            </div>
            {isMCQ && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                Partial applies only when a correct subset is selected with <strong>no wrong options</strong>. Score = partial × number of correct options chosen.
              </p>
            )}
          </section>

          <div className="border-t" />

          {/* ── Answer Keys ────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Answer Keys</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  BKC
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">Before Key Change</span>
                </Label>
                <Input
                  placeholder={bkcHint}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  disabled={isLocked}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={isPublished ? "text-emerald-700 font-semibold" : undefined}>
                  AKC
                  <span className={`ml-1.5 text-[10px] font-normal ${isPublished ? "text-emerald-600" : "text-muted-foreground"}`}>
                    After Key Change
                  </span>
                  {isPublished && <span className="ml-1.5 text-[10px] font-normal bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Editable</span>}
                </Label>
                <Input
                  placeholder={bkcHint}
                  value={akc}
                  onChange={e => setAkc(e.target.value)}
                  disabled={fullyLocked}
                  className={`font-mono ${isPublished ? "border-emerald-300 focus:border-emerald-500" : ""}`}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              AKC overrides BKC during scoring. Leave AKC blank if the original key is correct.
            </p>
          </section>

          <div className="border-t" />

          {/* ── Status ─────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status</p>
            <div className="space-y-2">
              {/* Bonus */}
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                isDeleted || fullyLocked ? "opacity-50 cursor-not-allowed" :
                (isBonus && !isDeleted) ? "bg-amber-50 border-amber-300" : "hover:bg-muted/40"
              }`}>
                <input
                  type="checkbox"
                  checked={isBonus && !isDeleted}
                  disabled={isDeleted || fullyLocked}
                  onChange={e => setIsBonus(isDeleted ? false : e.target.checked)}
                  className="mt-0.5 accent-amber-500"
                />
                <div>
                  <p className="text-sm font-medium leading-none">⭐ Bonus</p>
                  <p className="text-[11px] text-muted-foreground mt-1">All students receive full marks regardless of their answer.</p>
                </div>
              </label>
              {/* Deleted */}
              <label className={`flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                fullyLocked ? "opacity-50 cursor-not-allowed" :
                isDeleted ? "bg-red-50 border-red-300" : "hover:bg-muted/40"
              }`}>
                <input
                  type="checkbox"
                  checked={isDeleted}
                  disabled={fullyLocked}
                  onChange={e => { setIsDeleted(e.target.checked); if (e.target.checked) setIsBonus(false); }}
                  className="mt-0.5 accent-red-500"
                />
                <div>
                  <p className="text-sm font-medium leading-none">✕ Deleted</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Question is excluded from scoring and hidden by default.</p>
                </div>
              </label>
            </div>
          </section>

        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t px-6 py-4 flex items-center justify-between gap-2 bg-background">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {saveStatus === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
            {saveStatus === "saved"  && <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Saved</>}
            {saveStatus === "error"  && <><AlertCircle className="h-3 w-3 text-destructive" /> Save failed</>}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => save.mutate()} disabled={!subject || save.isPending || fullyLocked}>
              {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}

function UploadResultDialog({ result, onClose }: { result: UploadResult; onClose: () => void }) {
  const hasErrors = result.errors.length > 0;
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors
              ? <><AlertCircle className="h-5 w-5 text-destructive" /> Upload Failed</>
              : <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Upload Complete</>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {hasErrors ? (
            <>
              <p className="text-sm text-muted-foreground">
                <strong className="text-destructive">{result.errors.length} error{result.errors.length !== 1 ? "s" : ""}</strong> found — nothing was saved. Fix the issues below and re-upload.
              </p>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 divide-y divide-destructive/10 max-h-64 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2">
                    <span className="mt-0.5 text-destructive/60 text-[10px] font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <p className="text-[11px] text-destructive/80 leading-snug">{e}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 py-4">
                  <p className="text-3xl font-bold text-emerald-600">{result.created}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Created</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 py-4">
                  <p className="text-3xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-xs text-blue-700 font-medium mt-1">Updated</p>
                </div>
                <div className="rounded-lg bg-muted border py-4">
                  <p className="text-3xl font-bold text-muted-foreground">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-1">Skipped</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {result.skipped > 0 ? `${result.skipped} blank row(s) were ignored.` : "All rows processed successfully."}
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant={hasErrors ? "destructive" : "default"}>
            {hasErrors ? "Close & Fix" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExamQuestionsPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const id = Number(examId);

  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [editTarget, setEditTarget] = useState<ExamQuestion | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const clearMut = useMutation({
    mutationFn: () => clearExamQuestions(id),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["exam-questions", id] });
      qc.invalidateQueries({ queryKey: ["exams"] });
      toast({ title: `${res.data?.deleted ?? 0} question(s) deleted` });
      setConfirmClear(false);
    },
    onError: (err: any) => {
      toast({ title: err?.response?.data?.detail ?? "Clear failed", variant: "destructive" });
      setConfirmClear(false);
    },
  });

  const { data: allExams = [] } = useQuery({
    queryKey: ["exams"],
    queryFn: () => getExams().then(r => r.data),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => getPrograms().then(r => r.data),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => getClasses().then(r => r.data),
  });

  const exam = allExams.find(e => e.id === id);
  const examStatus: ExamStatus = exam?.status ?? "draft";
  const isDraft     = examStatus === "draft";
  const isPublished = examStatus === "published";
  const isCompleted = examStatus === "completed";

  const { data: questions = [], isLoading } = useQuery<ExamQuestion[]>({
    queryKey: ["exam-questions", id],
    queryFn: () => getExamQuestions(id, { include_deleted: true }).then(r => r.data),
    enabled: !!id,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadExamQuestionTemplate(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam_${id}_questions_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const res = await uploadExamQuestionsExcel(id, file);
      qc.invalidateQueries({ queryKey: ["exam-questions", id] }); // invalidates all showDeleted variants
      setUploadResult(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed";
      toast({ title: "Upload error", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const prog  = exam ? programs.find(p => p.id === exam.program_id) : null;
  const cls   = exam ? classes.find(c => c.id === exam.class_id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/exams")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">
                {exam ? (
                  <code className="font-mono">{exam.exam_code}</code>
                ) : "Exam Questions"}
              </h2>
              {exam && (
                <>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAPER_COLORS[exam.paper] ?? "bg-sky-100 text-sky-700"}`}>
                    {exam.paper}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {prog?.name} · {cls?.name}
                  </span>
                  {exam.exam_date && (
                    <span className="text-sm text-muted-foreground">
                      · {new Date(exam.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {questions.length} question{questions.length !== 1 ? "s" : ""} configured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          {isDraft && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} title="Download blank Excel template">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="ml-1.5">Template</span>
              </Button>
              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                title="Upload filled Excel file"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                <span className="ml-1.5">{uploading ? "Uploading…" : "Upload Excel"}</span>
              </Button>
              {questions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={clearMut.isPending}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  {clearMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="ml-1.5">Clear</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      {exam && !isDraft && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
          isCompleted
            ? "bg-slate-100 text-slate-600 border border-slate-300"
            : "bg-amber-50 text-amber-700 border border-amber-300"
        }`}>
          <Lock className="h-4 w-4 shrink-0" />
          {isCompleted
            ? "This exam is completed. All question editing is disabled."
            : "This exam is published. Only AKC and Flags (Bonus / Deleted) can be edited per question. Upload and question management are disabled."}
        </div>
      )}

      {/* Combined Exam & Questions Summary */}
      {exam && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 space-y-4">
            {/* Exam Details Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Exam Code</p>
                <p className="text-sm font-bold font-mono mt-1">{exam.exam_code}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Exam Type</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${exam.exam_type === "Mains" ? "bg-blue-200 text-blue-800" : "bg-violet-200 text-violet-800"}`}>
                    {exam.exam_type}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${exam.paper === "P1" ? "bg-sky-200 text-sky-800" : "bg-amber-200 text-amber-800"}`}>
                    {exam.paper}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Program & Class</p>
                <p className="text-sm font-semibold mt-1">{prog?.name} • {cls?.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Exam Date</p>
                <p className="text-sm font-semibold mt-1">
                  {exam.exam_date
                    ? new Date(exam.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-blue-200 dark:border-blue-800"></div>

            {/* Questions Summary Row */}
            {questions.length > 0 && (() => {
              const activeQuestions = questions.filter(q => !q.is_deleted && !q.is_bonus);
              const activeMarks = activeQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
              const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
              const deletedCount = questions.filter(q => q.is_deleted).length;
              const bonusCount = questions.filter(q => q.is_bonus).length;
              const akcCount = questions.filter(q => q.akc).length;

              // Difficulty breakdown (active questions only)
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
              const avgScore = ratedCount > 0 ? weightedSum / ratedCount : 0;
              const diffLabel = avgScore === 0 ? "N/A" : avgScore < 1.5 ? "Easy" : avgScore < 2.5 ? "Medium" : avgScore < 3.5 ? "Hard" : "Very Hard";
              const diffBarColor = { Easy: "bg-emerald-400", Medium: "bg-amber-400", Hard: "bg-orange-500", "Very Hard": "bg-red-600", "N/A": "bg-muted" }[diffLabel];
              const diffPct = avgScore / 4;

              return (
                <div className="space-y-3">
                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-3 text-[12px]">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{questions.length}</span>
                      <span className="text-muted-foreground">Qs</span>
                    </div>
                    <div className="text-muted-foreground/30">|</div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{totalMarks}</span>
                      <span className="text-muted-foreground">Total Marks</span>
                    </div>
                    <div className="text-muted-foreground/30">|</div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-emerald-600">{activeMarks}</span>
                      <span className="text-emerald-600/70">Active Marks</span>
                    </div>
                    <div className="text-muted-foreground/30">|</div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-red-600">{deletedCount}</span>
                      <span className="text-red-600/70">Deleted</span>
                    </div>
                    <div className="text-muted-foreground/30">|</div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-amber-600">{bonusCount}</span>
                      <span className="text-amber-600/70">Bonus</span>
                    </div>
                    <div className="text-muted-foreground/30">|</div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-emerald-600">{akcCount}</span>
                      <span className="text-emerald-600/70">AKC</span>
                    </div>
                    {(exam?.mas_mathematics != null || exam?.mas_physics != null || exam?.mas_chemistry != null) && (
                      <>
                        <div className="text-muted-foreground/30">|</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">MAS</span>
                          {exam?.mas_mathematics != null && (
                            <span className="rounded px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                              Math {exam.mas_mathematics}
                            </span>
                          )}
                          {exam?.mas_physics != null && (
                            <span className="rounded px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-[10px] font-semibold text-purple-700">
                              Phy {exam.mas_physics}
                            </span>
                          )}
                          {exam?.mas_chemistry != null && (
                            <span className="rounded px-1.5 py-0.5 bg-green-50 border border-green-200 text-[10px] font-semibold text-green-700">
                              Chem {exam.mas_chemistry}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Difficulty analytics */}
                  <div className="rounded-lg border border-blue-200 bg-white px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overall Paper Difficulty</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4].map(i => (
                                  <span
                                    key={i}
                                    className={i <= avgScore ? (avgScore < 1.5 ? "text-emerald-500" : avgScore < 2.5 ? "text-amber-500" : avgScore < 3.5 ? "text-orange-600" : "text-red-700") : "text-muted-foreground/20"}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent side="bottom" align="start" className="w-80 p-3">
                            <div className="space-y-2 text-xs">
                              <p className="font-semibold">Difficulty Calculation</p>
                              <p className="text-muted-foreground">
                                Weighted average of rated questions (Easy=1, Medium=2, Hard=3, Very Hard=4):
                              </p>
                              <div className="bg-muted/30 rounded p-2 font-mono text-[10px] space-y-1">
                                <div>({Object.entries(diffCounts).filter(([_, c]) => c > 0).map(([d, c]) => `${d.substring(0, 3)}=${diffWeights[d]} ×${c}`).join(" + ")}) ÷ {ratedCount} = <strong>{avgScore.toFixed(2)}</strong></div>
                              </div>
                              <p className="text-muted-foreground mt-2">
                                {ratedCount} of {activeQuestions.length} active questions have difficulty set.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                        <span className="text-[10px] text-muted-foreground">({ratedCount}/{activeQuestions.length} rated)</span>
                      </div>
                      <div className="flex items-center gap-6 text-[11px]">
                        <div className="flex items-center gap-3">
                          {Object.entries(diffCounts).map(([d, c]) => c > 0 && (
                            <span key={d} className={`font-semibold ${STAR_COLORS[d]}`}>
                              {d[0]}{d === "Very Hard" ? "H" : ""}: {c}
                            </span>
                          ))}
                        </div>

                        {/* Subject-wise difficulty */}
                        <div className="flex items-center gap-4 pl-4 border-l border-muted-foreground/20">
                          {(() => {
                            const subjectDiff: Record<string, { sum: number; count: number; avg: number }> = {};
                            activeQuestions.forEach(q => {
                              const s = q.subject;
                              if (!(s in subjectDiff)) subjectDiff[s] = { sum: 0, count: 0, avg: 0 };
                              const d = q.difficulty;
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
                            return Object.entries(subjectDiff).map(([subject, data]) => (
                              <div key={subject} className="flex items-center gap-2">
                                <span className={`font-semibold ${SUBJECT_COLORS[subject] ?? "text-foreground"}`}>
                                  {subject}
                                </span>
                                {data.count > 0 ? (
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
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/40 italic">—</span>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                    {/* Per-difficulty stacked breakdown */}
                    {ratedCount > 0 && (
                      <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
                        {[
                          { d: "Easy", color: "bg-emerald-400" },
                          { d: "Medium", color: "bg-amber-400" },
                          { d: "Hard", color: "bg-orange-500" },
                          { d: "Very Hard", color: "bg-red-600" },
                        ].map(({ d, color }) => diffCounts[d] > 0 && (
                          <div
                            key={d}
                            title={`${d}: ${diffCounts[d]}`}
                            className={`${color} h-full`}
                            style={{ width: `${(diffCounts[d] / ratedCount) * 100}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpenCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No questions configured</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Download the template and upload an Excel file to add questions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b bg-muted/30 h-8">
                    <th className="text-left px-2 py-1 font-semibold text-muted-foreground w-8">#</th>
                    <th className="text-left px-2 py-1 font-semibold text-muted-foreground w-32">Topic › Sub-topic</th>
                    <th className="text-left px-2 py-1 font-semibold text-muted-foreground w-12">Level</th>
                    <th className="text-left px-2 py-1 font-semibold text-muted-foreground w-10">
                      <span className="inline-flex items-center gap-0.5">Type <QuestionTypeGuide /></span>
                    </th>
                    <th className="text-center px-2 py-1 font-semibold text-muted-foreground w-8">✓+</th>
                    <th className="text-center px-2 py-1 font-semibold text-muted-foreground w-8">✕−</th>
                    <th className="text-center px-2 py-1 font-semibold text-muted-foreground w-8" title="Partial Marks">◐</th>
                    <th className="text-left px-2 py-1 font-semibold text-muted-foreground w-16" title="Before Key Change"><Key className="h-4 w-4 inline" /></th>
                    <th className="text-left px-2 py-1 font-semibold w-16" title="After Key Change"><Key className="h-4 w-4 inline text-emerald-600" /></th>
                    <th className="text-center px-2 py-1 font-semibold text-muted-foreground w-6" title="Status"><Flag className="h-4 w-4 inline" /></th>
                    <th className="px-1 py-1 w-7" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {questions.map(q => (
                    <tr key={q.id} className={`hover:bg-muted/20 transition-colors h-7 ${q.is_deleted ? "opacity-50 bg-red-50/30" : q.is_bonus ? "bg-amber-50/40" : ""}`}>
                      <td className="px-2 py-1 text-left text-[11px]">
                        <span className="font-mono font-semibold text-muted-foreground">{q.qno}</span>
                      </td>
                      <td className="px-2 py-1 text-left text-[11px] truncate">
                        <span className={`font-semibold ${SUBJECT_COLORS[q.subject] ?? "text-foreground"}`}>
                          {q.topic ? `${q.topic}${q.sub_topic ? ` › ${q.sub_topic}` : ""}` : <span className="italic text-muted-foreground/40">—</span>}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-left text-[11px]">
                        <DifficultyStars difficulty={q.difficulty} />
                      </td>
                      <td className="px-2 py-1 text-left text-[11px]">
                        {q.question_type
                          ? <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0">{q.question_type}</Badge>
                          : <span className="text-[11px] text-muted-foreground/40 italic">—</span>}
                      </td>
                      <td className="px-2 py-1 text-center text-[11px] font-semibold">
                        {q.marks ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-2 py-1 text-center text-[11px] text-red-600">
                        {q.negative_marks != null && q.negative_marks > 0 ? `-${q.negative_marks}` : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-2 py-1 text-center text-[11px] font-semibold">
                        {q.partial_marks ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-2 py-1 text-left text-[11px] truncate">
                        {q.bkc
                          ? <code className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded">{q.bkc}</code>
                          : <span className="text-[11px] text-muted-foreground/40 italic">—</span>}
                      </td>
                      <td className="px-2 py-1 text-left text-[11px] truncate">
                        {q.akc ? <code className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded border border-emerald-200">{q.akc}</code> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-2 py-1 text-center text-[11px]">
                        <div className="flex items-center justify-center gap-0.5">
                          {q.is_bonus && (
                            <span title="Bonus" className="inline-flex items-center rounded border px-1 py-0 text-[9px] font-semibold bg-amber-100 text-amber-700 border-amber-200">
                              ⭐
                            </span>
                          )}
                          {q.is_deleted && (
                            <span title="Deleted" className="inline-flex items-center rounded border px-1 py-0 text-[9px] font-semibold bg-red-100 text-red-700 border-red-200">
                              ✕
                            </span>
                          )}
                          {!q.is_bonus && !q.is_deleted && (
                            <span className="text-[11px] text-muted-foreground/30">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-1 py-1">
                        {!isCompleted && (
                          <Button
                            variant="ghost" size="icon"
                            className={`h-6 w-6 ${isPublished ? "text-emerald-500 hover:text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                            onClick={() => setEditTarget(q)}
                            title={isPublished ? "Edit AKC" : "Edit question"}
                          >
                            {isPublished ? <Key className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Clear Paper"
        description={`Delete all ${questions.length} question(s) from this paper? This cannot be undone.`}
        onConfirm={() => clearMut.mutate()}
        onCancel={() => setConfirmClear(false)}
      />

      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}

      {editTarget && (
        <ExamQuestionEditDialog
          question={editTarget}
          examId={id}
          examStatus={examStatus}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
