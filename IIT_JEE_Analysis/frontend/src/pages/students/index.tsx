import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as XLSX from "xlsx";
import {
  Plus, Search, Pencil, Trash2, Loader2,
  FileSpreadsheet, Download, X, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Users,
} from "lucide-react";

import {
  getStudentsPage, createStudent, updateStudent, deleteStudent,
  studentHasHistory, reactivateStudent, uploadStudentsExcel, downloadStudentsTemplate,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useAcademicYearStore } from "@/store/academicYear";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Student, StudentPage, UploadResult } from "@/types";

// ── Schema ─────────────────────────────────────────────────────────────────────
const studentSchema = z.object({
  admission_no: z.string().min(1, "Required"),
  name: z.string().min(2, "Min 2 characters"),
  phone: z.string().optional(),
});
type StudentFormData = z.infer<typeof studentSchema>;

// ── Add / Edit dialog ──────────────────────────────────────────────────────────
function StudentDialog({
  open, onClose, editItem,
}: { open: boolean; onClose: () => void; editItem?: Student | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        admission_no: editItem?.admission_no ?? "",
        name: editItem?.name ?? "",
        phone: editItem?.phone ?? "",
      });
    }
  }, [open, editItem, reset]);

  const mutation = useMutation({
    mutationFn: (data: StudentFormData) => {
      const payload = { ...data, phone: data.phone || null };
      return isEdit ? updateStudent(editItem!.id, payload) : createStudent(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast({ title: isEdit ? "Student updated" : "Student added" });
      reset();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Could not save student.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Admission No</Label>
            <Input {...register("admission_no")} placeholder="7050729" disabled={isEdit} />
            {errors.admission_no && <p className="text-xs text-destructive">{errors.admission_no.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input {...register("name")} placeholder="CS Koushik" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input {...register("phone")} placeholder="+91 9XXXXXXXXX" type="tel" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {(isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Upload result dialog ───────────────────────────────────────────────────────
function UploadResultDialog({ result, onClose }: { result: UploadResult; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
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
              <p className="text-xs font-semibold text-destructive mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {result.errors.length} row error{result.errors.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i} className="text-[11px] text-destructive/80">{e}</li>)}
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

// ── Types ──────────────────────────────────────────────────────────────────────
type SortField = "name" | "admission_no" | "omr_id" | "is_active";
type SortDir   = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [100, 200, 500];

const getOmrId = (student: Student) => student.omr_id || student.admission_no.slice(-7);

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { isAdmin, branchIds } = useAuthStore();
  const { selectedYear } = useAcademicYearStore();

  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField]     = useState<SortField>("name");
  const [sortDir, setSortDir]         = useState<SortDir>("asc");
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(100);

  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editItem, setEditItem]         = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<Student | null>(null);
  const [deleteHasHistory, setDeleteHasHistory] = useState<boolean | null>(null);
  const [checkingHistory, setCheckingHistory]   = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [downloading, setDownloading]   = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(handle);
  }, [search]);

  const adminUser = isAdmin();
  const canLoadStudents = adminUser || (Boolean(selectedYear?.id) && branchIds.length > 0);
  const skip = (page - 1) * pageSize;
  const { data: studentPage, isLoading } = useQuery<StudentPage>({
    queryKey: ["students", "master", selectedYear?.id, branchIds, page, pageSize, debouncedSearch, sortField, sortDir],
    queryFn: () => getStudentsPage({
      academic_year_id: adminUser ? undefined : selectedYear?.id,
      branch_ids: adminUser ? undefined : branchIds,
      search: debouncedSearch || undefined,
      skip,
      limit: pageSize,
      sort_field: sortField,
      sort_dir: sortDir,
    }).then(r => r.data),
    enabled: canLoadStudents,
  });

  const { data: systemTotalPage, isLoading: isTotalLoading } = useQuery<StudentPage>({
    queryKey: ["students", "system-total", selectedYear?.id, branchIds],
    queryFn: () => getStudentsPage({
      academic_year_id: adminUser ? undefined : selectedYear?.id,
      branch_ids: adminUser ? undefined : branchIds,
      skip: 0,
      limit: 1,
    }).then(r => r.data),
    enabled: canLoadStudents,
  });

  const students = studentPage?.items ?? [];

  // Search → sort → paginate (inactive students are shown, dimmed)
  const totalStudents = studentPage?.total ?? 0;
  const systemTotalStudents = systemTotalPage?.total ?? totalStudents;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageStart = totalStudents === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, totalStudents);
  const visiblePages = Array.from(new Set([1, safePage - 1, safePage, safePage + 1, totalPages]))
    .filter(p => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)
    .reduce<(number | "...")[]>((acc, p) => {
      const prev = acc[acc.length - 1];
      if (typeof prev === "number" && p - prev > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  // Reset to page 1 when search or sort changes
  useEffect(() => { setPage(1); }, [debouncedSearch, sortField, sortDir, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />;
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStudent(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["students"] });
      const action = res.data.action;
      toast({
        title: action === "deactivated" ? "Student deactivated" : "Student removed",
        description: action === "deactivated"
          ? "Student has exam history — marked inactive."
          : "Student permanently removed from the system.",
      });
      setDeleteTarget(null);
      setDeleteHasHistory(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => reactivateStudent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student reactivated", description: "Student is now active." });
    },
    onError: () => toast({ title: "Error", description: "Could not reactivate student.", variant: "destructive" }),
  });

  const handleDeleteClick = async (s: Student) => {
    setDeleteTarget(s);
    setCheckingHistory(true);
    try {
      const res = await studentHasHistory(s.id);
      setDeleteHasHistory(res.data.has_history);
    } catch {
      setDeleteHasHistory(false);
    } finally {
      setCheckingHistory(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await downloadStudentsTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "students_template.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally { setDownloading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const res = await uploadStudentsExcel(file);
      qc.invalidateQueries({ queryKey: ["students"] });
      setUploadResult(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed";
      toast({ title: "Upload error", description: msg, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleExportExcel = () => {
    const rows = students.map(s => ({
      "Admission No":  s.admission_no,
      "OMR ID":        getOmrId(s),
      "Name":          s.name,
      "Phone":         s.phone ?? "",
      "Target Rank":   s.target_rank ?? "",
      "Status":        s.is_active ? "Active" : "Inactive",
      "Branch":        s.section_mapping?.branch_section?.branch_id ?? "",
      "Created At":    new Date(s.created_at).toLocaleDateString("en-IN"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `students_export_${date}.xlsx`);
    toast({ title: "Exported", description: `${rows.length} students from the current page exported to Excel.` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">Students</h2>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? `${totalStudents.toLocaleString("en-IN")} matching search`
                : `Showing ${pageStart}-${pageEnd}`}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-2 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {adminUser ? "Total Students in System" : "Total Students"}
              </p>
              <p className="text-2xl font-bold leading-tight">
                {isTotalLoading ? "..." : systemTotalStudents.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={handleDownloadTemplate} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Template
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Upload Excel
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={students.length === 0}>
            <Download className="mr-2 h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, admission no, OMR ID, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <Card>
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {/* Sortable: Adm. No */}
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                        <button
                          className="inline-flex items-center hover:text-foreground transition-colors"
                          onClick={() => toggleSort("admission_no")}
                        >
                          Adm. No <SortIcon field="admission_no" />
                        </button>
                      </th>
                      {/* Sortable: OMR ID */}
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                        <button
                          className="inline-flex items-center hover:text-foreground transition-colors"
                          onClick={() => toggleSort("omr_id")}
                        >
                          OMR ID <SortIcon field="omr_id" />
                        </button>
                      </th>
                      {/* Sortable: Name */}
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button
                          className="inline-flex items-center hover:text-foreground transition-colors"
                          onClick={() => toggleSort("name")}
                        >
                          Name <SortIcon field="name" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                        <button
                          className="inline-flex items-center hover:text-foreground transition-colors"
                          onClick={() => toggleSort("is_active")}
                        >
                          Status <SortIcon field="is_active" />
                        </button>
                      </th>
                      <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map(s => (
                      <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${!s.is_active ? "opacity-50" : ""}`}>
                        <td className="px-5 py-3">
                          <code className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded">
                            {s.admission_no}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono font-semibold bg-muted/70 px-2 py-0.5 rounded">
                            {getOmrId(s)}
                          </code>
                        </td>
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {s.phone ?? <span className="italic text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${s.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {s.is_active ? (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit student"
                                  onClick={() => { setEditItem(s); setDialogOpen(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Deactivate / Remove student"
                                  disabled={checkingHistory && deleteTarget?.id === s.id}
                                  onClick={() => handleDeleteClick(s)}>
                                  {checkingHistory && deleteTarget?.id === s.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                title="Reactivate student"
                                disabled={reactivateMutation.isPending && reactivateMutation.variables === s.id}
                                onClick={() => reactivateMutation.mutate(s.id)}>
                                {reactivateMutation.isPending && reactivateMutation.variables === s.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <RotateCcw className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="flex items-center justify-between px-5 py-3 border-t gap-4 flex-wrap">
                {/* Rows per page */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Page info + controls */}
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-muted-foreground mr-2">
                    {pageStart}-{pageEnd} of {totalStudents.toLocaleString("en-IN")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === 1} onClick={() => setPage(1)}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page number pills */}
                  {visiblePages.map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={safePage === p ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8 text-sm"
                          onClick={() => setPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}

                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <StudentDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null); }}
        editItem={editItem}
      />
      <ConfirmDialog
        open={deleteTarget !== null && deleteHasHistory !== null}
        title={deleteHasHistory
          ? `Deactivate "${deleteTarget?.name}"?`
          : `Remove "${deleteTarget?.name}"?`}
        description={deleteHasHistory
          ? `This student has exam history. They will be marked inactive — all results and evaluations are preserved.`
          : `This student has no exam history. They will be permanently removed from the system. This cannot be undone.`}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => { setDeleteTarget(null); setDeleteHasHistory(null); }}
      />
      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}
    </div>
  );
}
