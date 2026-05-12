import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, ShieldCheck, Phone, Mail, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { getUsers, getRoles, createUser, updateUser, deleteUser } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import type { Role, User } from "@/types";

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-red-100 text-red-700 border-red-200",
  Dean: "bg-violet-100 text-violet-700 border-violet-200",
  Principal: "bg-amber-100 text-amber-700 border-amber-200",
  "Vice-Principal": "bg-orange-100 text-orange-700 border-orange-200",
  Faculty: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Operator: "bg-sky-100 text-sky-700 border-sky-200",
};

const baseSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")),
  full_name: z.string().min(2),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  role_ids: z.array(z.number()).min(1, "Select at least one role"),
});
const createSchema = baseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const editSchema = baseSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").or(z.literal("")),
});
type FormData = z.infer<typeof createSchema>;

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  editUser?: User | null;
  roles: Role[];
}

function UserDialog({ open, onClose, editUser, roles }: UserDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!editUser;

  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: { username: "", email: "", full_name: "", phone: "", whatsapp: "", password: "", role_ids: [] },
  });

  useEffect(() => {
    if (open) {
      const roleIds = editUser?.roles.map((r) => r.id) ?? [];
      setSelectedRoles(roleIds);
      reset({
        username: editUser?.username ?? "",
        email: editUser?.email ?? "",
        full_name: editUser?.full_name ?? "",
        phone: editUser?.phone ?? "",
        whatsapp: editUser?.whatsapp ?? "",
        password: "",
        role_ids: roleIds,
      });
    }
  }, [open, editUser, reset]);

  const toggleRole = (id: number) => {
    setSelectedRoles((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      setValue("role_ids", next, { shouldValidate: true });
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload: Record<string, unknown> = {
        ...data,
        role_ids: selectedRoles,
        email: data.email || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
      };
      if (isEdit) {
        if (!data.password) delete payload.password;
        return updateUser(editUser!.id, payload);
      }
      return createUser(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: isEdit ? "User updated" : "User created", variant: "success" as "default" });
      reset();
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save user.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, role_ids: selectedRoles }))} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input {...register("username")} placeholder="jdoe" disabled={isEdit} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register("email")} placeholder="jdoe@example.com" type="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input {...register("full_name")} placeholder="John Doe" />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register("phone")} placeholder="+91 9XXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input {...register("whatsapp")} placeholder="+91 9XXXXXXXXX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{isEdit ? "New Password (leave blank to keep)" : "Password"}</Label>
            <Input {...register("password")} type="password" placeholder="Min 8 characters" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRole(r.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedRoles.includes(r.id)
                      ? (ROLE_COLORS[r.name] ?? "bg-primary/10 text-primary border-primary/20") + " ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
            {selectedRoles.length === 0 && <p className="text-xs text-destructive">Select at least one role</p>}
          </div>
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

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers().then((r) => r.data),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => getRoles().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted" });
    },
  });

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} total users</p>
        </div>
        <Button onClick={() => { setEditUser(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground/70">Try adjusting your search or create a new user.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Roles</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                            {u.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> {u.email}
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" /> {u.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r.id}
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[r.name] ?? ""}`}
                            >
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditUser(u); setDialogOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(u)}
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

      <UserDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditUser(null); }}
        editUser={editUser}
        roles={roles}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.full_name}"?`}
        description="This will permanently remove the user and all their assignments."
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// Missing import fix
function Users({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
}
