import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAcademicYearStore } from "@/store/academicYear";
import * as XLSX from "xlsx";
import {
  Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowDown, ArrowUp, ArrowUpDown,
  Search, X, Pencil, Save, Plus, Star, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  getAcademicYears, getStudentsPage, getBranches,
  downloadSectionTemplate, uploadSectionExcel, updateStudent,
  getBranchSections, assignStudentSection, removeStudentSection,
  createStudent,
} from "@/lib/api";
import type { AcademicYear, Branch, BranchSection, RankCategory, Student, StudentPage, UploadResult } from "@/types";

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
  const [rankCategory, setRankCategory] = useState<string>(student.target_rank || "none");
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
    if (!selectedBranchId || !selectedProgramId || !selectedClassId || !selectedSectionId) {
      toast({ title: "Section assignment is required", description: "Select Branch, Program, Class, and Section.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const newBranchSectionId = selectedSectionId ? parseInt(selectedSectionId) : null;
      const oldBranchSectionId = student.section_mapping?.branch_section_id;

      await onSave({
        name: name.trim(),
        phone: phone.trim() || null,
        target_rank: rankCategory === "none" ? null : rankCategory,
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
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Target Rank</label>
            {(() => {
              const STAR_TIERS = ["Qualifier", "Top 10000", "Top 1000", "Top 100", "Top 10"];
              const activeStars = rankCategory === "none" ? 0 : STAR_TIERS.indexOf(rankCategory) + 1;
              return (
                <div className="flex items-center gap-1">
                  {STAR_TIERS.map((tier, i) => {
                    const starIndex = i + 1;
                    const filled = starIndex <= activeStars;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setRankCategory(activeStars === starIndex ? "none" : tier)}
                        className="p-0.5 rounded transition-transform hover:scale-110 focus:outline-none"
                        title={tier}
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {rankCategory === "none" ? "None" : rankCategory}
                  </span>
                </div>
              );
            })()}
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
                <Select value={selectedBranchId || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setSelectedBranchId(val); setSelectedProgramId(""); setSelectedClassId(""); setSelectedSectionId(""); }}>
                  <SelectTrigger id="branch" className="h-8 text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
                <Select value={selectedProgramId || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setSelectedProgramId(val); setSelectedClassId(""); setSelectedSectionId(""); }} disabled={!selectedBranchId}>
                  <SelectTrigger id="program" className="h-8 text-xs">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
                <Select value={selectedClassId || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setSelectedClassId(val); setSelectedSectionId(""); }} disabled={!selectedProgramId}>
                  <SelectTrigger id="class" className="h-8 text-xs">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
                <Select value={selectedSectionId || "__none__"} onValueChange={v => setSelectedSectionId(v === "__none__" ? "" : v)} disabled={!selectedClassId}>
                  <SelectTrigger id="sec" className="h-8 text-xs">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
              Student Active
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

  const { data: branchSections = [] } = useQuery<BranchSection[]>({
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
    if (!selectedBranchId || !selectedProgramId || !selectedClassId || !selectedSectionId) {
      toast({ title: "Section assignment is required", description: "Select Branch, Program, Class, and Section.", variant: "destructive" });
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
                <Select value={selectedBranchId || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setSelectedBranchId(val); setSelectedProgramId(""); setSelectedClassId(""); setSelectedSectionId(""); }}>
                  <SelectTrigger id="ab" className="h-8 text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
                <Select value={selectedProgramId || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setSelectedProgramId(val); setSelectedClassId(""); setSelectedSectionId(""); }} disabled={!selectedBranchId}>
                  <SelectTrigger id="ap" className="h-8 text-xs">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
                <Select value={selectedClassId || "__none__"} onValueChange={v => { const val = v === "__none__" ? "" : v; setSelectedClassId(val); setSelectedSectionId(""); }} disabled={!selectedProgramId}>
                  <SelectTrigger id="ac" className="h-8 text-xs">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
                <Select value={selectedSectionId || "__none__"} onValueChange={v => setSelectedSectionId(v === "__none__" ? "" : v)} disabled={!selectedClassId}>
                  <SelectTrigger id="as" className="h-8 text-xs">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Clear</SelectItem>
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
type SortField = "admission_no" | "name" | "phone" | "target_rank" | "section_assignment" | "is_active";
type SortDir = "asc" | "desc";

export default function StudentMappingPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterBranchId, setFilterBranchId] = useState<string>("__all__");
  const [filterProgramId, setFilterProgramId] = useState<string>("__all__");
  const [filterClassId, setFilterClassId] = useState<string>("__all__");
  const [sortField, setSortField] = useState<SortField>("admission_no");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: years = [] } = useQuery<AcademicYear[]>({
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

  const { data: filterBranchSections = [] } = useQuery<BranchSection[]>({
    queryKey: ["branch-sections", yearId],
    queryFn: () => getBranchSections({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  const skip = (page - 1) * pageSize;
  const studentPageParams = {
    academic_year_id: yearId,
    branch_id: filterBranchId !== "__all__" ? filterBranchId : undefined,
    program_id: filterProgramId !== "__all__" ? filterProgramId : undefined,
    class_id: filterClassId !== "__all__" ? filterClassId : undefined,
    search: debouncedSearch || undefined,
    skip,
    limit: pageSize,
    sort_field: sortField,
    sort_dir: sortDir,
  };

  const { data: studentPage, isLoading } = useQuery<StudentPage>({
    queryKey: ["students", yearId, page, pageSize, filterBranchId, filterProgramId, filterClassId, debouncedSearch, sortField, sortDir],
    queryFn: () => getStudentsPage(studentPageParams).then(r => r.data),
    enabled: !!yearId,
  });

  const { data: yearTotalPage, isLoading: isTotalLoading } = useQuery<StudentPage>({
    queryKey: ["students", yearId, "mapping-total"],
    queryFn: () => getStudentsPage({
      academic_year_id: yearId,
      skip: 0,
      limit: 1,
    }).then(r => r.data),
    enabled: !!yearId,
  });

  const students = studentPage?.items ?? [];
  const totalStudents = studentPage?.total ?? 0;
  const assignedCount = studentPage?.assigned ?? 0;
  const unassignedCount = studentPage?.unassigned ?? 0;
  const yearTotalStudents = yearTotalPage?.total ?? totalStudents;
  const hasActiveFilters = filterBranchId !== "__all__" || filterProgramId !== "__all__" || filterClassId !== "__all__" || Boolean(search);

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

  // Derive filter options from branchSections (cascading)
  const filterPrograms = filterBranchSections
    .filter(bs => filterBranchId === "__all__" || String(bs.branch_id) === filterBranchId)
    .reduce<{ id: number; name: string }[]>((acc, bs) => {
      if (bs.program_id && bs.program && !acc.find(p => p.id === bs.program_id))
        acc.push({ id: bs.program_id, name: bs.program.name });
      return acc;
    }, []);

  const filterClasses = filterBranchSections
    .filter(bs =>
      (filterBranchId === "__all__" || String(bs.branch_id) === filterBranchId) &&
      (filterProgramId === "__all__" || String(bs.program_id) === filterProgramId)
    )
    .reduce<{ id: number; name: string }[]>((acc, bs) => {
      if (bs.class_id && bs.class_ && !acc.find(c => c.id === bs.class_id))
        acc.push({ id: bs.class_id, name: bs.class_.name });
      return acc;
    }, []);

  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = students;

  useEffect(() => {
    setPage(1);
  }, [search, filterBranchId, filterProgramId, filterClassId, yearId, pageSize, sortField, sortDir]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />;
  };

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

  const handleExportExcel = () => {
    const rows = students.map(s => {
      const bs = s.section_mapping?.branch_section;
      return {
        "Admission No": s.admission_no,
        "Name":         s.name,
        "Phone":        s.phone ?? "",
        "Target Rank":  s.target_rank ?? "",
        "Branch":       bs?.branch?.name ?? "",
        "Program":      bs?.program?.name ?? "",
        "Class":        bs?.class_?.name ?? "",
        "Section":      bs?.section?.name ?? "",
        "Status":       s.is_active ? "Active" : "Inactive",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Mapping");
    const year = selectedYear?.name.replace(/\s+/g, "_") ?? "export";
    XLSX.writeFile(wb, `student_mapping_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: `${rows.length} students from the current page exported to Excel.` });
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

  const paginationBar = (position: "top" | "bottom") => (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm ${position === "bottom" ? "border-t" : "border-b bg-muted/10"}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="h-8 rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {[100, 200, 500].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 text-sm">
        <span className="mr-2 text-muted-foreground">
          {totalStudents === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, totalStudents)} of {totalStudents}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === 1} onClick={() => setPage(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-12 px-2 text-center text-xs text-muted-foreground">
          {safePage}/{totalPages}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Row 1: Title + Year selector ── */}
      <div className="rounded-lg border bg-card px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-[260px]">
            <h2 className="text-lg font-bold leading-tight">Student Section Mapping</h2>
            <p className="text-xs text-muted-foreground">
              Manage student section assignments per academic year.
            </p>
          </div>
          {yearId && (
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total Students
                </p>
                <p className="text-xl font-bold leading-tight">
                  {isTotalLoading ? "..." : yearTotalStudents.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 grid items-center gap-3 border-t pt-2 lg:grid-cols-[minmax(200px,260px),1fr]">
          <div>
            <Select
              value={selectedYear ? String(selectedYear.id) : ""}
              onValueChange={v => {
                const yr = years.find(y => y.id === +v);
                if (yr) setSelectedYear(yr);
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y.id} value={String(y.id)}>
                    {y.name}{y.is_current ? " *" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate} disabled={downloading}>
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Template
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !yearId}
                title={!yearId ? "Select a year first" : undefined}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                Upload Excel
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportExcel} disabled={students.length === 0}>
                <Download className="mr-2 h-4 w-4 text-emerald-600" />
                Export Excel
              </Button>
              <Button
                size="sm"
                onClick={() => setAddingStudent(true)}
                disabled={!yearId}
                title={!yearId ? "Select a year first" : undefined}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Actions left · Filters right ── */}

      <div className="rounded-lg border bg-card/80 px-3 py-2.5">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />

        <div className="flex items-center justify-between gap-3 border-b pb-2">
          <div>
            <p className="text-sm font-semibold leading-tight">Filters</p>
            <p className="text-[11px] text-muted-foreground">Branch, program, class, or search</p>
          </div>
          {yearId && !isLoading && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded border bg-background px-2 py-0.5 font-medium text-muted-foreground">
                {assignedCount.toLocaleString("en-IN")} assigned
              </span>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                {unassignedCount.toLocaleString("en-IN")} unassigned
              </span>
              {hasActiveFilters && (
                <span className="rounded border bg-background px-2 py-0.5 font-medium text-muted-foreground">
                  {totalStudents.toLocaleString("en-IN")} matching
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr,1fr,1fr,1.4fr]">
          <div>
            <Select value={filterBranchId} onValueChange={v => { setFilterBranchId(v); setFilterProgramId("__all__"); setFilterClassId("__all__"); }}>
              <SelectTrigger className="h-9 w-full min-w-[170px]">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterProgramId} onValueChange={v => { setFilterProgramId(v); setFilterClassId("__all__"); }} disabled={filterPrograms.length === 0}>
              <SelectTrigger className="h-9 w-full min-w-[170px]">
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All programs</SelectItem>
                {filterPrograms.map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterClassId} onValueChange={setFilterClassId} disabled={filterClasses.length === 0}>
              <SelectTrigger className="h-9 w-full min-w-[170px]">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All classes</SelectItem>
                {filterClasses.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="relative w-full min-w-[210px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
              placeholder="Search student…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 w-full pl-9 pr-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
          {!isLoading && totalStudents > 0 && paginationBar("top")}
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No students found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Upload an Excel file or add students manually.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                        <button className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("admission_no")}>
                          Adm. No <SortIcon field="admission_no" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>
                          Name <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("phone")}>
                          Phone <SortIcon field="phone" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("target_rank")}>
                          Target Rank <SortIcon field="target_rank" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("section_assignment")}>
                          Section Assignment <SortIcon field="section_assignment" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button className="inline-flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("is_active")}>
                          Status <SortIcon field="is_active" />
                        </button>
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginated.map(s => {
                      const bs = s.section_mapping?.branch_section;
                      const STAR_TIERS = ["Qualifier", "Top 10000", "Top 1000", "Top 100", "Top 10"];
                      const stars = s.target_rank ? STAR_TIERS.indexOf(s.target_rank) + 1 : 0;
                      return (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <code className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded">{s.admission_no}</code>
                          </td>
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {s.phone ?? <span className="italic text-muted-foreground/50">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-0.5" title={s.target_rank ?? "No target rank"}>
                              {STAR_TIERS.map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                              ))}
                            </div>
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
                              <Badge className="text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">Unassigned</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${s.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button size="icon" variant="ghost" onClick={() => setEditingStudent(s)} className="h-8 w-8 text-foreground hover:text-primary" title="Edit student">
                              <Pencil className="h-4 w-4" />
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
          {!isLoading && totalStudents > 0 && paginationBar("bottom")}
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
