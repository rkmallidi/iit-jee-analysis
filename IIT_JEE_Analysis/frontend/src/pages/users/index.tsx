import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Plus, Search, Pencil, Loader2, KeyRound, Eye, EyeOff,
  MoreVertical, UserX, UserCheck, X, Mail, Phone, Camera, ImagePlus, Trash2,
  FileSpreadsheet, Download, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  getUsers, getRoles, createUser, updateUser, deleteUser, uploadUserAvatar,
  downloadUsersTemplate, uploadUsersExcel,
} from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Role, SubjectName, UploadResult, User } from "@/types";

// ── Role colours ───────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  Admin:            "bg-red-100 text-red-700 border-red-200",
  Dean:             "bg-violet-100 text-violet-700 border-violet-200",
  Principal:        "bg-amber-100 text-amber-700 border-amber-200",
  "Vice-Principal": "bg-orange-100 text-orange-700 border-orange-200",
  Faculty:          "bg-emerald-100 text-emerald-700 border-emerald-200",
  Operator:         "bg-sky-100 text-sky-700 border-sky-200",
};
const SUBJECTS: SubjectName[] = ["Mathematics", "Physics", "Chemistry"];
const SUBJECT_COLORS: Record<SubjectName, string> = {
  Mathematics: "bg-blue-100 text-blue-700 border-blue-200",
  Physics:     "bg-purple-100 text-purple-700 border-purple-200",
  Chemistry:   "bg-green-100 text-green-700 border-green-200",
};

