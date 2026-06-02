import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, AlertCircle, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { validateOMRFile, saveOMRResults } from "@/lib/api";
import type { Exam, OMRValidationSummary, OMRValidationRecord } from "@/types";

interface OMRUploadDialogProps {
  exam: Exam;
  branchId: number;
  branchName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OMRUploadDialog({ exam, branchId, branchName, open, onOpenChange }: OMRUploadDialogProps) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<OMRValidationSummary | null>(null);
  const [stage, setStage] = useState<"upload" | "review" | "saving">("upload");

  const validateMutation = useMutation({
    mutationFn: (f: File) => validateOMRFile(exam.id, branchId, f).then(r => r.data),
    onSuccess: (data) => {
      setValidation(data);
      setStage("review");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Validation failed";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (records: OMRValidationRecord[]) =>
      saveOMRResults(exam.id, branchId, records, {
        file_name: file?.name ?? "",
        valid_count: validation?.valid_count ?? 0,
        absent_count: validation?.missing_students.length ?? 0,
        duplicate_count: validation?.duplicate_ids.length ?? 0,
        invalid_count: validation?.invalid_student_ids.length ?? 0,
        absent_list: validation?.missing_students ?? [],
      }).then(r => r.data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      if (data.errors?.length) {
        toast({
          title: `${data.saved} saved, ${data.errors.length} skipped`,
          description: data.errors.join("\n"),
          variant: "destructive",
        });
      } else {
        toast({ title: `${data.saved} results saved successfully` });
      }
      setStage("upload");
      setFile(null);
      setValidation(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? "Save failed";
      toast({ title: msg, variant: "destructive" });
      setStage("review");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setValidation(null);
      setStage("upload");
    }
  };

  const handleValidate = () => {
    if (file) validateMutation.mutate(file);
  };

  const handleSave = () => {
    if (validation) {
      setStage("saving");
      saveMutation.mutate(validation.file_records);
    }
  };

  const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const downloadCsv = (filename: string, headers: string[], rows: unknown[][]) => {
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadAbsentStudents = () => {
    if (!validation) return;
    const absent = validation.absent_students?.length
      ? validation.absent_students
      : validation.missing_students.map(omr_id => ({ omr_id, admission_no: "", name: "" }));
    downloadCsv(
      `${exam.exam_code}_${exam.paper}_${branchName}_absent_students.csv`,
      ["OMR ID", "Admission No", "Name"],
      absent.map(s => [s.omr_id, s.admission_no, s.name])
    );
  };

  const downloadErrorRecords = () => {
    if (!validation) return;
    const rows = [
      ...validation.errors.map(error => ["Validation Error", "", error]),
      ...validation.duplicate_ids.map(id => ["Duplicate OMR ID", id, "Duplicate record in uploaded file"]),
      ...validation.invalid_student_ids.map(id => ["Invalid OMR ID", id, "Student not enrolled or invalid answer data"]),
    ];
    downloadCsv(
      `${exam.exam_code}_${exam.paper}_${branchName}_error_records.csv`,
      ["Type", "OMR ID", "Details"],
      rows
    );
  };

  const handleClose = () => {
    if (stage !== "saving") {
      setStage("upload");
      setFile(null);
      setValidation(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload OMR Results</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {exam.exam_code} • {exam.paper} • {branchName} • {new Date(exam.exam_date).toLocaleDateString()}
          </p>
        </DialogHeader>

        {/* Upload Stage */}
        {stage === "upload" && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium mb-1">Select OMR file (CSV)</p>
              <p className="text-xs text-muted-foreground mb-4">
                Format: x,OMR_ID,answer1,answer2,...
              </p>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                disabled={validateMutation.isPending}
                className="hidden"
                id="omr-file"
              />
              <label htmlFor="omr-file">
                <Button variant="outline" asChild className="cursor-pointer">
                  <span>Choose File</span>
                </Button>
              </label>
              {file && (
                <p className="text-xs text-green-600 mt-2 font-medium">✓ {file.name}</p>
              )}
            </div>

            <Button
              onClick={handleValidate}
              disabled={!file || validateMutation.isPending}
              className="w-full"
            >
              {validateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validate File
            </Button>
          </div>
        )}

        {/* Review Stage */}
        {stage === "review" && validation && (
          <div className="space-y-4 py-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-700">{validation.valid_count}</div>
                  <p className="text-xs text-green-600">Valid Records</p>
                </CardContent>
              </Card>
              <Card className={`border-2 ${validation.duplicate_ids.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <CardContent className="pt-4">
                  <div className={`text-2xl font-bold ${validation.duplicate_ids.length > 0 ? "text-red-700" : "text-gray-700"}`}>
                    {validation.duplicate_ids.length}
                  </div>
                  <p className={`text-xs ${validation.duplicate_ids.length > 0 ? "text-red-600" : "text-gray-600"}`}>
                    Duplicates
                  </p>
                </CardContent>
              </Card>
              <Card className={`border-2 ${validation.invalid_student_ids.length > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                <CardContent className="pt-4">
                  <div className={`text-2xl font-bold ${validation.invalid_student_ids.length > 0 ? "text-red-700" : "text-gray-700"}`}>
                    {validation.invalid_student_ids.length}
                  </div>
                  <p className={`text-xs ${validation.invalid_student_ids.length > 0 ? "text-red-600" : "text-gray-600"}`}>
                    Invalid
                  </p>
                </CardContent>
              </Card>
              <Card className={`border-2 ${validation.missing_students.length > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                <CardContent className="pt-4">
                  <div className={`text-2xl font-bold ${validation.missing_students.length > 0 ? "text-amber-700" : "text-gray-700"}`}>
                    {validation.missing_students.length}
                  </div>
                  <p className={`text-xs ${validation.missing_students.length > 0 ? "text-amber-600" : "text-gray-600"}`}>
                    Absent
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Validation Errors:</p>
                    <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {validation.errors.slice(0, 10).map((err, i) => (
                        <div key={i}>{err}</div>
                      ))}
                      {validation.errors.length > 10 && (
                        <div className="italic">... and {validation.errors.length - 10} more</div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {(validation.errors.length > 0 || validation.duplicate_ids.length > 0 || validation.invalid_student_ids.length > 0 || validation.missing_students.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {(validation.errors.length > 0 || validation.duplicate_ids.length > 0 || validation.invalid_student_ids.length > 0) && (
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={downloadErrorRecords}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Error Records
                  </Button>
                )}
                {validation.missing_students.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={downloadAbsentStudents}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Absent Students
                  </Button>
                )}
              </div>
            )}

            {/* Missing students */}
            {validation.missing_students.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Absent Students ({validation.missing_students.length}):</p>
                    <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {(validation.absent_students?.length
                        ? validation.absent_students
                        : validation.missing_students.map(omr_id => ({ omr_id, admission_no: "", name: "" }))
                      ).slice(0, 15).map((student, i) => (
                        <div key={i}>
                          {student.admission_no || student.omr_id}
                          {student.name ? ` - ${student.name}` : ""}
                        </div>
                      ))}
                      {validation.missing_students.length > 15 && (
                        <div className="italic">... and {validation.missing_students.length - 15} more</div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.valid_count > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertDescription className="text-green-800">
                  Ready to save {validation.valid_count} valid record{validation.valid_count !== 1 ? "s" : ""}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={stage === "saving"}>
            {stage === "upload" ? "Cancel" : "Back"}
          </Button>
          {stage === "upload" && (
            <Button onClick={handleValidate} disabled={!file || validateMutation.isPending}>
              {validateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validate
            </Button>
          )}
          {stage === "review" && validation && validation.valid_count > 0 && (
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save {validation.valid_count} Records
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
