import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { getClasses, createClass, updateClass, deleteClass } from "@/lib/api";
import { EntityPage } from "@/components/layout/EntityPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { Class } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

function ClassDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Class | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", is_active: true },
  });

  useEffect(() => {
    if (open) reset({ name: editItem?.name ?? "", is_active: editItem?.is_active ?? true });
  }, [open, editItem]);

  const mutation = useMutation({
    mutationFn: (d: FormData) => isEdit ? updateClass(editItem!.id, d) : createClass(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: isEdit ? "Class updated" : "Class created" });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Class" : "New Class"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Class Name</Label>
            <Input {...register("name")} placeholder="e.g. Class XI, Class XII" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
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

export default function ClassesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Class | null>(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => getClasses().then(r => r.data),
  });
  const del = useMutation({
    mutationFn: (id: number) => deleteClass(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: "Deleted" }); },
  });
  return (
    <EntityPage
      title="Classes"
      subtitle={`${items.length} class levels`}
      items={items}
      isLoading={isLoading}
      onAdd={() => { setEditItem(null); setOpen(true); }}
      onEdit={(c) => { setEditItem(c); setOpen(true); }}
      onDelete={(c) => del.mutate(c.id)}
      itemLabel={(c) => c.name}
      searchFilter={(c, q) => c.name.toLowerCase().includes(q)}
      searchPlaceholder="Search classes…"
      columns={[
        { key: "name", label: "Class Name", render: (c) => <span className="font-semibold">{c.name}</span> },
        { key: "is_active", label: "Status", render: (c) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
            {c.is_active ? "Active" : "Inactive"}
          </span>
        )},
      ]}
      dialog={<ClassDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
    />
  );
}
