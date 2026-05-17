import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  UserCircle2, Search, TrendingUp, TrendingDown, Minus,
  ChevronUp, ChevronDown, FlaskConical, Award, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { searchStudents, getStudentReport, getAcademicYears } from "@/lib/api";
import { useAcademicYearStore } from "@/store/academicYear";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { StudentExamHistory, StudentSearchResult } from "@/types";

const SUBJECT_COLORS = { Math: "#3b82f6", Physics: "#f59e0b", Chemistry: "#10b981" };

function RankBadge({ val }: { val: number | null }) {
  if (val == null) return <span className="text-muted-foreground/40 text-xs">—</span>;
  if (val < 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <ChevronUp className="h-3 w-3" />+{Math.abs(val)}
    </span>
  );
  if (val > 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-500">
      <ChevronDown className="h-3 w-3" />+{val}
    </span>
  );
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function MiBadge({ above }: { above: boolean }) {
  return above
    ? <FlaskConical className="h-3.5 w-3.5 text-violet-500" />
    : <span className="text-muted-foreground/30 text-xs">—</span>;
}

function PercentileBand({ band }: { band: string }) {
  const colors: Record<string, string> = {
    "Top 1%":    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "Top 5%":    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "Top 10%":   "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    "Top 25%":   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "Top 50%":   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "Below 50%": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", colors[band] ?? "bg-muted text-muted-foreground")}>
      {band}
    </span>
  );
}

