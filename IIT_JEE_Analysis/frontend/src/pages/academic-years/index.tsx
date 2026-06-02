import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Pencil, Trash2, Loader2, CalendarDays, CheckCircle2, Star,
} from "lucide-react";

import {
  getAcademicYears, createAcademicYear, updateAcademicYear,
  setCurrentAcademicYear, deleteAcademicYear,
} from "@/lib/api";
import { useAcademicYearStore } from "@/store/academicYear";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { AcademicYear } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Required").regex(/^\d{4}-\d{2,4}$/, 'Format: "2024-25"'),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
});
type FormData = z.infer<typeof schema>;

function YearDialog({
  open, onClose, editItem,
}: { open: boolean; onClose: () => void; editItem?: AcademicYear | null }) {
  const qc = useQueryClient();
  const isEdit = !!editItem;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: editItem?.name ?? "",
        start_date: editItem?.start_date ?? "",
        end_date: editItem?.end_date ?? "",
      });
    }
  }, [open, editItem, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updateAcademicYear(editItem!.id, data) : createAcademicYear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-years"] });
      toast({ title: isEdit ? "Year updated" : "Year created" });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Could not save.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Academic Year" : "Add Academic Year"}</DialogTitle>
        </DialogHeader>
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

export default function AcademicYearsPage() {
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
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["academic-years"] });
      setSelectedYear(res.data);
      toast({ title: `${res.data.name} is now the current year` });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAcademicYear(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["academic-years"] });
      toast({ title: "Year deleted" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Cannot delete.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const currentYear = years.find(y => y.is_current);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Academic Years</h2>
          <p className="text-sm text-muted-foreground">
            Manage academic year periods. The current year drives all section and student mappings.
          </p>
        </div>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Year
        </Button>
      </div>

      {currentYear && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="font-semibold text-primary">{currentYear.name} — Current Year</p>
            <p className="text-xs text-muted-foreground">
              {currentYear.start_date} → {currentYear.end_date}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : years.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No academic years yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Create the first year to get started.</p>
            </div>
          ) : (
            <table className="w-full border-collapse border-spacing-0 text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Year</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Start Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">End Date</th>
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
                      {y.is_current ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-medium">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Current
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!y.is_current && (
                          <Button
                            variant="ghost" size="sm" className="h-8 text-xs gap-1.5"
                            onClick={() => setCurrentMutation.mutate(y.id)}
                            disabled={setCurrentMutation.isPending}
                            title="Set as current year"
                          >
                            <Star className="h-3.5 w-3.5" /> Set Current
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => { setEditItem(y); setDialogOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(y)}
                          disabled={y.is_current}
                          title={y.is_current ? "Cannot delete current year" : "Delete year"}
                        >
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

      <YearDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null); }}
        editItem={editItem}
      />

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
