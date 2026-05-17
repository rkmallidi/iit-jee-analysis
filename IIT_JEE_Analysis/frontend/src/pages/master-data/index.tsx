import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Loader2, CalendarDays, CheckCircle2, Star,
  School, BookOpen, SquareStack, Grid3x3,
} from "lucide-react";

import {
  getAcademicYears, createAcademicYear, updateAcademicYear, setCurrentAcademicYear, deleteAcademicYear,
  getBranches, createBranch, updateBranch, deleteBranch,
  getPrograms, createProgram, updateProgram, deleteProgram,
  getClasses, createClass, updateClass, deleteClass,
  getSections, createSection, updateSection, deleteSection,
} from "@/lib/api";
import { useAcademicYearStore } from "@/store/academicYear";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityPage } from "@/components/layout/EntityPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { AcademicYear, Branch, Program, Class, Section } from "@/types";

// ── Tab ids ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "academic-years", label: "Academic Years", icon: CalendarDays },
  { id: "branches",       label: "Branches",        icon: School },
  { id: "programs",       label: "Programs",         icon: BookOpen },
  { id: "classes",        label: "Classes",          icon: SquareStack },
  { id: "sections",       label: "Sections",         icon: Grid3x3 },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Academic Years tab ─────────────────────────────────────────────────────────

const yearSchema = z.object({
  name: z.string().min(1, "Required").regex(/^\d{4}-\d{2,4}$/, 'Format: "2024-25"'),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
});
type YearForm = z.infer<typeof yearSchema>;

function YearDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: AcademicYear | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<YearForm>({ resolver: zodResolver(yearSchema) });

  useEffect(() => {
    if (open) reset({ name: editItem?.name ?? "", start_date: editItem?.start_date ?? "", end_date: editItem?.end_date ?? "" });
  }, [open, editItem, reset]);

  const mutation = useMutation({
    mutationFn: (d: YearForm) => isEdit ? updateAcademicYear(editItem!.id, d) : createAcademicYear(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic-years"] }); toast({ title: isEdit ? "Year updated" : "Year created" }); onClose(); },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.detail ?? "Could not save.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Academic Year" : "Add Academic Year"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="2025-26" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input {...register("start_date")} type="date" />
              {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input {...register("end_date")} type="date" />
              {errors.end_date && <p className="text-xs text-destructive">{errors.end_date.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {(isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Year"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AcademicYearsTab() {
  const qc = useQueryClient();
  const { setSelectedYear } = useAcademicYearStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<AcademicYear | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null);

  const { data: years = [], isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id: number) => setCurrentAcademicYear(id),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["academic-years"] }); setSelectedYear(res.data); toast({ title: `${res.data.name} is now the current year` }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAcademicYear(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic-years"] }); toast({ title: "Year deleted" }); setDeleteTarget(null); },
    onError: (err: any) => { toast({ title: "Error", description: err?.response?.data?.detail ?? "Cannot delete.", variant: "destructive" }); setDeleteTarget(null); },
  });

  const currentYear = years.find(y => y.is_current);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage academic year periods. The current year drives all section and student mappings.</p>
        <Button size="sm" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Year
        </Button>
      </div>

      {currentYear && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-primary text-sm">{currentYear.name} — Current Year</p>
            <p className="text-xs text-muted-foreground">{currentYear.start_date} → {currentYear.end_date}</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : years.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No academic years yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Year</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Start</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">End</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {years.map(y => (
                  <tr key={y.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{y.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{y.start_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{y.end_date}</td>
                    <td className="px-4 py-3">
                      {y.is_current
                        ? <Badge className="bg-primary/10 text-primary border-primary/20 font-medium"><CheckCircle2 className="h-3 w-3 mr-1" /> Current</Badge>
                        : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!y.is_current && (
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5"
                            onClick={() => setCurrentMutation.mutate(y.id)} disabled={setCurrentMutation.isPending} title="Set as current year">
                            <Star className="h-3.5 w-3.5" /> Set Current
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(y); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(y)} disabled={y.is_current} title={y.is_current ? "Cannot delete current year" : "Delete"}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <YearDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditItem(null); }} editItem={editItem} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        description="All branch sections, faculty assignments, and student mappings under this year will be permanently deleted."
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Branches tab ───────────────────────────────────────────────────────────────

const branchSchema = z.object({
  name: z.string().min(2, "Name required"),
  code: z.string().min(2, "Code required"),
  address: z.string().optional(),
  is_active: z.boolean(),
});
type BranchForm = z.infer<typeof branchSchema>;

function BranchDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Branch | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema), defaultValues: { name: "", code: "", address: "", is_active: true },
  });

  useEffect(() => {
    if (open) reset({ name: editItem?.name ?? "", code: editItem?.code ?? "", address: editItem?.address ?? "", is_active: editItem?.is_active ?? true });
  }, [open, editItem, reset]);

  const mutation = useMutation({
    mutationFn: (d: BranchForm) => isEdit ? updateBranch(editItem!.id, d) : createBranch(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); toast({ title: isEdit ? "Branch updated" : "Branch created" }); reset(); onClose(); },
    onError: () => toast({ title: "Error saving branch", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Branch" : "New Branch"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Branch Name</Label>
            <Input {...register("name")} placeholder="e.g. Hyderabad Centre" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input {...register("code")} placeholder="e.g. HYD-01" />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Address (optional)</Label>
            <Input {...register("address")} placeholder="Full address" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="font-medium text-sm">Active</p><p className="text-xs text-muted-foreground">Inactive branches won't appear in mappings</p></div>
            <Switch checked={watch("is_active")} onCheckedChange={v => setValue("is_active", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BranchesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["branches"], queryFn: () => getBranches().then(r => r.data) });
  const del = useMutation({
    mutationFn: (id: number) => deleteBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); toast({ title: "Branch deleted" }); },
  });
  return (
    <>
      <EntityPage
        title="" subtitle={`${items.length} branches configured`}
        items={items} isLoading={isLoading}
        onAdd={() => { setEditItem(null); setOpen(true); }}
        onEdit={b => { setEditItem(b); setOpen(true); }}
        onDelete={b => del.mutate(b.id)}
        itemLabel={b => b.name}
        searchFilter={(b, q) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)}
        searchPlaceholder="Search by name or code…"
        columns={[
          { key: "name", label: "Branch Name", render: b => <span className="font-semibold">{b.name}</span> },
          { key: "code", label: "Code", render: b => <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{b.code}</code> },
          { key: "address", label: "Address", render: b => <span className="text-muted-foreground">{b.address || "—"}</span> },
          { key: "is_active", label: "Status", render: b => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{b.is_active ? "Active" : "Inactive"}</span> },
        ]}
        dialog={<BranchDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
      />
    </>
  );
}

// ── Programs tab ───────────────────────────────────────────────────────────────

const programSchema = z.object({ name: z.string().min(2), code: z.string().min(2), description: z.string().optional(), is_active: z.boolean() });
type ProgramForm = z.infer<typeof programSchema>;

function ProgramDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Program | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ProgramForm>({
    resolver: zodResolver(programSchema), defaultValues: { name: "", code: "", description: "", is_active: true },
  });
  useEffect(() => {
    if (open) reset({ name: editItem?.name ?? "", code: editItem?.code ?? "", description: editItem?.description ?? "", is_active: editItem?.is_active ?? true });
  }, [open, editItem, reset]);
  const mutation = useMutation({
    mutationFn: (d: ProgramForm) => isEdit ? updateProgram(editItem!.id, d) : createProgram(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast({ title: isEdit ? "Updated" : "Created" }); reset(); onClose(); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Program" : "New Program"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Program Name</Label>
              <Input {...register("name")} placeholder="e.g. JEE Main + Advanced" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input {...register("code")} placeholder="e.g. JEE-2YR" />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input {...register("description")} placeholder="Optional description" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="font-medium text-sm">Active</p>
            <Switch checked={watch("is_active")} onCheckedChange={v => setValue("is_active", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProgramsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Program | null>(null);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["programs"], queryFn: () => getPrograms().then(r => r.data) });
  const del = useMutation({
    mutationFn: (id: number) => deleteProgram(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast({ title: "Deleted" }); },
  });
  return (
    <EntityPage
      title="" subtitle={`${items.length} programs`}
      items={items} isLoading={isLoading}
      onAdd={() => { setEditItem(null); setOpen(true); }}
      onEdit={p => { setEditItem(p); setOpen(true); }}
      onDelete={p => del.mutate(p.id)}
      itemLabel={p => p.name}
      searchFilter={(p, q) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)}
      searchPlaceholder="Search programs…"
      columns={[
        { key: "name", label: "Program", render: p => <span className="font-semibold">{p.name}</span> },
        { key: "code", label: "Code", render: p => <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{p.code}</code> },
        { key: "description", label: "Description", render: p => <span className="text-muted-foreground">{p.description || "—"}</span> },
        { key: "is_active", label: "Status", render: p => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{p.is_active ? "Active" : "Inactive"}</span> },
      ]}
      dialog={<ProgramDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
    />
  );
}

// ── Classes tab ────────────────────────────────────────────────────────────────

const classSchema = z.object({ name: z.string().min(1, "Name is required"), is_active: z.boolean() });
type ClassForm = z.infer<typeof classSchema>;

function ClassDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Class | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ClassForm>({
    resolver: zodResolver(classSchema), defaultValues: { name: "", is_active: true },
  });
  useEffect(() => {
    if (open) reset({ name: editItem?.name ?? "", is_active: editItem?.is_active ?? true });
  }, [open, editItem, reset]);
  const mutation = useMutation({
    mutationFn: (d: ClassForm) => isEdit ? updateClass(editItem!.id, d) : createClass(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: isEdit ? "Class updated" : "Class created" }); reset(); onClose(); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Class" : "New Class"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Class Name</Label>
            <Input {...register("name")} placeholder="e.g. Class XI, Class XII" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="font-medium text-sm">Active</p>
            <Switch checked={watch("is_active")} onCheckedChange={v => setValue("is_active", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Class | null>(null);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["classes"], queryFn: () => getClasses().then(r => r.data) });
  const del = useMutation({
    mutationFn: (id: number) => deleteClass(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: "Deleted" }); },
  });
  return (
    <EntityPage
      title="" subtitle={`${items.length} class levels`}
      items={items} isLoading={isLoading}
      onAdd={() => { setEditItem(null); setOpen(true); }}
      onEdit={c => { setEditItem(c); setOpen(true); }}
      onDelete={c => del.mutate(c.id)}
      itemLabel={c => c.name}
      searchFilter={(c, q) => c.name.toLowerCase().includes(q)}
      searchPlaceholder="Search classes…"
      columns={[
        { key: "name", label: "Class Name", render: c => <span className="font-semibold">{c.name}</span> },
        { key: "is_active", label: "Status", render: c => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{c.is_active ? "Active" : "Inactive"}</span> },
      ]}
      dialog={<ClassDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
    />
  );
}

// ── Sections tab ───────────────────────────────────────────────────────────────

const sectionSchema = z.object({ name: z.string().min(1), is_active: z.boolean() });
type SectionForm = z.infer<typeof sectionSchema>;

function SectionDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Section | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<SectionForm>({
    resolver: zodResolver(sectionSchema), defaultValues: { name: "", is_active: true },
  });
  useEffect(() => {
    if (open) reset({ name: editItem?.name ?? "", is_active: editItem?.is_active ?? true });
  }, [open, editItem, reset]);
  const mutation = useMutation({
    mutationFn: (d: SectionForm) => isEdit ? updateSection(editItem!.id, d) : createSection(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sections"] }); toast({ title: isEdit ? "Updated" : "Created" }); reset(); onClose(); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Section" : "New Section"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Section Name</Label>
            <Input {...register("name")} placeholder="e.g. Section A" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="font-medium text-sm">Active</p>
            <Switch checked={watch("is_active")} onCheckedChange={v => setValue("is_active", v)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Section | null>(null);
  const { data: items = [], isLoading } = useQuery({ queryKey: ["sections"], queryFn: () => getSections().then(r => r.data) });
  const del = useMutation({
    mutationFn: (id: number) => deleteSection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sections"] }); toast({ title: "Deleted" }); },
  });
  return (
    <EntityPage
      title="" subtitle={`${items.length} sections`}
      items={items} isLoading={isLoading}
      onAdd={() => { setEditItem(null); setOpen(true); }}
      onEdit={s => { setEditItem(s); setOpen(true); }}
      onDelete={s => del.mutate(s.id)}
      itemLabel={s => s.name}
      searchFilter={(s, q) => s.name.toLowerCase().includes(q)}
      searchPlaceholder="Search sections…"
      columns={[
        { key: "name", label: "Section Name", render: s => <span className="font-semibold">{s.name}</span> },
        { key: "is_active", label: "Status", render: s => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{s.is_active ? "Active" : "Inactive"}</span> },
      ]}
      dialog={<SectionDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MasterDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) ?? "academic-years";

  const setTab = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // Fetch counts for badge display on tabs
  const { data: years = [] }    = useQuery({ queryKey: ["academic-years"], queryFn: () => getAcademicYears().then(r => r.data) });
  const { data: branches = [] } = useQuery({ queryKey: ["branches"],       queryFn: () => getBranches().then(r => r.data) });
  const { data: programs = [] } = useQuery({ queryKey: ["programs"],       queryFn: () => getPrograms().then(r => r.data) });
  const { data: classes = [] }  = useQuery({ queryKey: ["classes"],        queryFn: () => getClasses().then(r => r.data) });
  const { data: sections = [] } = useQuery({ queryKey: ["sections"],       queryFn: () => getSections().then(r => r.data) });

  const counts: Record<TabId, number> = {
    "academic-years": years.length,
    "branches":       branches.length,
    "programs":       programs.length,
    "classes":        classes.length,
    "sections":       sections.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Institute Setup</h2>
        <p className="text-sm text-muted-foreground">Configure the foundational data used across the platform.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {/* Pill tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {counts[id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          <TabsContent value="academic-years"><AcademicYearsTab /></TabsContent>
          <TabsContent value="branches"      ><BranchesTab /></TabsContent>
          <TabsContent value="programs"      ><ProgramsTab /></TabsContent>
          <TabsContent value="classes"       ><ClassesTab /></TabsContent>
          <TabsContent value="sections"      ><SectionsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
