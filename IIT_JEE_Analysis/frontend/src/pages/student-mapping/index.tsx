import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAcademicYearStore } from "@/store/academicYear";
import {
  Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, Search, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  getAcademicYears, getStudents, getBranches,
  downloadSectionTemplate, uploadSectionExcel,
} from "@/lib/api";
import type { Branch, Student, UploadResult } from "@/types";

// ── Upload result dialog ───────────────────────────────────────────────────────
function UploadResultDialog({ result, onClose }: { result: UploadResult; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
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
              <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {result.errors.length} validation error{result.errors.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-1 max-h-52 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-[11px] text-destructive/80 leading-snug">{e}</li>
                ))}
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
export default function StudentMappingPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

  const [search, setSearch] = useState("");
  const [filterBranchId, setFilterBranchId] = useState<string>("__all__");
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  useEffect(() => {
    if (!selectedYear && years.length > 0) {
      const current = years.find(y => y.is_current) ?? years[0];
      setSelectedYear(current);
    }
  }, [years, selectedYear, setSelectedYear]);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => getBranches().then(r => r.data),
  });

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students", yearId],
    queryFn: () => getStudents({ academic_year_id: yearId }).then(r => r.data),
    enabled: !!yearId,
  });

  // Only students that have a section assignment for this year
  const assigned = students.filter(s => s.section_mapping);

  const filtered = assigned.filter(s => {
    const bs = s.section_mapping?.branch_section;
    if (filterBranchId !== "__all__" && bs?.branch_id !== +filterBranchId) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.admission_no.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q)
      );
    }
    return true;
  });

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await downloadSectionTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_section_template.xlsx";
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
    if (!yearId) {
      toast({ title: "Select an academic year first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadSectionExcel(file, yearId);
      qc.invalidateQueries({ queryKey: ["students", yearId] });
      setUploadResult(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Upload failed";
      toast({ title: "Upload error", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">Student Section Mapping</h2>
          <p className="text-sm text-muted-foreground">
            Upload and manage student section assignments per academic year.
          </p>
        </div>
        <Select
          value={selectedYear ? String(selectedYear.id) : ""}
          onValueChange={v => {
            const yr = years.find(y => y.id === +v);
            if (yr) setSelectedYear(yr);
          }}
        >
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y.id} value={String(y.id)}>
                {y.name}{y.is_current ? " ★" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        <Button variant="outline" onClick={handleDownloadTemplate} disabled={downloading}>
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Template
        </Button>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !yearId}
          title={!yearId ? "Select a year first" : undefined}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Upload Excel
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {/* Branch filter */}
          <Select value={filterBranchId} onValueChange={setFilterBranchId}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-52 h-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {yearId && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {assigned.length} student{assigned.length !== 1 ? "s" : ""} assigned
          {filterBranchId !== "__all__" || search ? ` · ${filtered.length} shown` : ""}
          {selectedYear && <span className="ml-2 text-muted-foreground/60">— {selectedYear.name}</span>}
        </p>
      )}

      {/* No year selected */}
      {!yearId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium text-muted-foreground">Select an academic year to view assignments</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {yearId && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">No assignments found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Upload an Excel file to assign students to sections.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-3 font-semibold text-muted-foreground whitespace-nowrap">Adm. No</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Phone</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Section Assignment</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(s => {
                      const bs = s.section_mapping?.branch_section;
                      return (
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
                            {bs ? (
                              <div className="flex items-center gap-1 text-xs flex-wrap">
                                <span className="font-medium text-foreground">{bs.branch?.name}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{bs.program?.name}</span>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground">{bs.class_?.name}</span>
                                <Badge variant="secondary" className="font-mono text-[11px]">{bs.section?.name}</Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                              {s.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {uploadResult && (
        <UploadResultDialog result={uploadResult} onClose={() => setUploadResult(null)} />
      )}
    </div>
  );
}
