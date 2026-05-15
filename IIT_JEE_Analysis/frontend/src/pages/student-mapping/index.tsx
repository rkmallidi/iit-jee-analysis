import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, Search, X, Edit, Save, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  getAcademicYears, getStudents, getBranches,
  downloadSectionTemplate, uploadSectionExcel, updateStudent,
  getBranchSections, assignStudentSection, removeStudentSection,
  createStudent,
} from "@/lib/api";
import type { Branch, Student, UploadResult, RankCategory, BranchSection } from "@/types";

// ── Helper to organize sections for cascading dropdowns ──────────────────────
function getAvailableBranches(branchSections: BranchSection[]) {
  const branches = new Set<number>();
  branchSections.forEach(bs => {
    if (bs.branch_id) branches.add(bs.branch_id);
  });
  return Array.from(branches);
}

function getAvailablePrograms(branchSections: BranchSection[], branchId: number | null) {
  if (!branchId) return [];
  const programs = new Set<number>();
  branchSections.forEach(bs => {
    if (bs.branch_id === branchId && bs.program_id) programs.add(bs.program_id);
  });
  return Array.from(programs);
}

function getAvailableClasses(branchSections: BranchSection[], branchId: number | null, programId: number | null) {
  if (!branchId || !programId) return [];
  const classes = new Set<number>();
  branchSections.forEach(bs => {
    if (bs.branch_id === branchId && bs.program_id === programId && bs.class_id) classes.add(bs.class_id);
  });
  return Array.from(classes);
}

function getAvailableSections(branchSections: BranchSection[], branchId: number | null, programId: number | null, classId: number | null) {
  if (!branchId || !programId || !classId) return [];
  return branchSections.filter(bs =>
    bs.branch_id === branchId && bs.program_id === programId && bs.class_id === classId
  );
}

