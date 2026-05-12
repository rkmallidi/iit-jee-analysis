import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Search, Pencil, Trash2, Loader2,
  FileSpreadsheet, Download, X, CheckCircle2, AlertCircle,
} from "lucide-react";

import {
  getStudents, createStudent, updateStudent, deleteStudent,
  uploadStudentsExcel, downloadStudentsTemplate,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Student, UploadResult } from "@/types";

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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => getStudents().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStudent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student deleted" });
      setDeleteTarget(null);
    },
  });

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await downloadStudentsTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_template.xlsx";
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
      const res = await uploadStudentsExcel(file);
      qc.invalidateQueries({ queryKey: ["students"] });
      setUploadResult(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed";
      toast({ title: "Upload error", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.admission_no.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.phone ?? "").includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Students</h2>
          <p className="text-sm text-muted-foreground">{students.length} students</p>
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
          <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, admission no, or phone…"
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No students found</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Upload an Excel file or add students manually.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground whitespace-nowrap">Adm. No</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-5 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(s => (
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
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="Edit student"
                            onClick={() => { setEditItem(s); setDialogOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete student"
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.name}"?`}
        description={`Permanently removes student ${deleteTarget?.admission_no}.`}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}
    </div>
  );
}