// ── Avatar helpers ─────────────────────────────────────────────────────────────
function avatarSrc(url?: string | null) {
  if (!url) return null;
  return url; // relative /uploads/... proxied by Vite, or absolute http
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function UserAvatar({
  user, size = "md",
}: { user: User; size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "h-8 w-8 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-16 w-16 text-base" }[size];
  const src = avatarSrc(user.avatar_url);
  if (src) {
    return (
      <img
        src={src}
        alt={user.full_name}
        className={cn("rounded-full object-cover shrink-0 border border-border", sizeClass)}
      />
    );
  }
  return (
    <div className={cn(
      "rounded-full flex items-center justify-center shrink-0 font-bold",
      sizeClass,
      user.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
    )}>
      {initials(user.full_name)}
    </div>
  );
}

// ── Photo upload dialog ────────────────────────────────────────────────────────
function PhotoDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarSrc(user.avatar_url));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5 MB.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadUserAvatar(user.id, selectedFile);
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Photo updated" });
      onClose();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await updateUser(user.id, { clear_avatar: true });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Photo removed" });
      onClose();
    } catch {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Update Photo
          </DialogTitle>
          <DialogDescription>
            Upload a photo for <span className="font-semibold text-foreground">{user.full_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          {/* Preview */}
          <div className="relative group">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="h-28 w-28 rounded-full object-cover border-2 border-border shadow"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-border shadow">
                {initials(user.full_name)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-2 w-full">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Choose Photo
            </Button>
            <p className="text-[11px] text-muted-foreground">JPEG, PNG, WebP or GIF · max 5 MB</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {user.avatar_url && !selectedFile && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive mr-auto"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!selectedFile || uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          {result.errors.length > 0 ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {result.errors.length} row error{result.errors.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i} className="text-[11px] text-destructive/80">{e}</li>)}
              </ul>
            </div>
          ) : (
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

// ── Schemas ────────────────────────────────────────────────────────────────────
const baseSchema = z.object({
  username:  z.string().min(2, "Min 2 characters"),
  email:     z.string().email().optional().or(z.literal("")),
  full_name: z.string().min(2),
  phone:     z.string().optional(),
  whatsapp:  z.string().optional(),
  role_ids:  z.array(z.number()).min(1, "Select at least one role"),
  faculty_subject: z.enum(["Mathematics", "Physics", "Chemistry"]).or(z.literal("")),
});
const createSchema = baseSchema.extend({ password: z.string().min(8, "Min 8 characters") });
const editSchema   = baseSchema.extend({ password: z.string().min(8, "Min 8 characters").or(z.literal("")) });
type FormData = z.infer<typeof createSchema>;

// ── User dialog ────────────────────────────────────────────────────────────────
function UserDialog({ open, onClose, editUser, roles }: {
  open: boolean; onClose: () => void; editUser?: User | null; roles: Role[];
}) {
  const qc = useQueryClient();
  const isEdit = !!editUser;
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const facultyRoleId = roles.find(r => r.name === "Faculty")?.id;
  const isFacultySelected = facultyRoleId ? selectedRoles.includes(facultyRoleId) : false;

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { username: "", email: "", full_name: "", phone: "", whatsapp: "", password: "", role_ids: [], faculty_subject: "" },
  });

  useEffect(() => {
    if (open) {
      const roleIds = editUser?.roles.map(r => r.id) ?? [];
      setSelectedRoles(roleIds);
      reset({
        username: editUser?.username ?? "",
        email: editUser?.email ?? "",
        full_name: editUser?.full_name ?? "",
        phone: editUser?.phone ?? "",
        whatsapp: editUser?.whatsapp ?? "",
        password: "",
        role_ids: roleIds,
        faculty_subject: editUser?.faculty_subjects?.[0] ?? "",
      });
    }
  }, [open, editUser, reset]);

  const toggleRole = (id: number) => {
    setSelectedRoles(prev => {
      const next = prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id];
      setValue("role_ids", next, { shouldValidate: true });
      if (id === facultyRoleId && prev.includes(id)) setValue("faculty_subject", "", { shouldValidate: true });
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isFacultySelected && !data.faculty_subject) {
        throw new Error("Faculty subject is required");
      }
      const payload: Record<string, unknown> = {
        ...data, role_ids: selectedRoles,
        email: data.email || null, phone: data.phone || null, whatsapp: data.whatsapp || null,
        faculty_subjects: isFacultySelected ? [data.faculty_subject] : [],
      };
      delete payload.faculty_subject;
      if (isEdit && !data.password) delete payload.password;
      return isEdit ? updateUser(editUser!.id, payload) : createUser(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: isEdit ? "User updated" : "User created" });
      reset(); onClose();
    },
    onError: (error: any) => toast({ title: error?.message || "Could not save user.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate({ ...d, role_ids: selectedRoles }))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input {...register("full_name")} placeholder="John Doe" />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input {...register("username")} placeholder="jdoe" disabled={isEdit} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input {...register("email")} placeholder="jdoe@example.com" type="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input {...register("phone")} placeholder="+91 9XXXXXXXXX" />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input {...register("password")} type="password" placeholder="Min 8 characters" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Roles</Label>
              {selectedRoles.length === 0 && <p className="text-xs text-destructive">Select at least one role</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map(r => (
                <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedRoles.includes(r.id)
                      ? (ROLE_COLORS[r.name] ?? "bg-primary/10 text-primary border-primary/20") + " ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                  }`}>
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {isFacultySelected && (
            <div className="space-y-2">
              <Label>Faculty Subject</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(subject => (
                  <label key={subject} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer hover:border-primary/40">
                    <input
                      type="radio"
                      value={subject}
                      {...register("faculty_subject")}
                      className="h-3 w-3"
                    />
                    {subject}
                  </label>
                ))}
              </div>
              {errors.faculty_subject && <p className="text-xs text-destructive">Select the faculty subject</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {(isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Reset password dialog ──────────────────────────────────────────────────────
const resetSchema = z.object({
  password: z.string().min(8, "Min 8 characters"),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });
type ResetFormData = z.infer<typeof resetSchema>;

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient();
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: ResetFormData) => updateUser(user.id, { password: data.password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Password reset", description: `Password for ${user.full_name} updated.` });
      onClose();
    },
    onError: () => toast({ title: "Reset failed", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold text-foreground">{user.full_name}</span>{" "}
            <span className="text-muted-foreground">(@{user.username})</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input {...register("password")} type={showPwd ? "text" : "password"} placeholder="Min 8 characters" className="pr-10" autoFocus />
              <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Confirm Password</Label>
            <div className="relative">
              <Input {...register("confirm")} type={showConfirm ? "text" : "password"} placeholder="Repeat password" className="pr-10" />
              <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
              {(isSubmitting || mutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch]           = useState("");
  const [roleFilter, setRoleFilter]   = useState<string>("all");
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editUser, setEditUser]       = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget]   = useState<User | null>(null);
  const [photoTarget, setPhotoTarget]   = useState<User | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [downloading, setDownloading]   = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => getUsers().then(r => r.data),
  });
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => getRoles().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deactivated" });
      setDeleteTarget(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => updateUser(id, { is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User reactivated", description: "User can now log in again." });
    },
    onError: () => toast({ title: "Could not reactivate user.", variant: "destructive" }),
  });

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await downloadUsersTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "users_template.xlsx";
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
      const res = await uploadUsersExcel(file);
      qc.invalidateQueries({ queryKey: ["users"] });
      setUploadResult(res.data);
    } catch (err: any) {
      toast({ title: "Upload error", description: err?.detail ?? "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = () => {
    const rows = filtered.map(u => ({
      "Username": u.username,
      "Full Name": u.full_name,
      "Email": u.email ?? "",
      "Phone": u.phone ?? "",
      "WhatsApp": u.whatsapp ?? "",
      "Roles": u.roles.map(r => r.name).join(", "),
      "Faculty Subject": (u.faculty_subjects ?? []).join(", "),
      "Status": u.is_active ? "Active" : "Inactive",
      "Created At": new Date(u.created_at).toLocaleDateString("en-IN"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 16 },
      { wch: 28 }, { wch: 20 }, { wch: 10 }, { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `users_export_${date}.xlsx`);
    toast({ title: "Exported", description: `${rows.length} users exported to Excel.` });
  };

  const filtered = users
    .filter(u => {
      const matchesSearch = !search ||
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.roles.some(r => r.name === roleFilter);
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-sm text-muted-foreground">
            {users.filter(u => u.is_active).length} active · {users.filter(u => !u.is_active).length} inactive
          </p>
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
          <Button variant="outline" onClick={handleExportExcel} disabled={filtered.length === 0}>
            <Download className="mr-2 h-4 w-4 text-emerald-600" />
            Export Excel
          </Button>
          <Button onClick={() => { setEditUser(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {/* Search + Role filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, username or email…"
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

        <div className="flex flex-wrap gap-1.5">
          {["all", ...roles.map(r => r.name)].map(name => (
            <button
              key={name}
              onClick={() => setRoleFilter(name)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                roleFilter === name
                  ? name === "all"
                    ? "bg-foreground text-background border-foreground"
                    : (ROLE_COLORS[name] ?? "bg-primary/10 text-primary border-primary/30") + " ring-1 ring-offset-1"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {name === "all" ? "All" : name}
              {name !== "all" && (
                <span className="ml-1.5 opacity-60">
                  {users.filter(u => u.roles.some(r => r.name === name)).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(u => (
                <div key={u.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors ${!u.is_active ? "opacity-50" : ""}`}>
                  {/* Avatar — click to update photo */}
                  <button
                    type="button"
                    onClick={() => setPhotoTarget(u)}
                    title="Update photo"
                    className="relative group shrink-0"
                  >
                    <UserAvatar user={u} size="md" />
                    <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="h-3.5 w-3.5 text-white" />
                    </span>
                  </button>

                  {/* Name + username */}
                  <div className="w-44 shrink-0 min-w-0">
                    <span className="font-semibold text-sm truncate block">{u.full_name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${u.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                      <span className="text-xs text-muted-foreground">@{u.username}</span>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="hidden md:flex items-center gap-1.5 w-52 shrink-0 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    {u.email
                      ? <a href={`mailto:${u.email}`} className="text-xs text-muted-foreground truncate hover:text-primary hover:underline transition-colors">{u.email}</a>
                      : <span className="text-xs italic opacity-40">—</span>}
                  </div>

                  {/* Phone */}
                  <div className="hidden lg:flex items-center gap-1.5 w-36 shrink-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    {u.phone
                      ? <a href={`tel:${u.phone}`} className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">{u.phone}</a>
                      : <span className="text-xs italic opacity-40">—</span>}
                  </div>

                  {/* Role badges */}
                  <div className="hidden sm:flex flex-wrap gap-1 justify-end flex-1">
                    {u.roles.map(r => (
                      <span key={r.id} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[r.name] ?? ""}`}>
                        {r.name}
                      </span>
                    ))}
                    {(u.faculty_subjects ?? []).map(subject => (
                      <span key={subject} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SUBJECT_COLORS[subject]}`}>
                        {subject}
                      </span>
                    ))}
                  </div>

                  {/* Action menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => { setEditUser(u); setDialogOpen(true); }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPhotoTarget(u)}>
                        <Camera className="mr-2 h-3.5 w-3.5" /> Update Photo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResetTarget(u)} className="text-amber-600 focus:text-amber-600">
                        <KeyRound className="mr-2 h-3.5 w-3.5" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {u.is_active ? (
                        <DropdownMenuItem onClick={() => setDeleteTarget(u)} className="text-destructive focus:text-destructive">
                          <UserX className="mr-2 h-3.5 w-3.5" /> Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => reactivateMutation.mutate(u.id)}
                          disabled={reactivateMutation.isPending}
                          className="text-emerald-600 focus:text-emerald-600"
                        >
                          <UserCheck className="mr-2 h-3.5 w-3.5" /> Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditUser(null); }}
        editUser={editUser}
        roles={roles}
      />
      {photoTarget && (
        <PhotoDialog user={photoTarget} onClose={() => setPhotoTarget(null)} />
      )}
      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      )}
      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Deactivate "${deleteTarget?.full_name}"?`}
        description="The user will be marked inactive and can no longer log in. Their data is preserved."
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
