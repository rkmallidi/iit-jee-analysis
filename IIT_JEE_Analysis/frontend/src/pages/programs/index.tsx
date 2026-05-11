import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { getPrograms, createProgram, updateProgram, deleteProgram } from "@/lib/api";
import { EntityPage } from "@/components/layout/EntityPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { Program } from "@/types";

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

function ProgramDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Program | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", description: "", is_active: true },
  });

  useEffect(() => {
    if (open) reset({
      name: editItem?.name ?? "",
      code: editItem?.code ?? "",
      description: editItem?.description ?? "",
      is_active: editItem?.is_active ?? true,
    });
  }, [open, editItem]);

  const mutation = useMutation({
    mutationFn: (d: FormData) => isEdit ? updateProgram(editItem!.id, d) : createProgram(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["programs"] }); toast({ title: isEdit ? "Updated" : "Created" }); reset(); onClose(); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Program" : "New Program"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
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
            <Switch checked={watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} />
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

export default function ProgramsPage() {
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
      title="Programs"
      subtitle={`${items.length} programs`}
      items={items}
      isLoading={isLoading}
      onAdd={() => { setEditItem(null); setOpen(true); }}
      onEdit={(p) => { setEditItem(p); setOpen(true); }}
      onDelete={(p) => { if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id); }}
      searchFilter={(p, q) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)}
      searchPlaceholder="Search programs…"
      columns={[
        { key: "name", label: "Program", render: (p) => <span className="font-semibold">{p.name}</span> },
        { key: "code", label: "Code", render: (p) => <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{p.code}</code> },
        { key: "description", label: "Description", render: (p) => <span className="text-muted-foreground">{p.description || "—"}</span> },
        { key: "is_active", label: "Status", render: (p) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{p.is_active ? "Active" : "Inactive"}</span> },
      ]}
      dialog={<ProgramDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
    />
  );
}
