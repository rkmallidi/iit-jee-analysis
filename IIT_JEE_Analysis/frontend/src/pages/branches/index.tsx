import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { getBranches, createBranch, updateBranch, deleteBranch } from "@/lib/api";
import { EntityPage } from "@/components/layout/EntityPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { Branch } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  code: z.string().min(2, "Code required"),
  address: z.string().optional(),
  is_active: z.boolean(),
});
type FormData = z.infer<typeof schema>;

function BranchDialog({ open, onClose, editItem }: { open: boolean; onClose: () => void; editItem?: Branch | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", address: "", is_active: true },
  });

  useEffect(() => {
    if (open) reset({
      name: editItem?.name ?? "",
      code: editItem?.code ?? "",
      address: editItem?.address ?? "",
      is_active: editItem?.is_active ?? true,
    });
  }, [open, editItem]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updateBranch(editItem!.id, data) : createBranch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: isEdit ? "Branch updated" : "Branch created" });
      reset(); onClose();
    },
    onError: () => toast({ title: "Error saving branch", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Branch" : "New Branch"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
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
            <div>
              <p className="font-medium text-sm">Active</p>
              <p className="text-xs text-muted-foreground">Inactive branches won't appear in mappings</p>
            </div>
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

export default function BranchesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Branch | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => getBranches().then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id: number) => deleteBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); toast({ title: "Branch deleted" }); },
  });

  return (
    <EntityPage
      title="Branches"
      subtitle={`${items.length} branches configured`}
      items={items}
      isLoading={isLoading}
      onAdd={() => { setEditItem(null); setOpen(true); }}
      onEdit={(b) => { setEditItem(b); setOpen(true); }}
      onDelete={(b) => { if (confirm(`Delete branch "${b.name}"?`)) del.mutate(b.id); }}
      searchFilter={(b, q) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)}
      searchPlaceholder="Search by name or code…"
      columns={[
        { key: "name", label: "Branch Name", render: (b) => <span className="font-semibold">{b.name}</span> },
        { key: "code", label: "Code", render: (b) => <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{b.code}</code> },
        { key: "address", label: "Address", render: (b) => <span className="text-muted-foreground">{b.address || "—"}</span> },
        {
          key: "is_active",
          label: "Status",
          render: (b) => (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
              {b.is_active ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      dialog={<BranchDialog open={open} onClose={() => { setOpen(false); setEditItem(null); }} editItem={editItem} />}
    />
  );
}