// ── Edit student modal ────────────────────────────────────────────────────────
function EditStudentModal({ student, onClose, onSave }: { student: Student; onClose: () => void; onSave: (data: any) => Promise<any> }) {
  const { selectedYear } = useAcademicYearStore();
  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone ?? "");
  const [rankCategory, setRankCategory] = useState<string>(student.rank_category || "none");
  const [isActive, setIsActive] = useState(student.is_active);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    student.section_mapping?.branch_section?.branch_id?.toString() || ""
  );
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    student.section_mapping?.branch_section?.program_id?.toString() || ""
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    student.section_mapping?.branch_section?.class_id?.toString() || ""
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    student.section_mapping?.branch_section_id?.toString() || ""
  );
  const [saving, setSaving] = useState(false);

  const RANK_CATEGORIES: RankCategory[] = ["Top 10", "Top 100", "Top 1000", "Top 10000", "Qualifier"];

  const { data: branchSections = [] } = useQuery<BranchSection[]>({
    queryKey: ["branch-sections", selectedYear?.id],
    queryFn: () => getBranchSections({ academic_year_id: selectedYear?.id }).then(r => r.data),
    enabled: !!selectedYear?.id,
  });

  const currentSection = student.section_mapping?.branch_section;

  // Build unique lists for each dropdown
  const branchIds = getAvailableBranches(branchSections);
  const programIds = getAvailablePrograms(branchSections, selectedBranchId ? +selectedBranchId : null);
  const classIds = getAvailableClasses(branchSections, selectedBranchId ? +selectedBranchId : null, selectedProgramId ? +selectedProgramId : null);
  const sectionOptions = getAvailableSections(branchSections, selectedBranchId ? +selectedBranchId : null, selectedProgramId ? +selectedProgramId : null, selectedClassId ? +selectedClassId : null);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const newBranchSectionId = selectedSectionId ? parseInt(selectedSectionId) : null;
      const oldBranchSectionId = student.section_mapping?.branch_section_id;

      await onSave({
        name: name.trim(),
        phone: phone.trim() || null,
        rank_category: rankCategory === "none" ? null : rankCategory,
        is_active: isActive,
        section_update: {
          old_section_id: oldBranchSectionId,
          new_section_id: newBranchSectionId,
        },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Student Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="admno" className="text-sm font-medium">Admission No</label>
            <Input id="admno" value={student.admission_no} disabled className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">Name *</label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="phone" className="text-sm font-medium">Phone</label>
            <Input
              id="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="rank" className="text-sm font-medium">Rank Category</label>
            <Select value={rankCategory} onValueChange={setRankCategory}>
              <SelectTrigger id="rank">
                <SelectValue placeholder="Select rank category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Top 10">Top 10</SelectItem>
                <SelectItem value="Top 100">Top 100</SelectItem>
                <SelectItem value="Top 1000">Top 1000</SelectItem>
                <SelectItem value="Top 10000">Top 10000</SelectItem>
                <SelectItem value="Qualifier">Qualifier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Section Assignment</p>
            {currentSection && (
              <p className="text-xs text-muted-foreground">
                Current: {currentSection.branch?.name} • {currentSection.program?.name} • {currentSection.class_?.name} • {currentSection.section?.name}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <label htmlFor="branch" className="text-xs font-medium text-muted-foreground">Branch</label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="branch" className="h-8 text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {branchIds.map(id => {
                      const branch = branchSections.find(bs => bs.branch_id === id)?.branch;
                      return branch ? (
                        <SelectItem key={id} value={id.toString()}>{branch.name}</SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="program" className="text-xs font-medium text-muted-foreground">Program</label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId} disabled={!selectedBranchId}>
                  <SelectTrigger id="program" className="h-8 text-xs">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {programIds.map(id => {
                      const program = branchSections.find(bs => bs.program_id === id)?.program;
                      return program ? (
                        <SelectItem key={id} value={id.toString()}>{program.name}</SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="class" className="text-xs font-medium text-muted-foreground">Class</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedProgramId}>
                  <SelectTrigger id="class" className="h-8 text-xs">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {classIds.map(id => {
                      const cls = branchSections.find(bs => bs.class_id === id)?.class_;
                      return cls ? (
                        <SelectItem key={id} value={id.toString()}>{cls.name}</SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="sec" className="text-xs font-medium text-muted-foreground">Section</label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId}>
                  <SelectTrigger id="sec" className="h-8 text-xs">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {sectionOptions.map(bs => (
                      <SelectItem key={bs.id} value={bs.id.toString()}>{bs.section?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Active
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add student modal ─────────────────────────────────────────────────────────
function AddStudentModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<any> }) {
  const { selectedYear } = useAcademicYearStore();
  const [admissionNo, setAdmissionNo] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: branchSections = [] } = useQuery({
    queryKey: ["branch-sections", selectedYear?.id],
    queryFn: () => getBranchSections({ academic_year_id: selectedYear?.id }).then(r => r.data),
    enabled: !!selectedYear?.id,
  });

  // Build unique lists for each dropdown
  const branchIds = getAvailableBranches(branchSections);
  const programIds = getAvailablePrograms(branchSections, selectedBranchId ? +selectedBranchId : null);
  const classIds = getAvailableClasses(branchSections, selectedBranchId ? +selectedBranchId : null, selectedProgramId ? +selectedProgramId : null);
  const sectionOptions = getAvailableSections(branchSections, selectedBranchId ? +selectedBranchId : null, selectedProgramId ? +selectedProgramId : null, selectedClassId ? +selectedClassId : null);

  const handleSave = async () => {
    if (!admissionNo.trim() || !name.trim()) {
      toast({ title: "Admission No and Name are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        admission_no: admissionNo.trim(),
        name: name.trim(),
        phone: phone.trim() || null,
        branch_section_id: selectedSectionId ? parseInt(selectedSectionId) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="adm" className="text-sm font-medium">Admission No *</label>
            <Input
              id="adm"
              value={admissionNo}
              onChange={e => setAdmissionNo(e.target.value)}
              placeholder="e.g., 7050729"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="nm" className="text-sm font-medium">Name *</label>
            <Input
              id="nm"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full student name"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="ph" className="text-sm font-medium">Phone</label>
            <Input
              id="ph"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 9876543210"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Section Assignment</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <label htmlFor="ab" className="text-xs font-medium text-muted-foreground">Branch</label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="ab" className="h-8 text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {branchIds.map(id => {
                      const branch = branchSections.find(bs => bs.branch_id === id)?.branch;
                      return branch ? (
                        <SelectItem key={id} value={id.toString()}>{branch.name}</SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="ap" className="text-xs font-medium text-muted-foreground">Program</label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId} disabled={!selectedBranchId}>
                  <SelectTrigger id="ap" className="h-8 text-xs">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {programIds.map(id => {
                      const program = branchSections.find(bs => bs.program_id === id)?.program;
                      return program ? (
                        <SelectItem key={id} value={id.toString()}>{program.name}</SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="ac" className="text-xs font-medium text-muted-foreground">Class</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedProgramId}>
                  <SelectTrigger id="ac" className="h-8 text-xs">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {classIds.map(id => {
                      const cls = branchSections.find(bs => bs.class_id === id)?.class_;
                      return cls ? (
                        <SelectItem key={id} value={id.toString()}>{cls.name}</SelectItem>
                      ) : null;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <label htmlFor="as" className="text-xs font-medium text-muted-foreground">Section</label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId}>
                  <SelectTrigger id="as" className="h-8 text-xs">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Clear</SelectItem>
                    {sectionOptions.map(bs => (
                      <SelectItem key={bs.id} value={bs.id.toString()}>{bs.section?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Upload result dialog ───────────────────────────────────────────────────────
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
                {result.errors.length} validation error{result.errors.length !== 1 ? "s" : ""}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentMappingPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

  const [search, setSearch] = useState("");
  const [filterBranchId, setFilterBranchId] = useState<string>("__all__");
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);

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

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => getBranches().then(r => r.data),
  });

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students", yearId],
    queryFn: () => getStudents({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: any) => {
      const { section_update, ...studentData } = data;

      // Update student details
      await updateStudent(editingStudent!.id, studentData);

      // Handle section reassignment if needed
      if (section_update && selectedYear) {
        const { old_section_id, new_section_id } = section_update;
        const sectionChanged = old_section_id !== new_section_id;

        if (sectionChanged) {
          // Remove old assignment if it exists
          if (old_section_id) {
            try {
              await removeStudentSection(editingStudent!.id, selectedYear.id);
            } catch (e) {
              console.error("Error removing old section", e);
            }
          }

          // Assign new section if selected
          if (new_section_id) {
            await assignStudentSection(editingStudent!.id, new_section_id, selectedYear.id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", yearId] });
      toast({ title: "Student updated successfully" });
      setEditingStudent(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail ?? "Error updating student";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: any) => {
      const { branch_section_id, ...studentData } = data;

      // Create student
      const student = await createStudent(studentData);

      // Assign section if provided and year is selected
      if (branch_section_id && selectedYear) {
        await assignStudentSection(student.data.id, branch_section_id, selectedYear.id);
      }

      return student.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", yearId] });
      toast({ title: "Student created successfully" });
      setAddingStudent(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail ?? "Error creating student";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const getRankCategoryColor = (category: RankCategory | null | undefined) => {
    if (!category) return null;
    const colorMap: Record<RankCategory, string> = {
      "Top 10": "bg-red-100 text-red-700 border-red-200",
      "Top 100": "bg-orange-100 text-orange-700 border-orange-200",
      "Top 1000": "bg-amber-100 text-amber-700 border-amber-200",
      "Top 10000": "bg-yellow-100 text-yellow-700 border-yellow-200",
      "Qualifier": "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return colorMap[category];
  };

  // Only students that have a section assignment for this year
  const assigned = students.filter(s => s.section_mapping);

  const filtered = assigned.filter(s => {
    const bs = s.section_mapping?.branch_section;
    if (filterBranchId !== "__all__" && bs?.branch_id !== +filterBranchId) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.admission_no.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q)
      );
    }
    return true;
  });

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await downloadSectionTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_section_template.xlsx";
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
    if (!yearId) {
      toast({ title: "Select an academic year first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadSectionExcel(file, yearId);
      qc.invalidateQueries({ queryKey: ["students", yearId] });
      setUploadResult(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed";
      toast({ title: "Upload error", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Student Section Mapping</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage student section assignments per academic year.
          </p>
        </div>
        <Select
          value={selectedYear ? String(selectedYear.id) : ""}
          onValueChange={v => {
            const yr = years.find(y => y.id === +v);
            if (yr) setSelectedYear(yr);
          }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y.id} value={String(y.id)}>
                {y.name}{y.is_current ? " ★" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        <Button variant="outline" onClick={handleDownloadTemplate} disabled={downloading}>
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Template
        </Button>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !yearId}
          title={!yearId ? "Select a year first" : undefined}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Upload Excel
        </Button>
        <Button
          onClick={() => setAddingStudent(true)}
          disabled={!yearId}
          title={!yearId ? "Select a year first" : undefined}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {/* Branch filter */}
          <Select value={filterBranchId} onValueChange={setFilterBranchId}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-52 h-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {yearId && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {assigned.length} student{assigned.length !== 1 ? "s" : ""} assigned
          {filterBranchId !== "__all__" || search ? ` · ${filtered.length} shown` : ""}
          {selectedYear && <span className="ml-2 text-muted-foreground/60">— {selectedYear.name}</span>}
        </p>
      )}

      {/* No year selected */}
      {!yearId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium text-muted-foreground">Select an academic year to view assignments</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {yearId && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No assignments found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Upload an Excel file to assign students to sections.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground whitespace-nowrap">Adm. No</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Rank</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Section Assignment</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(s => {
                      const bs = s.section_mapping?.branch_section;
                      const rankColor = getRankCategoryColor(s.rank_category);
                      return (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <code className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded">
                              {s.admission_no}
                            </code>
                          </td>
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {s.phone ?? <span className="italic text-muted-foreground/50">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {s.rank_category ? (
                              <Badge className={`text-[11px] font-semibold border ${rankColor}`}>
                                {s.rank_category}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {bs ? (
                              <div className="flex items-center gap-1 text-xs flex-wrap">
                                <span className="font-medium text-foreground">{bs.branch?.name}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{bs.program?.name}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{bs.class_?.name}</span>
                                <Badge variant="secondary" className="font-mono text-[11px]">{bs.section?.name}</Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingStudent(s)}
                              className="h-7 w-7 p-0"
                              title="Edit student"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={(data) => updateStudentMutation.mutateAsync(data)}
        />
      )}

      {addingStudent && (
        <AddStudentModal
          onClose={() => setAddingStudent(false)}
          onSave={(data) => createStudentMutation.mutateAsync(data)}
        />
      )}
    </div>
  );
}