export default function StudentReportPage() {
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["student-search", query, yearId],
    queryFn: () => searchStudents(query, yearId).then(r => r.data),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["student-report", selectedStudentId, yearId],
    queryFn: () => getStudentReport(selectedStudentId!, yearId).then(r => r.data),
    enabled: selectedStudentId != null,
  });

  const trendData = (report?.history ?? []).map((h: StudentExamHistory) => ({
    exam: `${h.exam_code} ${h.paper}`,
    Total: h.total_score,
    Math: h.math_score,
    Physics: h.physics_score,
    Chemistry: h.chemistry_score,
    Percentile: h.overall_percentile,
  }));

  const subjectRadar = report ? [
    { subject: "Math",    Avg: report.subject_summary.math.avg_pct,     Correct: report.subject_summary.math.avg_correct },
    { subject: "Physics", Avg: report.subject_summary.physics.avg_pct,  Correct: report.subject_summary.physics.avg_correct },
    { subject: "Chem",    Avg: report.subject_summary.chemistry.avg_pct, Correct: report.subject_summary.chemistry.avg_correct },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <UserCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Student Report Card</h1>
            <p className="text-xs text-muted-foreground">Full academic journey & performance trends</p>
          </div>
        </div>
        <Select
          value={selectedYear ? String(selectedYear.id) : ""}
          onValueChange={v => {
            const yr = years.find(y => y.id === +v);
            if (yr) setSelectedYear(yr);
          }}
        >
          <SelectTrigger className="w-40 h-9">
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search student by name or admission number…"
              className="pl-9 h-10"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
                {searching && (
                  <div className="p-3 text-sm text-muted-foreground text-center">Searching…</div>
                )}
                {!searching && searchResults.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground text-center">No students found</div>
                )}
                {searchResults.map((s: StudentSearchResult) => (
                  <button
                    key={s.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted text-left transition-colors"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setQuery(s.name);
                      setShowDropdown(false);
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.admission_no} · {s.branch_name ?? "—"} · {s.section_name ?? "—"}</p>
                    </div>
                    {s.target_rank && (
                      <Badge variant="outline" className="ml-auto text-xs shrink-0">{s.target_rank}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedStudentId && !reportLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCircle2 className="h-12 w-12 text-muted-foreground/20 mb-3" />
          <p className="text-muted-foreground font-medium">Search for a student to view their report card</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Type at least 2 characters to search</p>
        </div>
      )}

      {reportLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted rounded-xl" /></Card>
          ))}
        </div>
      )}

      {report && !reportLoading && (
        <>
          {/* Student profile card */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-lg font-bold">
                  {report.student.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{report.student.name}</h2>
                  <p className="text-sm text-muted-foreground">{report.student.admission_no} · {report.student.branch_name ?? "—"}</p>
                  {report.student.target_rank && (
                    <Badge className="mt-1.5 text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300">
                      <Award className="h-3 w-3 mr-1" />{report.student.target_rank}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center shrink-0">
                  <div>
                    <p className="text-xs text-muted-foreground">Exams</p>
                    <p className="text-2xl font-bold">{report.total_exams}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MI Cleared</p>
                    <p className="text-2xl font-bold text-violet-600">{report.mi_cleared_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">{report.best_subject ?? "—"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject summary pills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Mathematics", key: "math",    color: "border-blue-200 dark:border-blue-800",    accent: "text-blue-600" },
              { label: "Physics",     key: "physics",  color: "border-amber-200 dark:border-amber-800",  accent: "text-amber-600" },
              { label: "Chemistry",   key: "chemistry", color: "border-emerald-200 dark:border-emerald-800", accent: "text-emerald-600" },
            ].map(({ label, key, color, accent }) => {
              const s = report.subject_summary[key as keyof typeof report.subject_summary];
              const isBest  = report.best_subject  === label;
              const isWorst = report.worst_subject === label;
              return (
                <div key={key} className={cn("rounded-xl border p-4 space-y-2 relative", color)}>
                  {isBest  && <span className="absolute top-2 right-2 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">Best</span>}
                  {isWorst && <span className="absolute top-2 right-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-full">Weakest</span>}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={cn("text-3xl font-bold tabular-nums", accent)}>{s.avg_score.toFixed(1)}</p>
                  <div className="grid grid-cols-3 gap-2 text-center border-t pt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Avg %</p>
                      <p className="text-sm font-semibold">{s.avg_pct.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Correct</p>
                      <p className="text-sm font-semibold text-emerald-600">{s.avg_correct.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Wrong</p>
                      <p className="text-sm font-semibold text-rose-500">{s.avg_wrong.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts row */}
          {trendData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Score trend */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Score Trend Across Exams</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="exam" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="Total"     stroke="#6b7280" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Math"      stroke={SUBJECT_COLORS.Math}      strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Physics"   stroke={SUBJECT_COLORS.Physics}   strokeWidth={1.5} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Chemistry" stroke={SUBJECT_COLORS.Chemistry} strokeWidth={1.5} dot={{ r: 2 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Subject radar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Subject Profile</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={subjectRadar} cx="50%" cy="50%" outerRadius={70}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <Radar name="Avg %" dataKey="Avg" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${Number(v).toFixed(1)}%`, "Avg %"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Percentile trend */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Percentile Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="exam" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${Number(v).toFixed(1)}%`, "Percentile"]} />
                    <Line type="monotone" dataKey="Percentile" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Exam history table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Exam History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-medium">Exam</th>
                      <th className="px-3 py-2.5 text-left font-medium">Date</th>
                      <th className="px-3 py-2.5 text-right font-medium">Score</th>
                      <th className="px-3 py-2.5 text-right font-medium">Math</th>
                      <th className="px-3 py-2.5 text-right font-medium">Phys</th>
                      <th className="px-3 py-2.5 text-right font-medium">Chem</th>
                      <th className="px-3 py-2.5 text-right font-medium">Rank</th>
                      <th className="px-3 py-2.5 text-center font-medium">Δ Rank</th>
                      <th className="px-3 py-2.5 text-center font-medium">%ile</th>
                      <th className="px-3 py-2.5 text-left font-medium">Band</th>
                      <th className="px-3 py-2.5 text-center font-medium">MI</th>
                      <th className="px-3 py-2.5 text-right font-medium">Correct</th>
                      <th className="px-3 py-2.5 text-right font-medium">Wrong</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.history.map((h: StudentExamHistory, i: number) => (
                      <tr key={`${h.exam_id}-${i}`} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold">{h.exam_code}</div>
                          <div className="text-xs text-muted-foreground">{h.exam_type} {h.paper}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{h.exam_date}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{h.total_score}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">{h.math_score}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">{h.physics_score}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{h.chemistry_score}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{h.overall_rank}</td>
                        <td className="px-3 py-2.5 text-center"><RankBadge val={h.rank_change_overall} /></td>
                        <td className="px-3 py-2.5 text-center tabular-nums">{h.overall_percentile?.toFixed(1)}%</td>
                        <td className="px-3 py-2.5"><PercentileBand band={h.percentile_band} /></td>
                        <td className="px-3 py-2.5 text-center"><MiBadge above={h.above_mi_total} /></td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{h.correct}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-rose-500">{h.wrong}</td>
                      </tr>
                    ))}
                    {report.history.length === 0 && (
                      <tr><td colSpan={13} className="px-4 py-8 text-center text-muted-foreground text-sm">No exam history yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Faculty snapshots */}
          {report.history.some(h => h.math_faculty_name || h.physics_faculty_name || h.chemistry_faculty_name) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Faculty Snapshot per Exam</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Exam</th>
                      <th className="px-4 py-2 text-left font-medium">Math Faculty</th>
                      <th className="px-4 py-2 text-left font-medium">Physics Faculty</th>
                      <th className="px-4 py-2 text-left font-medium">Chemistry Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.history.map((h: StudentExamHistory, i: number) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-2 font-medium">{h.exam_code} {h.paper}</td>
                        <td className="px-4 py-2 text-muted-foreground">{h.math_faculty_name ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{h.physics_faculty_name ?? "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{h.chemistry_faculty_name ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Cumulative (Advanced) */}
          {report.cumulative_history.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Advanced — Cumulative (P1+P2)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-2.5 text-left font-medium">Exam</th>
                        <th className="px-3 py-2.5 text-right font-medium">P1</th>
                        <th className="px-3 py-2.5 text-right font-medium">P2</th>
                        <th className="px-3 py-2.5 text-right font-medium">Total</th>
                        <th className="px-3 py-2.5 text-right font-medium">Rank</th>
                        <th className="px-3 py-2.5 text-center font-medium">Δ Rank</th>
                        <th className="px-3 py-2.5 text-center font-medium">%ile</th>
                        <th className="px-3 py-2.5 text-left font-medium">Band</th>
                        <th className="px-3 py-2.5 text-center font-medium">MI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.cumulative_history.map((c, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="px-3 py-2.5 font-medium">{c.exam_code}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{c.p1_total}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{c.p2_total}</td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums">{c.cumulative_total}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{c.overall_rank}</td>
                          <td className="px-3 py-2.5 text-center"><RankBadge val={c.rank_change_overall} /></td>
                          <td className="px-3 py-2.5 text-center tabular-nums">{c.overall_percentile?.toFixed(1)}%</td>
                          <td className="px-3 py-2.5"><PercentileBand band={c.percentile_band} /></td>
                          <td className="px-3 py-2.5 text-center"><MiBadge above={c.above_mi_total} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
