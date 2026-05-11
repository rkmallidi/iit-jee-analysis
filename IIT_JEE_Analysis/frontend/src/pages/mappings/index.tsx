import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitBranch, Eye, Plus, Trash2, ChevronDown, ChevronRight,
  Loader2, CheckCircle2, AlertCircle, Search, X,
} from "lucide-react";

import {
  getBranches, getPrograms, getClasses, getSections, getUsers,
  getDeanBranches, assignDeanBranch, removeDeanBranch,
  getPrincipalBranches, assignPrincipalBranch, removePrincipalBranch,
  getBranchSections, createBranchSection, deleteBranchSection,
  getFacultySections, assignFacultySection, removeFacultySection,
  getFacultyOverview, getProgramOverview, getBranchOverview,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import type { BranchSection, SubjectName } from "@/types";

type Tab = "dashboard" | "overview";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Branch Dashboard", icon: GitBranch },
  { id: "overview", label: "Overview", icon: Eye },
];

// ---------- Main Page ----------
export default function MappingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Mappings & Overview</h2>
        <p className="text-sm text-muted-foreground">Configure academic structure relationships and view the complete overview.</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && <BranchDashboardTab />}
      {activeTab === "overview" && <OverviewTab />}
    </div>
  );
}

// ---------- Branch Dashboard ----------
function BranchDashboardTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [addingSlot, setAddingSlot] = useState<Record<number, { programId: string; classId: string; sectionId: string }>>({});
  const [addingDean, setAddingDean] = useState<Record<number, string>>({});
  const [addingPrincipal, setAddingPrincipal] = useState<Record<number, string>>({});

  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => getBranches().then(r => r.data) });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: () => getPrograms().then(r => r.data) });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: () => getClasses().then(r => r.data) });
  const { data: sections = [] } = useQuery({ queryKey: ["sections"], queryFn: () => getSections().then(r => r.data) });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers().then(r => r.data) });
  const { data: bsections = [] } = useQuery({ queryKey: ["branch-sections"], queryFn: () => getBranchSections().then(r => r.data) });
  const { data: deanMaps = [] } = useQuery({ queryKey: ["dean-branches"], queryFn: () => getDeanBranches().then(r => r.data) });
  const { data: principalMaps = [] } = useQuery({ queryKey: ["principal-branches"], queryFn: () => getPrincipalBranches().then(r => r.data) });
  const { data: facultyMaps = [] } = useQuery({ queryKey: ["faculty-sections"], queryFn: () => getFacultySections().then(r => r.data) });

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
  const createSlot = useMutation({
    mutationFn: (branchId: number) => {
      const f = addingSlot[branchId];
      return createBranchSection({ branch_id: branchId, program_id: +f.programId, class_id: +f.classId, section_id: +f.sectionId });
    },
    onSuccess: (_d, branchId) => {
      qc.invalidateQueries({ queryKey: ["branch-sections"] });
      setAddingSlot(p => ({ ...p, [branchId]: { programId: "", classId: "", sectionId: "" } }));
      toast({ title: "Section slot created" });
    },
    onError: () => toast({ title: "Slot already exists or error", variant: "destructive" }),
  });
  const deleteSlot = useMutation({
    mutationFn: (id: number) => deleteBranchSection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branch-sections"] }); toast({ title: "Slot removed" }); },
  });
  const assignFaculty = useMutation({
    mutationFn: ({ userId, bsId }: { userId: number; bsId: number }) => assignFacultySection(userId, bsId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculty-sections"] }); toast({ title: "Faculty assigned" }); },
    onError: () => toast({ title: "Error assigning faculty", variant: "destructive" }),
  });
  const removeFaculty = useMutation({
    mutationFn: (id: number) => removeFacultySection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["faculty-sections"] }); toast({ title: "Faculty removed" }); },
  });

  const deans = users.filter(u => u.roles.some(r => r.name === "Dean"));
  const principals = users.filter(u => u.roles.some(r => r.name === "Principal"));
  const faculty = users.filter(u => u.roles.some(r => r.name === "Faculty"));

  const totalSlots = bsections.length;
  const staffedSlots = bsections.filter(bs => facultyMaps.some(fm => fm.branch_section_id === bs.id)).length;

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Branches", value: branches.length, cls: "text-blue-600" },
          { label: "Section Slots", value: totalSlots, cls: "text-violet-600" },
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
          const branchSlots = bsections.filter(bs => bs.branch_id === branch.id);
          const branchDeans = deanMaps.filter(d => d.branch_id === branch.id);
          const branchPrincipals = principalMaps.filter(p => p.branch_id === branch.id);
          const staffedCount = branchSlots.filter(bs => facultyMaps.some(fm => fm.branch_section_id === bs.id)).length;
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

          return (
            <Card key={branch.id} className={`overflow-hidden ${!branch.is_active ? "opacity-60" : ""}`}>
              {/* Header — clickable to toggle */}
              <button className="w-full text-left" onClick={() => toggleExpand(branch.id)}>
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {branch.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{branch.name}</p>
                      {!branch.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                    {branch.address && <p className="text-xs text-muted-foreground truncate">{branch.address}</p>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span>{branchSlots.length} slot{branchSlots.length !== 1 ? "s" : ""}</span>
                    {branchSlots.length > 0 && (
                      isFullyStaffed
                        ? <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Fully staffed</span>
                        : <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> {staffedCount}/{branchSlots.length} staffed</span>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t">
                  {/* Dean / Principal row */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 items-center px-5 py-3 bg-muted/10 border-b">
                    {/* Deans */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-16">Dean</span>
                      {branchDeans.map(d => {
                        const u = users.find(u => u.id === d.user_id);
                        return (
                          <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-0.5 text-xs font-medium">
                            {u?.full_name ?? `#${d.user_id}`}
                            <button
                              onClick={e => { e.stopPropagation(); removeDean.mutate(d.id); }}
                              className="ml-0.5 hover:text-red-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {availableDeans.length > 0 && (
                        <Select
                          value={addingDean[branch.id] ?? ""}
                          onValueChange={v => {
                            setAddingDean(p => ({ ...p, [branch.id]: v }));
                            assignDean.mutate({ userId: +v, branchId: branch.id });
                          }}
                        >
                          <SelectTrigger className="h-6 w-32 text-xs border-dashed">
                            <SelectValue placeholder="+ Add Dean" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDeans.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {branchDeans.length === 0 && availableDeans.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </div>

                    <div className="hidden sm:block w-px h-5 bg-border" />

                    {/* Principals */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-16">Principal</span>
                      {branchPrincipals.map(p => {
                        const u = users.find(u => u.id === p.user_id);
                        return (
                          <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-medium">
                            {u?.full_name ?? `#${p.user_id}`}
                            <button
                              onClick={e => { e.stopPropagation(); removePrincipal.mutate(p.id); }}
                              className="ml-0.5 hover:text-red-600 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {availablePrincipals.length > 0 && (
                        <Select
                          value={addingPrincipal[branch.id] ?? ""}
                          onValueChange={v => {
                            setAddingPrincipal(p => ({ ...p, [branch.id]: v }));
                            assignPrincipal.mutate({ userId: +v, branchId: branch.id });
                          }}
                        >
                          <SelectTrigger className="h-6 w-36 text-xs border-dashed">
                            <SelectValue placeholder="+ Add Principal" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePrincipals.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {branchPrincipals.length === 0 && availablePrincipals.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </div>
                  </div>

                  {/* Section slots grouped Program → Class → Section */}
                  <div className="divide-y">
                    {Object.entries(grouped).length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No section slots yet — add the first one below.
                      </div>
                    ) : (
                      Object.entries(grouped).map(([progIdStr, byClass]) => {
                        const prog = programs.find(p => p.id === +progIdStr);
                        const allSlots = Object.values(byClass).flat();
                        const progStaffed = allSlots.filter(bs => facultyMaps.some(fm => fm.branch_section_id === bs.id)).length;

                        return (
                          <div key={progIdStr} className="px-5 py-4">
                            {/* Program label */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              <span className="font-semibold text-sm">{prog?.name ?? `Program #${progIdStr}`}</span>
                              {prog?.code && (
                                <code className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground font-mono">{prog.code}</code>
                              )}
                              <span className="ml-auto text-xs text-muted-foreground">
                                {progStaffed === allSlots.length && allSlots.length > 0
                                  ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {allSlots.length} staffed</span>
                                  : `${progStaffed}/${allSlots.length} staffed`}
                              </span>
                            </div>

                            {/* Class groups */}
                            <div className="pl-4 space-y-3">
                              {Object.entries(byClass).map(([classIdStr, slots]) => {
                                const cls = classes.find(c => c.id === +classIdStr);
                                return (
                                  <div key={classIdStr}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                                      {cls?.name ?? `Class #${classIdStr}`}
                                    </p>
                                    <div className="space-y-1.5">
                                      {slots.map(bs => {
                                        const sec = sections.find(s => s.id === bs.section_id);
                                        const fm = facultyMaps.find(f => f.branch_section_id === bs.id);
                                        const assignedUser = fm ? users.find(u => u.id === fm.user_id) : null;

                                        return (
                                          <div
                                            key={bs.id}
                                            className="group flex items-center gap-3 rounded-lg border bg-background px-3 py-2 hover:border-primary/40 transition-colors"
                                          >
                                            {/* Section badge */}
                                            <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                                              {sec?.name ?? `S${bs.section_id}`}
                                            </Badge>

                                            {/* Faculty assignment */}
                                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                              {assignedUser ? (
                                                <>
                                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                                    {assignedUser.full_name.slice(0, 2).toUpperCase()}
                                                  </div>
                                                  <span className="text-xs font-medium truncate">{assignedUser.full_name}</span>
                                                  <button
                                                    onClick={() => fm && removeFaculty.mutate(fm.id)}
                                                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                    title="Remove faculty"
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </button>
                                                </>
                                              ) : (
                                                <Select onValueChange={v => assignFaculty.mutate({ userId: +v, bsId: bs.id })}>
                                                  <SelectTrigger className="h-6 w-44 text-xs border-dashed text-muted-foreground">
                                                    <SelectValue placeholder="Assign faculty…" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {faculty.length === 0
                                                      ? <div className="px-3 py-2 text-xs text-muted-foreground">No faculty users found</div>
                                                      : faculty.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)
                                                    }
                                                  </SelectContent>
                                                </Select>
                                              )}
                                            </div>

                                            {/* Status dot */}
                                            <div className={`h-2 w-2 rounded-full shrink-0 ${assignedUser ? "bg-emerald-400" : "bg-amber-300"}`} title={assignedUser ? "Staffed" : "Unstaffed"} />

                                            {/* Delete slot */}
                                            <button
                                              onClick={() => deleteSlot.mutate(bs.id)}
                                              className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                              title="Remove slot"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
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
                  <div className="border-t px-5 py-3 bg-muted/10">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Section Slot</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Select
                        value={slotForm.programId}
                        onValueChange={v => setAddingSlot(p => ({ ...p, [branch.id]: { ...slotForm, programId: v } }))}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Program" /></SelectTrigger>
                        <SelectContent>{programs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select
                        value={slotForm.classId}
                        onValueChange={v => setAddingSlot(p => ({ ...p, [branch.id]: { ...slotForm, classId: v } }))}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select
                        value={slotForm.sectionId}
                        onValueChange={v => setAddingSlot(p => ({ ...p, [branch.id]: { ...slotForm, sectionId: v } }))}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                        <SelectContent>{sections.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
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
            <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branches found</p>
            <p className="text-sm">Create branches in the Branches section first.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Overview ----------
function OverviewTab() {
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => getBranches().then(r => r.data) });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"], queryFn: () => getPrograms().then(r => r.data) });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => getUsers().then(r => r.data) });
  const faculty = users.filter(u => u.roles.some(r => r.name === "Faculty"));

  const [mode, setMode] = useState<"faculty" | "program" | "branch">("faculty");
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const fn = mode === "faculty" ? getFacultyOverview : mode === "program" ? getProgramOverview : getBranchOverview;
      const res = await fn(+selectedId);
      setData(res.data);
    } catch {
      toast({ title: "Failed to load overview", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const options = mode === "faculty" ? faculty : mode === "program" ? programs : branches;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold mb-3">View Mapping Overview</p>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex rounded-lg border overflow-hidden">
            {(["faculty", "program", "branch"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setSelectedId(""); setData(null); }}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-52"><SelectValue placeholder={`Select ${mode}`} /></SelectTrigger>
            <SelectContent>
              {options.map((o: any) => (
                <SelectItem key={o.id} value={String(o.id)}>{o.full_name || o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={!selectedId || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            View
          </Button>
        </div>
      </div>

      {data && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {mode === "faculty" && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {data.faculty?.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{data.faculty?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{data.subject ? `Subject: ${data.subject}` : "No subject assigned"}</p>
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
              <p className="font-semibold text-lg">
                {data.branch?.name}
                <code className="text-sm font-normal text-muted-foreground ml-2">({data.branch?.code})</code>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Deans ({data.deans?.length ?? 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {data.deans?.map((d: any) => <Badge key={d.id}>{d.full_name}</Badge>)}
                    {!data.deans?.length && <p className="text-sm text-muted-foreground">None assigned</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Principals ({data.principals?.length ?? 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {data.principals?.map((p: any) => <Badge key={p.id} variant="secondary">{p.full_name}</Badge>)}
                    {!data.principals?.length && <p className="text-sm text-muted-foreground">None assigned</p>}
                  </div>
                </div>
              </div>
              <Separator />
              <p className="text-sm font-medium">Programs & Sections ({data.sections?.length ?? 0} slots)</p>
              <div className="space-y-2">
                {data.sections?.map((bs: any) => (
                  <div key={bs.id} className="flex items-center gap-2 text-sm rounded-lg border px-4 py-2.5 flex-wrap">
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{bs.program?.name}</span>
                    <span className="text-muted-foreground">›</span>
                    <span>{bs.class_?.name}</span>
                    <Badge variant="secondary">{bs.section?.name}</Badge>
                  </div>
                ))}
                {!data.sections?.length && <p className="text-sm text-muted-foreground">No section slots.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
