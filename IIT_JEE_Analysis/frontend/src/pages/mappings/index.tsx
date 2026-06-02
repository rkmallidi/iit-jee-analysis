import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  School, Eye, Plus, Trash2, ChevronDown, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, Search, X, Phone, Mail, Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import {
  getBranches, getPrograms, getClasses, getSections, getUsers,
  getDeanBranches, assignDeanBranch, removeDeanBranch,
  getPrincipalBranches, assignPrincipalBranch, removePrincipalBranch,
  getVicePrincipalBranches, assignVicePrincipalBranch, removeVicePrincipalBranch,
  getOperatorBranches, assignOperatorBranch, removeOperatorBranch,
  getBranchPrograms, assignBranchProgram, removeBranchProgram,
  getBranchSections, createBranchSection, deleteBranchSection,
  getFacultySections, assignFacultySection, removeFacultySection,
  getFacultyOverview, getProgramOverview, getBranchOverview,
  addFacultySubject, removeFacultySubject,
  getAcademicYears, getStudents,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { BranchSection, FacultySubject, Student, SubjectName } from "@/types";

type Tab = "dashboard" | "overview";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Branch Dashboard", icon: School },
  { id: "overview", label: "Overview", icon: Eye },
];

// ---------- Main Page ----------
export default function MappingsPage() {
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  // Auto-select current year on first load
  useEffect(() => {
    if (!selectedYear && years.length > 0) {
      const current = years.find(y => y.is_current) ?? years[0];
      setSelectedYear(current);
    }
  }, [years, selectedYear, setSelectedYear]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Branch Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure branch programs, section slots, and faculty assignments.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
        <Select
          value={selectedYear ? String(selectedYear.id) : ""}
          onValueChange={v => {
            const yr = years.find(y => y.id === +v);
            if (yr) setSelectedYear(yr);
          }}
        >
          <SelectTrigger className="h-10 w-[140px]">
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
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-all ${
                  activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "dashboard" && <BranchDashboardTab />}
      {activeTab === "overview" && <OverviewTab />}
    </div>
  );
}

