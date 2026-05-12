import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, BookOpenCheck, Info, ChevronDown, ChevronUp, Pencil, Key, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/hooks/use-toast";
import { getExams, getPrograms, getClasses, getExamQuestions, updateExamQuestion, downloadExamQuestionTemplate, uploadExamQuestionsExcel } from "@/lib/api";
import type { ExamQuestion, UploadResult } from "@/types";

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
    label: "Single Correct (MCQ)",
    desc: "4 options, exactly one correct answer. Standard JEE Mains format.",
    answer: "A / B / C / D",
    marks: "+4",
    neg: "−1",
    partial: "—",
  },
  {
    code: "MCQ",
    label: "Multiple Correct (MSQ)",
    desc: "4 options, one or more correct. Full marks only if all correct choices selected.",
    answer: "e.g. ABD",
    marks: "+4",
    neg: "−2",
    partial: "+1 to +3",
  },
  {
    code: "INT",
    label: "Integer Type",
    desc: "Answer is a non-negative integer 0–9 (single digit). No negative marking.",
    answer: "0 – 9",
    marks: "+4",
    neg: "0",
    partial: "—",
  },
  {
    code: "NUM",
    label: "Numerical Answer (NAT)",
    desc: "Answer is a decimal / real number up to 2 decimal places. No negative marking.",
    answer: "e.g. 3.14",
    marks: "+4",
    neg: "0",
    partial: "—",
  },
  {
    code: "NR",
    label: "Numerical Range",
    desc: "Answer is correct if it falls within a specified [min, max] range. Bounds can be integers or decimals. Store as \"min-max\" (e.g. 2.45-2.55) or a single decimal if the accepted window is a single value (e.g. 3.00). No negative marking.",
    answer: "e.g. 2.45-2.55 or 3.00",
    marks: "+4",
    neg: "0",
    partial: "—",
  },
  {
    code: "ALT",
    label: "Multiple Alternates",
    desc: "Two or more values, ranges, or combinations are each individually correct — any one earns full marks. Works with letters, integers, decimals, or ranges. Store all separated by pipe.",
    answer: "e.g. A|B, 2|−2, 3.14|3.15, 2.5-2.7|3.8-4.0",
    marks: "+4",
    neg: "0",
    partial: "—",
  },
] as const;

const FIELD_REFERENCE = [
  { col: "qno",           req: true,  type: "Number",  example: "1, 2, 3 …",       note: "Unique question number within this exam paper. Used as the upsert key — re-uploading the same qno updates the row." },
  { col: "subject",       req: true,  type: "Text",    example: "Mathematics",      note: "Must be exactly one of: Mathematics, Physics, Chemistry (case-sensitive)." },
  { col: "topic",         req: false, type: "Text",    example: "Limits",           note: "Chapter or unit name. Leave blank if not applicable." },
  { col: "sub_topic",     req: false, type: "Text",    example: "L'Hôpital's Rule", note: "Sub-chapter or concept within the topic." },
  { col: "difficulty",    req: false, type: "Text",    example: "Medium",           note: "None / Easy / Medium / Hard / Very Hard. Drives analytics colour-coding." },
  { col: "question_type", req: false, type: "Code",    example: "SCQ",              note: "Question format code (SCQ, MCQ, INT, NUM, NR, ALT). See type reference below." },
  { col: "marks",         req: false, type: "Number",  example: "4",                note: "Full marks awarded for a completely correct answer." },
  { col: "negative_marks",req: false, type: "Number",  example: "1",                note: "Enter as a positive number (e.g. 1 means −1 is applied). Leave 0 or blank for no penalty." },
  { col: "bkc",          req: false, type: "Text",    example: "A or A|B|C",       note: "Before Key Change (BKC). The official answer before any correction. Format depends on question_type — see type reference below. For ALT, use pipe-separated values (e.g. A|B|C)." },
  { col: "partial_marks", req: false, type: "Number",  example: "2",                note: "Marks per correct option for MCQ type. Leave blank for types that don't award partial credit." },
  { col: "is_deleted",    req: false, type: "Boolean", example: "FALSE",            note: "Set TRUE to soft-delete a question. Hidden by default — use the 'Show Deleted' toggle on screen to reveal them." },
  { col: "is_bonus",     req: false, type: "Boolean", example: "FALSE",            note: "Set TRUE to mark a question as bonus — all students receive full marks regardless of their answer. Shown with an amber Bonus badge." },
  { col: "akc",          req: false, type: "Text",    example: "B or C|D",         note: "After Key Change (AKC). The revised answer if the official key was corrected. Use same format as BKC. Leave blank if no change." },
];

function InstructionsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-sm text-blue-900">How to configure exam questions</span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-blue-500" />
          : <ChevronDown className="h-4 w-4 text-blue-500" />}
      </button>

      {open && (
        <CardContent className="px-5 pt-0 pb-5 space-y-6">

          {/* ── Step-by-step workflow ── */}
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">Workflow</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: "1", title: "Download Template", body: "Click the Template button in the top-right. An Excel file pre-filled with the correct column headers will be downloaded." },
                { step: "2", title: "Fill in the Sheet",  body: "Add one row per question. Fill qno, subject, and other fields as described below. Save the file as .xlsx." },
                { step: "3", title: "Upload Excel",       body: "Click Upload Excel and select your filled file. Existing rows with the same qno will be updated; new qno values will be created." },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3 rounded-lg border border-blue-200 bg-white px-4 py-3">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">{s.step}</span>
                  <div>
                    <p className="text-xs font-semibold text-blue-900">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Field reference ── */}
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">Excel Column Reference</p>
            <div className="rounded-lg border border-blue-200 overflow-hidden bg-white">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-blue-100/60 border-b border-blue-200">
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-36">Column</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-16">Required</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-20">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-32">Example</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {FIELD_REFERENCE.map(f => (
                    <tr key={f.col} className="hover:bg-blue-50/40">
                      <td className="px-3 py-2">
                        <code className="font-mono font-semibold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">{f.col}</code>
                      </td>
                      <td className="px-3 py-2">
                        {f.req
                          ? <span className="text-emerald-700 font-semibold">Yes</span>
                          : <span className="text-muted-foreground">Optional</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{f.type}</td>
                      <td className="px-3 py-2">
                        <code className="font-mono text-foreground">{f.example}</code>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground leading-snug">{f.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Question type reference ── */}
          <div>
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">Question Type Codes</p>
            <div className="rounded-lg border border-blue-200 overflow-hidden bg-white">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-blue-100/60 border-b border-blue-200">
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-16">Code</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-44">Name</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900">Description</th>
                    <th className="text-left px-3 py-2 font-semibold text-blue-900 w-36">bkc format</th>
                    <th className="text-center px-3 py-2 font-semibold text-blue-900 w-14">Marks</th>
                    <th className="text-center px-3 py-2 font-semibold text-blue-900 w-14">Neg.</th>
                    <th className="text-center px-3 py-2 font-semibold text-blue-900 w-20">Partial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {QUESTION_TYPES.map(qt => (
                    <tr key={qt.code} className="hover:bg-blue-50/40">
                      <td className="px-3 py-2">
                        <code className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">{qt.code}</code>
                      </td>
                      <td className="px-3 py-2 font-medium">{qt.label}</td>
                      <td className="px-3 py-2 text-muted-foreground leading-snug">{qt.desc}</td>
                      <td className="px-3 py-2">
                        <code className="font-mono text-foreground">{qt.answer}</code>
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-700 font-semibold">{qt.marks}</td>
                      <td className="px-3 py-2 text-center text-red-600 font-semibold">{qt.neg}</td>
                      <td className="px-3 py-2 text-center text-amber-600 font-semibold">{qt.partial}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              * Marks / negative values above are indicative defaults. The actual values applied during scoring come from the <code className="bg-muted px-1 rounded">marks</code> and <code className="bg-muted px-1 rounded">negative_marks</code> columns in your sheet.
            </p>
          </div>

        </CardContent>
      )}
    </Card>
  );
}

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
  onClose: () => void;
}

function ExamQuestionEditDialog({ question: q, examId, onClose }: EditDialogProps) {
  const qc = useQueryClient();

  const [subject, setSubject]           = useState(q.subject);
  const [topic, setTopic]               = useState(q.topic ?? "");
  const [subTopic, setSubTopic]         = useState(q.sub_topic ?? "");
  const [difficulty, setDifficulty]     = useState(q.difficulty ?? NONE);
  const [questionType, setQuestionType] = useState(q.question_type ?? NONE);
  const [marks, setMarks]               = useState(q.marks != null ? String(q.marks) : "");
  const [negMarks, setNegMarks]         = useState(q.negative_marks != null ? String(q.negative_marks) : "");
  const [answer, setAnswer]             = useState(q.bkc ?? "");
  const [partial, setPartial]           = useState(q.partial_marks != null ? String(q.partial_marks) : "");
  const [isDeleted, setIsDeleted]       = useState(q.is_deleted);
  const [isBonus, setIsBonus]           = useState(q.is_bonus);
  const [akc, setAkc]                  = useState(q.akc ?? "");

  const toFloat = (v: string) => v.trim() === "" ? null : parseFloat(v);
  const fromSel = (v: string) => v === NONE ? null : v;

  const save = useMutation({
    mutationFn: () =>
      updateExamQuestion(examId, q.id, {
        subject,
        topic: topic.trim() || null,
        sub_topic: subTopic.trim() || null,
        difficulty: fromSel(difficulty),
        question_type: fromSel(questionType),
        marks: toFloat(marks),
        negative_marks: toFloat(negMarks),
        bkc: answer.trim() || null,
        partial_marks: toFloat(partial),
        is_deleted: isDeleted,
        is_bonus: isBonus,
        akc: akc.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam-questions", examId] });
      toast({ title: `Q${q.qno} updated` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: err?.response?.data?.detail ?? "Update failed", variant: "destructive" });
    },
  });

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Question <span className="font-mono text-muted-foreground">#{q.qno}</span></DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">

          {/* Subject */}
          <div className="space-y-1.5">
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Topic / Sub-topic */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Input placeholder="e.g. Limits" value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sub-topic</Label>
              <Input placeholder="e.g. L'Hôpital" value={subTopic} onChange={e => setSubTopic(e.target.value)} />
            </div>
          </div>

          {/* Difficulty / Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {DIFFICULTIES.map(d => d !== "None" && <SelectItem key={d} value={d}>{d} <span className="ml-2 inline-flex gap-0.5">{Array.from({length: DIFFICULTY_STARS[d] ?? 0}, (_, i) => <span key={i} className={STAR_COLORS[d]}>★</span>)}</span></SelectItem>)}
                </SelectContent>
              </Select>
              {difficulty !== NONE && <div className="text-sm flex gap-1 mt-1"><DifficultyStars difficulty={difficulty} /></div>}
            </div>
            <div className="space-y-1.5">
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {QT_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Marks / Negative / Partial */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Marks</Label>
              <Input type="number" placeholder="4" value={marks} onChange={e => setMarks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Negative Marks</Label>
              <Input type="number" placeholder="1" value={negMarks} onChange={e => setNegMarks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Partial Marks</Label>
              <Input type="number" placeholder="0" value={partial} onChange={e => setPartial(e.target.value)} />
            </div>
          </div>

          {/* Correct Answer */}
          <div className="space-y-1.5">
            <Label>Correct Answer</Label>
            <Input placeholder="e.g. A, ABD, 12, 2.45-2.55" value={answer} onChange={e => setAnswer(e.target.value)} />
          </div>

          {/* Answer Key Change (AKC) */}
          <div className="space-y-1.5">
            <Label>Answer Key Change (AKC)</Label>
            <Input placeholder="e.g. B, 3, 2.5, C|D" value={akc} onChange={e => setAkc(e.target.value)} />
            <p className="text-[10px] text-muted-foreground">The revised answer after official key correction (if different from bkc above).</p>
          </div>

          {/* Flags */}
          <div className="space-y-3">
            <Label>Flags</Label>
            <div className="flex items-center gap-3">
              <Toggle
                pressed={isBonus && !isDeleted}
                onPressedChange={(v) => setIsBonus(isDeleted ? false : v)}
                disabled={isDeleted}
                className="flex-1 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700"
              >
                ⭐ Bonus
              </Toggle>
              <Toggle
                pressed={isDeleted}
                onPressedChange={(v) => {
                  setIsDeleted(v);
                  if (v) setIsBonus(false);
                }}
                className="flex-1 data-[state=on]:bg-red-100 data-[state=on]:text-red-700"
              >
                ✕ Deleted
              </Toggle>
            </div>
            {isDeleted && <p className="text-[10px] text-muted-foreground">Bonus is disabled for deleted questions</p>}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!subject || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadResultDialog({ result, onClose }: { result: UploadResult; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload Complete</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 py-3">
              <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Created</p>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 py-3">
              <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
              <p className="text-xs text-blue-700 font-medium mt-0.5">Updated</p>
            </div>
            <div className="rounded-lg bg-muted border py-3">
              <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Skipped</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-1 max-h-52 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11px] text-destructive/80 leading-snug">{e}</li>
                ))}
              </ul>
            </div>
          )}
          {result.errors.length === 0 && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> All rows processed successfully
            </p>
          )}
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
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
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Template
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Upload Excel
          </Button>
        </div>
      </div>

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
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditTarget(q)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}

      {editTarget && (
        <ExamQuestionEditDialog
          question={editTarget}
          examId={id}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