// ---------- Branch Dashboard ----------
function BranchDashboardTab() {
  const qc = useQueryClient();
  const { selectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [addingSlot, setAddingSlot] = useState<Record<number, { programId: string; classId: string; sectionId: string }>>({});
  const [addingDean, setAddingDean] = useState<Record<number, string>>({});
  const [addingPrincipal, setAddingPrincipal] = useState<Record<number, string>>({});
  const [addingVicePrincipal, setAddingVicePrincipal] = useState<Record<number, string>>({});
  const [addingOperator, setAddingOperator] = useState<Record<number, string>>({});
  const [pendingAction, setPendingAction] = useState<{ fn: () => void; title: string; description: string } | null>(null);
  const [studentViewBs, setStudentViewBs] = useState<BranchSection | null>(null);

  const STALE = 60_000; // 1 min — static reference data changes rarely
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => getBranches().then(r => r.data), staleTime: STALE });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: () => getPrograms().then(r => r.data), staleTime: STALE });
  const { data: classes = [] }  = useQuery({ queryKey: ["classes"],  queryFn: () => getClasses().then(r => r.data),  staleTime: STALE });
  const { data: sections = [] } = useQuery({ queryKey: ["sections"], queryFn: () => getSections().then(r => r.data), staleTime: STALE });
  const { data: users = [] }    = useQuery({ queryKey: ["users"],    queryFn: () => getUsers().then(r => r.data),    staleTime: STALE });
  const { data: bsections = [] } = useQuery({
    queryKey: ["branch-sections", yearId],
    queryFn: () => getBranchSections({ academic_year_id: yearId }).then(r => r.data),
    staleTime: STALE,
  });
  const { data: branchPrograms = [] } = useQuery({
    queryKey: ["branch-programs", yearId],
    queryFn: () => getBranchPrograms({ academic_year_id: yearId }).then(r => r.data),
    staleTime: STALE,
  });
  const { data: deanMaps = [] }          = useQuery({ queryKey: ["dean-branches"],           queryFn: () => getDeanBranches().then(r => r.data),          staleTime: STALE });
  const { data: principalMaps = [] }     = useQuery({ queryKey: ["principal-branches"],      queryFn: () => getPrincipalBranches().then(r => r.data),     staleTime: STALE });
  const { data: vicePrincipalMaps = [] } = useQuery({ queryKey: ["vice-principal-branches"], queryFn: () => getVicePrincipalBranches().then(r => r.data), staleTime: STALE });
  const { data: operatorMaps = [] }      = useQuery({ queryKey: ["operator-branches"],       queryFn: () => getOperatorBranches().then(r => r.data),      staleTime: STALE });
  const { data: facultyMaps = [] }       = useQuery({ queryKey: ["faculty-sections"],        queryFn: () => getFacultySections().then(r => r.data),       staleTime: STALE });
  const { data: students = [] } = useQuery({
    queryKey: ["students", yearId],
    queryFn: () => getStudents({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
    staleTime: STALE,
  });

  // --- Pre-compute lookup Maps once per data change (eliminates O(n²) .filter() in render) ---
  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const studentCountByBsId = useMemo(() => students.reduce<Record<number, number>>((acc, s) => {
    const bsId = s.section_mapping?.branch_section_id;
    if (bsId) acc[bsId] = (acc[bsId] ?? 0) + 1;
    return acc;
  }, {}), [students]);

  const studentCountByBranchId = useMemo(() => bsections.reduce<Record<number, number>>((acc, bs) => {
    acc[bs.branch_id] = (acc[bs.branch_id] ?? 0) + (studentCountByBsId[bs.id] ?? 0);
    return acc;
  }, {}), [bsections, studentCountByBsId]);

  // Group bsections by branch_id once, not per-branch in render
  const bsectionsByBranch = useMemo(() => bsections.reduce<Record<number, BranchSection[]>>((acc, bs) => {
    (acc[bs.branch_id] ??= []).push(bs);
    return acc;
  }, {}), [bsections]);

  // Map dean/principal/vp/operator maps by branch_id for O(1) lookup
  const deansByBranch    = useMemo(() => deanMaps.reduce<Record<number, typeof deanMaps>>((acc, d) => { (acc[d.branch_id] ??= []).push(d); return acc; }, {}), [deanMaps]);
  const principalsByBranch = useMemo(() => principalMaps.reduce<Record<number, typeof principalMaps>>((acc, p) => { (acc[p.branch_id] ??= []).push(p); return acc; }, {}), [principalMaps]);
  const vpByBranch       = useMemo(() => vicePrincipalMaps.reduce<Record<number, typeof vicePrincipalMaps>>((acc, v) => { (acc[v.branch_id] ??= []).push(v); return acc; }, {}), [vicePrincipalMaps]);
  const operatorsByBranch = useMemo(() => operatorMaps.reduce<Record<number, typeof operatorMaps>>((acc, o) => { (acc[o.branch_id] ??= []).push(o); return acc; }, {}), [operatorMaps]);

  // Faculty maps grouped by branch_section_id for O(1) subject-row lookup
  const facultyByBsId = useMemo(() => facultyMaps.reduce<Record<number, typeof facultyMaps>>((acc, fm) => {
    (acc[fm.branch_section_id] ??= []).push(fm);
    return acc;
  }, {}), [facultyMaps]);

  // Branch programs grouped by branch_id
  const bpByBranch = useMemo(() => branchPrograms.reduce<Record<number, typeof branchPrograms>>((acc, bp) => {
    (acc[bp.branch_id] ??= []).push(bp);
    return acc;
  }, {}), [branchPrograms]);

  const addBranchProgram = useMutation({
    mutationFn: ({ branchId, programId }: { branchId: number; programId: number }) =>
      assignBranchProgram(yearId!, branchId, programId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branch-programs", yearId] }); toast({ title: "Program added to branch" }); },
    onError: () => toast({ title: "Error adding program", variant: "destructive" }),
  });
  const dropBranchProgram = useMutation({
    mutationFn: (id: number) => removeBranchProgram(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branch-programs", yearId] }); toast({ title: "Program removed from branch" }); },
    onError: () => toast({ title: "Error removing program", variant: "destructive" }),
  });

  const assignDean = useMutation({
    mutationFn: ({ userId, branchId }: { userId: number; branchId: number }) => assignDeanBranch(userId, branchId),
    onSuccess: (_d, { branchId }) => {
      qc.invalidateQueries({ queryKey: ["dean-branches"] });
      setAddingDean(p => ({ ...p, [branchId]: "" }));
      toast({ title: "Dean assigned" });
    },
    onError: () => toast({ title: "Error assigning dean", variant: "destructive" }),
  });
  const removeDean = useMutation({
    mutationFn: (id: number) => removeDeanBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dean-branches"] }); toast({ title: "Dean removed" }); },
  });
  const assignPrincipal = useMutation({
    mutationFn: ({ userId, branchId }: { userId: number; branchId: number }) => assignPrincipalBranch(userId, branchId),
    onSuccess: (_d, { branchId }) => {
      qc.invalidateQueries({ queryKey: ["principal-branches"] });
      setAddingPrincipal(p => ({ ...p, [branchId]: "" }));
      toast({ title: "Principal assigned" });
    },
    onError: () => toast({ title: "Error assigning principal", variant: "destructive" }),
  });
  const removePrincipal = useMutation({
    mutationFn: (id: number) => removePrincipalBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["principal-branches"] }); toast({ title: "Principal removed" }); },
  });
  const assignVicePrincipal = useMutation({
    mutationFn: ({ userId, branchId }: { userId: number; branchId: number }) => assignVicePrincipalBranch(userId, branchId),
    onSuccess: (_d, { branchId }) => {
      qc.invalidateQueries({ queryKey: ["vice-principal-branches"] });
      setAddingVicePrincipal(p => ({ ...p, [branchId]: "" }));
      toast({ title: "Vice-Principal assigned" });
    },
    onError: () => toast({ title: "Error assigning vice-principal", variant: "destructive" }),
  });
  const removeVicePrincipal = useMutation({
    mutationFn: (id: number) => removeVicePrincipalBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vice-principal-branches"] }); toast({ title: "Vice-Principal removed" }); },
  });
  const assignOperator = useMutation({
    mutationFn: ({ userId, branchId }: { userId: number; branchId: number }) => assignOperatorBranch(userId, branchId),
    onSuccess: (_d, { branchId }) => {
      qc.invalidateQueries({ queryKey: ["operator-branches"] });
      setAddingOperator(p => ({ ...p, [branchId]: "" }));
      toast({ title: "Operator assigned" });
    },
    onError: () => toast({ title: "Error assigning operator", variant: "destructive" }),
  });
  const removeOperator = useMutation({
    mutationFn: (id: number) => removeOperatorBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["operator-branches"] }); toast({ title: "Operator removed" }); },
  });
  const createSlot = useMutation({
    mutationFn: (branchId: number) => {
      const f = addingSlot[branchId];
      return createBranchSection({
        academic_year_id: yearId,
        branch_id: branchId,
        program_id: +f.programId,
        class_id: +f.classId,
        section_id: +f.sectionId,
      });
    },
    onSuccess: (_d, branchId) => {
      qc.invalidateQueries({ queryKey: ["branch-sections", yearId] });
      setAddingSlot(p => ({ ...p, [branchId]: { programId: "", classId: "", sectionId: "" } }));
      toast({ title: "Section slot created" });
    },
    onError: () => toast({ title: "Slot already exists or error", variant: "destructive" }),
  });
  const deleteSlot = useMutation({
    mutationFn: (id: number) => deleteBranchSection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branch-sections", yearId] }); toast({ title: "Slot removed" }); },
  });
  const assignFaculty = useMutation({
    mutationFn: ({ userId, bsId, subject }: { userId: number; bsId: number; subject: SubjectName }) =>
      assignFacultySection(userId, bsId, subject),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculty-sections"] }); toast({ title: "Faculty assigned" }); },
    onError: () => toast({ title: "Error assigning faculty", variant: "destructive" }),
  });
  const removeFaculty = useMutation({
    mutationFn: (id: number) => removeFacultySection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculty-sections"] }); toast({ title: "Faculty removed" }); },
  });

  const deans        = useMemo(() => users.filter(u => u.roles.some(r => r.name === "Dean")),           [users]);
  const principals   = useMemo(() => users.filter(u => u.roles.some(r => r.name === "Principal")),      [users]);
  const vicePrincipals = useMemo(() => users.filter(u => u.roles.some(r => r.name === "Vice-Principal")), [users]);
  const operators    = useMemo(() => users.filter(u => u.roles.some(r => r.name === "Operator")),       [users]);
  const faculty      = useMemo(() => users.filter(u => u.roles.some(r => r.name === "Faculty")),        [users]);

  const SUBJECTS: SubjectName[] = ["Mathematics", "Physics", "Chemistry"];
  const totalSlots = bsections.length;

  // Compute staffed slot IDs once — O(facultyMaps) instead of O(slots × faculty) per render
  const staffedSlotIds = useMemo(() => {
    const subjsByBsId: Record<number, Set<string>> = {};
    for (const fm of facultyMaps) {
      (subjsByBsId[fm.branch_section_id] ??= new Set()).add(fm.subject);
    }
    return new Set(
      Object.entries(subjsByBsId)
        .filter(([, subjs]) => SUBJECTS.every(s => subjs.has(s)))
        .map(([id]) => +id)
    );
  }, [facultyMaps]);

  const isFullyStaffedSlot = useCallback((bsId: number) => staffedSlotIds.has(bsId), [staffedSlotIds]);
  const staffedSlots = staffedSlotIds.size;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? branches.filter(b => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)) : branches;
  }, [branches, search]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {!yearId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 font-medium">
          No academic year selected — switch year in the sidebar to view year-specific data.
        </div>
      )}
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Branches", value: branches.length, cls: "text-blue-600" },
          { label: "Section Slots", value: totalSlots, cls: "text-violet-600" },
          { label: "Total Students", value: Object.values(studentCountByBsId).reduce((a, b) => a + b, 0), cls: "text-sky-600" },
          { label: "Staffed Slots", value: staffedSlots, cls: "text-emerald-600" },
          { label: "Unstaffed", value: totalSlots - staffedSlots, cls: totalSlots > staffedSlots ? "text-amber-600" : "text-muted-foreground" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter branches…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Branch cards */}
      <div className="space-y-3">
        {filtered.map(branch => {
          const isExpanded = expanded.has(branch.id);
          const branchSlots = bsectionsByBranch[branch.id] ?? [];
          const branchDeans = deansByBranch[branch.id] ?? [];
          const branchPrincipals = principalsByBranch[branch.id] ?? [];
          const branchVicePrincipals = vpByBranch[branch.id] ?? [];
          const branchOperators = operatorsByBranch[branch.id] ?? [];
          const staffedCount = branchSlots.filter(bs => staffedSlotIds.has(bs.id)).length;
          const slotForm = addingSlot[branch.id] ?? { programId: "", classId: "", sectionId: "" };

          // Group: programId → classId → slots[]
          const grouped = branchSlots.reduce<Record<number, Record<number, BranchSection[]>>>((acc, bs) => {
            if (!acc[bs.program_id]) acc[bs.program_id] = {};
            if (!acc[bs.program_id][bs.class_id]) acc[bs.program_id][bs.class_id] = [];
            acc[bs.program_id][bs.class_id].push(bs);
            return acc;
          }, {});

          const assignedDeanIds = new Set(branchDeans.map(d => d.user_id));
          const assignedPrincipalIds = new Set(branchPrincipals.map(p => p.user_id));
          const availableDeans = deans.filter(u => !assignedDeanIds.has(u.id));
          const availablePrincipals = principals.filter(u => !assignedPrincipalIds.has(u.id));
          const isFullyStaffed = branchSlots.length > 0 && staffedCount === branchSlots.length;

          const assignedBranchPrograms = bpByBranch[branch.id] ?? [];
          const assignedProgramIds = new Set(assignedBranchPrograms.map(bp => bp.program_id));
          const availablePrograms = programs.filter(p => !assignedProgramIds.has(p.id));
          const slotPrograms = programs.filter(p => assignedProgramIds.has(p.id));


          return (
            <Card key={branch.id} className={`overflow-hidden ${!branch.is_active ? "opacity-60" : ""}`}>
              {/* Header */}
              <button className="w-full text-left" onClick={() => toggleExpand(branch.id)}>
                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <div className="inline-flex h-8 max-w-[96px] shrink-0 items-center justify-center rounded-md bg-primary/10 px-2 text-primary font-bold text-[11px]">
                    <span className="truncate">{branch.code}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{branch.name}</p>
                      {!branch.is_active && <Badge variant="secondary" className="text-[10px] py-0">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {branchDeans.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <span className="text-muted-foreground/60 font-semibold">Dean</span>
                          {branchDeans.map(d => {
                            const u = userById.get(d.user_id);
                            return <span key={d.id} className="text-violet-700 font-medium">{u?.full_name ?? `#${d.user_id}`}</span>;
                          })}
                        </span>
                      )}
                      {branchDeans.length > 0 && branchPrincipals.length > 0 && (
                        <span className="text-muted-foreground/30 text-[10px]">·</span>
                      )}
                      {branchPrincipals.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <span className="text-muted-foreground/60 font-semibold">Principal</span>
                          {branchPrincipals.map(p => {
                            const u = userById.get(p.user_id);
                            return <span key={p.id} className="text-amber-700 font-medium">{u?.full_name ?? `#${p.user_id}`}</span>;
                          })}
                        </span>
                      )}
                      {branchVicePrincipals.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <span className="text-muted-foreground/60 font-semibold">V.P.</span>
                          {branchVicePrincipals.map(v => {
                            const u = userById.get(v.user_id);
                            return <span key={v.id} className="text-orange-700 font-medium">{u?.full_name ?? `#${v.user_id}`}</span>;
                          })}
                        </span>
                      )}
                      {branchOperators.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <span className="text-muted-foreground/60 font-semibold">Op</span>
                          {branchOperators.map(o => {
                            const u = userById.get(o.user_id);
                            return <span key={o.id} className="text-cyan-700 font-medium">{u?.full_name ?? `#${o.user_id}`}</span>;
                          })}
                        </span>
                      )}
                      {branchDeans.length === 0 && branchPrincipals.length === 0 && branchVicePrincipals.length === 0 && branchOperators.length === 0 && branch.address && (
                        <p className="text-[11px] text-muted-foreground truncate">{branch.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground shrink-0">
                    <span>{branchSlots.length} slot{branchSlots.length !== 1 ? "s" : ""}</span>
                    {yearId && (
                      <span className="flex items-center gap-1 font-medium text-sky-600">
                        <Users className="h-3 w-3" />
                        {studentCountByBranchId[branch.id] ?? 0}
                      </span>
                    )}
                    {branchSlots.length > 0 && (
                      isFullyStaffed
                        ? <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3" /> Staffed</span>
                        : <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" /> {staffedCount}/{branchSlots.length}</span>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t">
                  {/* Role assignment row */}
                  <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-muted/10 border-b">
                    <div className="inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Dean</span>
                      {branchDeans.map(d => {
                        const u = userById.get(d.user_id);
                        const name = u?.full_name ?? `#${d.user_id}`;
                        return (
                          <span key={d.id} className="inline-flex max-w-[170px] items-center gap-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0 text-[11px] font-medium">
                            <span className="truncate">{name}</span>
                            <button onClick={e => { e.stopPropagation(); setPendingAction({ fn: () => removeDean.mutate(d.id), title: `Remove Dean`, description: `Remove "${name}" as Dean from this branch?` }); }} className="ml-0.5 hover:text-red-600">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      {availableDeans.length > 0 && (
                        <Select value={addingDean[branch.id] ?? ""} onValueChange={v => { setAddingDean(p => ({ ...p, [branch.id]: v })); assignDean.mutate({ userId: +v, branchId: branch.id }); }}>
                          <SelectTrigger className="h-6 w-auto min-w-[84px] px-2 text-xs border-dashed text-muted-foreground gap-0.5 [&>svg]:hidden"><SelectValue placeholder="+ Add" /></SelectTrigger>
                          <SelectContent>{availableDeans.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {branchDeans.length === 0 && availableDeans.length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
                    </div>
                    <div className="inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Principal</span>
                      {branchPrincipals.map(p => {
                        const u = userById.get(p.user_id);
                        const name = u?.full_name ?? `#${p.user_id}`;
                        return (
                          <span key={p.id} className="inline-flex max-w-[170px] items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0 text-[11px] font-medium">
                            <span className="truncate">{name}</span>
                            <button onClick={e => { e.stopPropagation(); setPendingAction({ fn: () => removePrincipal.mutate(p.id), title: `Remove Principal`, description: `Remove "${name}" as Principal from this branch?` }); }} className="ml-0.5 hover:text-red-600">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      {availablePrincipals.length > 0 && (
                        <Select value={addingPrincipal[branch.id] ?? ""} onValueChange={v => { setAddingPrincipal(p => ({ ...p, [branch.id]: v })); assignPrincipal.mutate({ userId: +v, branchId: branch.id }); }}>
                          <SelectTrigger className="h-6 w-auto min-w-[84px] px-2 text-xs border-dashed text-muted-foreground gap-0.5 [&>svg]:hidden"><SelectValue placeholder="+ Add" /></SelectTrigger>
                          <SelectContent>{availablePrincipals.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {branchPrincipals.length === 0 && availablePrincipals.length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
                    </div>
                    <div className="inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">V.Principal</span>
                      {branchVicePrincipals.map(v => {
                        const u = userById.get(v.user_id);
                        const name = u?.full_name ?? `#${v.user_id}`;
                        return (
                          <span key={v.id} className="inline-flex max-w-[170px] items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0 text-[11px] font-medium">
                            <span className="truncate">{name}</span>
                            <button onClick={e => { e.stopPropagation(); setPendingAction({ fn: () => removeVicePrincipal.mutate(v.id), title: `Remove Vice-Principal`, description: `Remove "${name}" as Vice-Principal from this branch?` }); }} className="ml-0.5 hover:text-red-600">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      {vicePrincipals.filter(u => !new Set(branchVicePrincipals.map(v => v.user_id)).has(u.id)).length > 0 && (
                        <Select value={addingVicePrincipal[branch.id] ?? ""} onValueChange={v => { setAddingVicePrincipal(p => ({ ...p, [branch.id]: v })); assignVicePrincipal.mutate({ userId: +v, branchId: branch.id }); }}>
                          <SelectTrigger className="h-6 w-auto min-w-[84px] px-2 text-xs border-dashed text-muted-foreground gap-0.5 [&>svg]:hidden"><SelectValue placeholder="+ Add" /></SelectTrigger>
                          <SelectContent>{vicePrincipals.filter(u => !new Set(branchVicePrincipals.map(v => v.user_id)).has(u.id)).map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {branchVicePrincipals.length === 0 && vicePrincipals.filter(u => !new Set(branchVicePrincipals.map(v => v.user_id)).has(u.id)).length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
                    </div>
                    <div className="inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Operator</span>
                      {branchOperators.map(o => {
                        const u = userById.get(o.user_id);
                        const name = u?.full_name ?? `#${o.user_id}`;
                        return (
                          <span key={o.id} className="inline-flex max-w-[170px] items-center gap-1 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 px-2 py-0 text-[11px] font-medium">
                            <span className="truncate">{name}</span>
                            <button onClick={e => { e.stopPropagation(); setPendingAction({ fn: () => removeOperator.mutate(o.id), title: `Remove Operator`, description: `Remove "${name}" as Operator from this branch?` }); }} className="ml-0.5 hover:text-red-600">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      {operators.filter(u => !new Set(branchOperators.map(o => o.user_id)).has(u.id)).length > 0 && (
                        <Select value={addingOperator[branch.id] ?? ""} onValueChange={v => { setAddingOperator(p => ({ ...p, [branch.id]: v })); assignOperator.mutate({ userId: +v, branchId: branch.id }); }}>
                          <SelectTrigger className="h-6 w-auto min-w-[84px] px-2 text-xs border-dashed text-muted-foreground gap-0.5 [&>svg]:hidden"><SelectValue placeholder="+ Add" /></SelectTrigger>
                          <SelectContent>{operators.filter(u => !new Set(branchOperators.map(o => o.user_id)).has(u.id)).map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {branchOperators.length === 0 && operators.filter(u => !new Set(branchOperators.map(o => o.user_id)).has(u.id)).length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
                    </div>
                  </div>

                  {/* Programs */}
                  <div className="px-4 py-1.5 bg-muted/5 border-b">
                    <div className="inline-flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Programs</span>
                    {assignedBranchPrograms.map(bp => {
                      const prog = programs.find(p => p.id === bp.program_id);
                      return (
                        <span key={bp.id} className="inline-flex max-w-[170px] items-center gap-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0 text-[11px] font-medium">
                          <span className="truncate">{prog?.name ?? `#${bp.program_id}`}</span>
                          <button onClick={e => { e.stopPropagation(); setPendingAction({ fn: () => dropBranchProgram.mutate(bp.id), title: "Remove Program", description: `Remove "${prog?.name}" from this branch for ${selectedYear?.name}?` }); }} className="ml-0.5 hover:text-red-600">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                    {availablePrograms.length > 0 && yearId && (
                      <Select value="" onValueChange={v => addBranchProgram.mutate({ branchId: branch.id, programId: +v })}>
                        <SelectTrigger className="h-6 w-auto min-w-[84px] px-2 text-xs border-dashed text-muted-foreground gap-0.5 [&>svg]:hidden"><SelectValue placeholder="+ Add" /></SelectTrigger>
                        <SelectContent>{availablePrograms.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {assignedBranchPrograms.length === 0 && <span className="text-[11px] text-muted-foreground italic">None for {selectedYear?.name ?? "this year"}</span>}
                    </div>
                  </div>

                  {/* Section slots */}
                  <div className="divide-y">
                    {Object.entries(grouped).length === 0 ? (
                      <div className="px-4 py-5 text-center text-sm text-muted-foreground">No section slots yet.</div>
                    ) : (
                      Object.entries(grouped).map(([progIdStr, byClass]) => {
                        const prog = programs.find(p => p.id === +progIdStr);
                        const allSlots = Object.values(byClass).flat();
                        const progStaffed = allSlots.filter(bs => isFullyStaffedSlot(bs.id)).length;

                        return (
                          <div key={progIdStr} className="px-4 py-2.5">
                            {/* Program label */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                              <span className="font-semibold text-xs">{prog?.name ?? `Program #${progIdStr}`}</span>
                              {prog?.code && <code className="text-[10px] bg-muted rounded px-1 py-0 text-muted-foreground font-mono">{prog.code}</code>}
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                {progStaffed === allSlots.length && allSlots.length > 0
                                  ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> {allSlots.length} staffed</span>
                                  : `${progStaffed}/${allSlots.length} staffed`}
                              </span>
                            </div>

                            {/* Class groups */}
                            <div className="pl-3 space-y-2">
                              {Object.entries(byClass).map(([classIdStr, slots]) => {
                                const cls = classes.find(c => c.id === +classIdStr);
                                return (
                                  <div key={classIdStr}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                      {cls?.name ?? `Class #${classIdStr}`}
                                    </p>
                                    <div className="grid grid-cols-2 gap-1">
                                      {slots.map(bs => {
                                        const sec = sections.find(s => s.id === bs.section_id);
                                        const slotFull = isFullyStaffedSlot(bs.id);

                                        return (
                                          <div key={bs.id} className="rounded-md border bg-background hover:border-primary/30 transition-colors">
                                            {/* Slot header */}
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b bg-muted/20">
                                              <span className="text-xs font-semibold text-muted-foreground">{prog?.name}</span>
                                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                              <span className="text-xs font-semibold text-muted-foreground">{cls?.name}</span>
                                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                              <Badge variant="secondary" className="shrink-0 text-xs font-semibold px-1.5 py-0">
                                                {sec?.name ?? `S${bs.section_id}`}
                                              </Badge>
                                              {yearId && (
                                                <button
                                                  onClick={() => setStudentViewBs(bs)}
                                                  className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                                                  title="View students"
                                                >
                                                  <Users className="h-3 w-3" />
                                                  {studentCountByBsId[bs.id] ?? 0}
                                                </button>
                                              )}
                                              <span className={`ml-auto text-[11px] font-medium ${slotFull ? "text-emerald-600" : "text-amber-600"}`}>
                                                {slotFull ? "✓ staffed" : `${SUBJECTS.filter(subj => (facultyByBsId[bs.id] ?? []).some(fm => fm.subject === subj)).length}/3 subjects`}
                                              </span>
                                              <button
                                                onClick={() => setPendingAction({ fn: () => deleteSlot.mutate(bs.id), title: "Delete Section Slot", description: `Delete slot "${sec?.name ?? `S${bs.section_id}`}"? This will also remove all faculty assignments for this slot.` })}
                                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>

                                            {/* Subject rows — multiple faculty per subject allowed */}
                                            <div className="divide-y">
                                              {SUBJECTS.map(subj => {
                                                const slotFms = facultyByBsId[bs.id] ?? [];
                                                const subjFms = slotFms.filter(f => f.subject === subj);
                                                const assignedIds = new Set(subjFms.map(f => f.user_id));
                                                const available = faculty.filter(u =>
                                                  !assignedIds.has(u.id) && (u.faculty_subjects ?? []).includes(subj)
                                                );
                                                const hasAny = subjFms.length > 0;
                                                const subjColor = subj === "Mathematics" ? "text-blue-600" : subj === "Physics" ? "text-purple-600" : "text-green-600";
                                                const subjShort = subj === "Mathematics" ? "Maths" : subj;
                                                const chipCls  = subj === "Mathematics"
                                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                                  : subj === "Physics"
                                                  ? "bg-purple-50 border-purple-200 text-purple-700"
                                                  : "bg-green-50 border-green-200 text-green-700";
                                                const avatarCls = subj === "Mathematics"
                                                  ? "bg-blue-200"
                                                  : subj === "Physics"
                                                  ? "bg-purple-200"
                                                  : "bg-green-200";
                                                return (
                                                  <div key={subj} className="flex items-center gap-2 px-2.5 py-1.5">
                                                    {/* Subject label + status dot */}
                                                    <div className="flex items-center gap-1.5 shrink-0 min-w-[66px]">
                                                      <div className={`h-2 w-2 rounded-full shrink-0 ${hasAny ? "bg-emerald-400" : "bg-amber-300"}`} />
                                                      <span className={`text-xs font-semibold ${subjColor}`}>{subjShort}</span>
                                                    </div>
                                                    {/* Faculty chips */}
                                                    <div className="ml-auto flex items-center justify-end gap-1 flex-1 min-w-0">
                                                      {subjFms.length > 1 && (
                                                        <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold ${chipCls}`}>
                                                          {subjFms.length}
                                                        </span>
                                                      )}
                                                      {subjFms.map(fm => {
                                                        const u = userById.get(fm.user_id);
                                                        const chipWidth = subjFms.length >= 2 ? "max-w-[110px]" : "max-w-[150px]";
                                                        return (
                                                          <span key={fm.id} className={`group/chip inline-flex items-center gap-1 rounded-full border text-[11px] font-medium px-2 py-0.5 ${chipCls} ${chipWidth}`}>
                                                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${avatarCls}`}>
                                                              {(u?.full_name ?? "?").slice(0, 2).toUpperCase()}
                                                            </span>
                                                            <span className="truncate">{u?.full_name ?? `#${fm.user_id}`}</span>
                                                            <button
                                                              onClick={() => setPendingAction({ fn: () => removeFaculty.mutate(fm.id), title: "Remove Faculty", description: `Remove ${u?.full_name ?? "this faculty"} from ${subj}?` })}
                                                              className="opacity-0 group-hover/chip:opacity-100 hover:text-red-500 transition-opacity shrink-0"
                                                            >
                                                              <X className="h-3 w-3" />
                                                            </button>
                                                          </span>
                                                        );
                                                      })}
                                                      {/* + Add dropdown */}
                                                      <Select onValueChange={v => assignFaculty.mutate({ userId: +v, bsId: bs.id, subject: subj })}>
                                                        <SelectTrigger className="h-6 w-[84px] px-2 text-xs border-dashed text-muted-foreground gap-0.5 [&>svg]:hidden">
                                                          <span className="text-primary/60 font-semibold">+ Add</span>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                          {available.length === 0
                                                            ? <div className="px-3 py-2 text-xs text-muted-foreground">No available {subjShort} faculty</div>
                                                            : available.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                                                        </SelectContent>
                                                      </Select>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add slot form */}
                  <div className="border-t px-4 py-2 bg-muted/10">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Add Section Slot</p>
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-1.5 items-center">
                      <Select
                        value={slotForm.programId}
                        onValueChange={v => setAddingSlot(p => ({ ...p, [branch.id]: { ...slotForm, programId: v } }))}
                        disabled={slotPrograms.length === 0}
                      >
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder={slotPrograms.length === 0 ? "Assign program first" : "Program"} />
                        </SelectTrigger>
                        <SelectContent>{slotPrograms.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select
                        value={slotForm.classId}
                        onValueChange={v => setAddingSlot(p => ({ ...p, [branch.id]: { ...slotForm, classId: v } }))}
                      >
                        <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select
                        value={slotForm.sectionId}
                        onValueChange={v => setAddingSlot(p => ({ ...p, [branch.id]: { ...slotForm, sectionId: v } }))}
                      >
                        <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                        <SelectContent>{sections.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 text-xs md:px-3"
                        disabled={!slotForm.programId || !slotForm.classId || !slotForm.sectionId || createSlot.isPending}
                        onClick={() => createSlot.mutate(branch.id)}
                      >
                        {createSlot.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                        Add Slot
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <School className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branches found</p>
            <p className="text-sm">Create branches in the Branches section first.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.title ?? ""}
        description={pendingAction?.description ?? ""}
        onConfirm={() => { pendingAction?.fn(); setPendingAction(null); }}
        onCancel={() => setPendingAction(null)}
      />

      {/* Student list dialog */}
      {studentViewBs && (() => {
        const slotStudents: Student[] = students.filter(
          s => s.section_mapping?.branch_section_id === studentViewBs.id
        );
        const prog = programs.find(p => p.id === studentViewBs.program_id);
        const cls  = classes.find(c => c.id === studentViewBs.class_id);
        const sec  = sections.find(s => s.id === studentViewBs.section_id);
        const branchName = branches.find(b => b.id === studentViewBs.branch_id)?.name;
        return (
          <Dialog open onOpenChange={o => { if (!o) setStudentViewBs(null); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span>{branchName}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-normal">{prog?.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground font-normal">{cls?.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary">{sec?.name}</Badge>
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground -mt-1">
                {slotStudents.length} student{slotStudents.length !== 1 ? "s" : ""} assigned
              </p>

              {slotStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No students assigned to this section yet.</p>
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold text-muted-foreground text-xs">#</th>
                        <th className="text-left py-2 font-semibold text-muted-foreground text-xs">Adm. No</th>
                        <th className="text-left py-2 font-semibold text-muted-foreground text-xs">Name</th>
                        <th className="text-left py-2 font-semibold text-muted-foreground text-xs">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {slotStudents.map((s, i) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="py-2 pr-2 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="py-2 pr-3">
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{s.admission_no}</code>
                          </td>
                          <td className="py-2 pr-3 font-medium">{s.name}</td>
                          <td className="py-2 text-xs text-muted-foreground">{s.phone ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

// ---------- Resource Card (user with contact info) ----------
const RESOURCE_COLORS: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

function ResourceCard({ user, color, compact }: { user: any; color: string; compact?: boolean }) {
  const avatarCls = RESOURCE_COLORS[color] ?? "bg-primary/10 text-primary";
  return (
    <div className={`flex items-start gap-2.5 ${compact ? "" : "rounded-lg bg-muted/30 px-3 py-2"}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarCls}`}>
        {user.full_name?.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight truncate">{user.full_name}</p>
        <div className="mt-0.5 space-y-0.5">
          {user.phone && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{user.phone}</span>
            </div>
          )}
          {user.whatsapp && user.whatsapp !== user.phone && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0 text-green-600" />
              <span>{user.whatsapp} <span className="text-green-600 font-medium">WA</span></span>
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ALL_SUBJECTS: SubjectName[] = ["Mathematics", "Chemistry", "Physics"];

const SUBJECT_COLORS: Record<SubjectName, string> = {
  Mathematics: "bg-blue-100 text-blue-700 border-blue-200 ring-blue-300",
  Chemistry: "bg-green-100 text-green-700 border-green-200 ring-green-300",
  Physics: "bg-purple-100 text-purple-700 border-purple-200 ring-purple-300",
};

// ---------- Overview ----------
function OverviewTab() {
  const { selectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => getBranches().then(r => r.data) });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: () => getPrograms().then(r => r.data) });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers().then(r => r.data) });
  const faculty = users.filter(u => u.roles.some(r => r.name === "Faculty"));

  const [mode, setMode] = useState<"faculty" | "program" | "branch">("faculty");
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Reset overview result whenever year or mode changes
  useEffect(() => { setData(null); setSelectedId(""); }, [yearId, mode]);

  const load = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const fn = mode === "faculty" ? getFacultyOverview : mode === "program" ? getProgramOverview : getBranchOverview;
      const res = await fn(+selectedId, yearId);
      setData(res.data);
    } catch {
      toast({ title: "Failed to load overview", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = async (subject: SubjectName) => {
    if (!selectedId || subjectLoading) return;
    const existing = data?.subjects?.find((s: any) => s.subject === subject);
    setSubjectLoading(true);
    try {
      if (existing) {
        await removeFacultySubject(existing.id);
      } else {
        await addFacultySubject(+selectedId, subject);
      }
      await load();
    } catch {
      toast({ title: "Failed to update subject", variant: "destructive" });
    } finally {
      setSubjectLoading(false);
    }
  };

  const options = mode === "faculty" ? faculty : mode === "program" ? programs : branches;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold">View Mapping Overview</p>
          {selectedYear && (
            <span className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-0.5">{selectedYear.name}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex shrink-0 rounded-md border overflow-hidden">
            {(["faculty", "program", "branch"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setSelectedId(""); setData(null); }}
                className={`h-9 px-3 text-sm font-medium capitalize transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9 min-w-[220px] flex-1"><SelectValue placeholder={`Select ${mode}`} /></SelectTrigger>
            <SelectContent>
              {options.map((o: any) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.full_name || o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="h-9 px-4" onClick={load} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            View
          </Button>
        </div>
      </div>

      {data && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {mode === "faculty" && (
            <>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {data.faculty?.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{data.faculty?.full_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 mb-2">
                    {data.faculty?.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />{data.faculty.phone}
                      </span>
                    )}
                    {data.faculty?.whatsapp && data.faculty.whatsapp !== data.faculty.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0 text-green-600" />{data.faculty.whatsapp} <span className="text-green-600 font-medium">WA</span>
                      </span>
                    )}
                    {data.faculty?.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />{data.faculty.email}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_SUBJECTS.map(subject => {
                      const active = data.subjects?.some((s: any) => s.subject === subject);
                      return (
                        <button
                          key={subject}
                          onClick={() => toggleSubject(subject)}
                          disabled={subjectLoading}
                          className={`px-3 py-0.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-50 ${
                            active
                              ? `${SUBJECT_COLORS[subject]} ring-2`
                              : "bg-muted text-muted-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {subject}
                        </button>
                      );
                    })}
                    {subjectLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground self-center" />}
                  </div>
                </div>
              </div>
              <Separator />
              <p className="font-medium text-sm">Sections Teaching ({data.sections?.length ?? 0})</p>
              <div className="space-y-2">
                {data.sections?.map((bs: any) => (
                  <div key={bs.id} className="flex items-center gap-2 text-sm rounded-lg border px-4 py-2.5 flex-wrap">
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{bs.branch?.name}</span>
                    <span className="text-muted-foreground">›</span>
                    <span>{bs.program?.name}</span>
                    <span className="text-muted-foreground">›</span>
                    <span>{bs.class_?.name}</span>
                    <Badge variant="secondary">{bs.section?.name}</Badge>
                  </div>
                ))}
                {!data.sections?.length && <p className="text-sm text-muted-foreground">No sections assigned.</p>}
              </div>
            </>
          )}

          {mode === "program" && (
            <>
              <p className="font-semibold text-lg">{data.program?.name}</p>
              <p className="text-sm text-muted-foreground">Branches running this program: <strong>{data.branches?.length ?? 0}</strong></p>
              <div className="flex flex-wrap gap-2">
                {data.branches?.map((b: any) => <Badge key={b.id} variant="secondary">{b.name}</Badge>)}
              </div>
              <Separator />
              <p className="font-medium text-sm">Section Slots ({data.branch_sections?.length ?? 0})</p>
              <div className="space-y-2">
                {data.branch_sections?.map((bs: any) => (
                  <div key={bs.id} className="flex items-center gap-2 text-sm rounded-lg border px-4 py-2.5 flex-wrap">
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{bs.branch?.name}</span>
                    <span className="text-muted-foreground">›</span>
                    <span>{bs.class_?.name}</span>
                    <Badge variant="secondary">{bs.section?.name}</Badge>
                  </div>
                ))}
                {!data.branch_sections?.length && <p className="text-sm text-muted-foreground">No section slots.</p>}
              </div>
            </>
          )}

          {mode === "branch" && (
            <>
              <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                <div className="inline-flex min-h-10 max-w-full shrink-0 items-center justify-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary leading-none whitespace-nowrap">
                  {data.branch?.code}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="font-semibold text-lg leading-tight">{data.branch?.name}</p>
                  {data.branch?.address && <p className="text-xs text-muted-foreground">{data.branch?.address}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deans */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Deans ({data.deans?.length ?? 0})
                  </p>
                  {data.deans?.length ? data.deans.map((d: any) => (
                    <ResourceCard key={d.id} user={d} color="violet" />
                  )) : <p className="text-sm text-muted-foreground italic">None assigned</p>}
                </div>

                {/* Principals */}
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Principals ({data.principals?.length ?? 0})
                  </p>
                  {data.principals?.length ? data.principals.map((p: any) => (
                    <ResourceCard key={p.id} user={p} color="amber" />
                  )) : <p className="text-sm text-muted-foreground italic">None assigned</p>}
                </div>
              </div>

              <Separator />

              <p className="text-sm font-medium">Programs & Sections ({data.sections?.length ?? 0} slots)</p>
              <div className="space-y-3">
                {data.sections?.map((bs: any) => {
                  const slotFaculty: any[] = (data.faculty_sections ?? []).filter((fs: any) => fs.branch_section_id === bs.id);
                  return (
                    <div key={bs.id} className="rounded-lg border overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b">
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{bs.program?.name}</span>
                        <span className="text-muted-foreground">›</span>
                        <span className="text-sm">{bs.class_?.name}</span>
                        <Badge variant="secondary" className="ml-auto">{bs.section?.name}</Badge>
                      </div>
                      {slotFaculty.length > 0 && (
                        <div className="divide-y">
                          {slotFaculty.map((fs: any) => (
                            <div key={fs.id} className="flex items-center gap-3 px-4 py-2">
                              <span className={`w-24 shrink-0 text-[11px] font-semibold ${
                                fs.subject === "Mathematics" ? "text-blue-600" : fs.subject === "Physics" ? "text-purple-600" : "text-green-600"
                              }`}>{fs.subject}</span>
                              {fs.faculty ? <ResourceCard user={fs.faculty} color="emerald" compact /> : <span className="text-xs text-muted-foreground italic">Unassigned</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {slotFaculty.length === 0 && (
                        <p className="px-4 py-2 text-xs text-muted-foreground italic">No faculty assigned</p>
                      )}
                    </div>
                  );
                })}
                {!data.sections?.length && <p className="text-sm text-muted-foreground">No section slots.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
