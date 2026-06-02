import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  PieChart, Pie, Legend,
} from "recharts";
import {
  BarChart2, Users, TrendingUp, Award, FlaskConical,
  ChevronUp, ChevronDown, Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEvaluatedExams, getExamPerformance, getAcademicYears } from "@/lib/api";
import { useAcademicYearStore } from "@/store/academicYear";
import { cn } from "@/lib/utils";
import type { BranchComparisonRow, Top10Row, FacultyPerfRow } from "@/types";

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3b82f6",
  Physics:     "#f59e0b",
  Chemistry:   "#10b981",
};
const BAND_COLORS: Record<string, string> = {
  "Top 1%":    "#7c3aed",
  "Top 5%":    "#2563eb",
  "Top 10%":   "#0891b2",
  "Top 25%":   "#16a34a",
  "Top 50%":   "#ca8a04",
  "Below 50%": "#dc2626",
};

function StatChip({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-1", accent)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function RankChange({ val }: { val: number | null }) {
  if (val == null) return <span className="text-muted-foreground/40 text-xs">—</span>;
  if (val < 0) return <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold"><ChevronUp className="h-3.5 w-3.5" />{Math.abs(val)}</span>;
  if (val > 0) return <span className="flex items-center gap-0.5 text-xs text-rose-500 font-semibold"><ChevronDown className="h-3.5 w-3.5" />{val}</span>;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground mx-auto" />;
}

function RadarValueLabel(props: any) {
  const { x, y, value } = props;
  if (x == null || y == null || value == null) return null;
  return (
    <text
      x={x}
      y={y - 8}
      textAnchor="middle"
      className="fill-foreground text-[11px] font-semibold"
    >
      {Number(value).toFixed(1)}
    </text>
  );
}

function PercentileBandLabel(props: any) {
  const { name, value, percent, x, y } = props;
  if (!value || x == null || y == null) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-foreground text-[10px] font-semibold"
    >
      {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
}

export default function AnalyticsPage() {
  const { selectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "branches" | "top10" | "faculty">("overview");

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
  });

  const { data: evalExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["evaluated-exams", yearId],
    queryFn: () => getEvaluatedExams(yearId).then(r => r.data),
  });

  const { data: perf, isLoading: perfLoading } = useQuery({
    queryKey: ["exam-performance", selectedExamId],
    queryFn: () => getExamPerformance(selectedExamId!).then(r => r.data),
    enabled: selectedExamId != null,
  });

  const selectedExamInfo = evalExams.find(e => e.exam_id === selectedExamId);

  const bandData = perf
    ? Object.entries(perf.percentile_bands).map(([name, value]) => ({
        name, value, fill: BAND_COLORS[name] ?? "#94a3b8",
      }))
    : [];

  const subjectRadar = perf ? [
    { subject: "Math",      score: perf.summary.avg_math,      max: perf.max_score / 3 },
    { subject: "Physics",   score: perf.summary.avg_physics,   max: perf.max_score / 3 },
    { subject: "Chemistry", score: perf.summary.avg_chemistry, max: perf.max_score / 3 },
  ] : [];

  const tabs = [
    { key: "overview",  label: "Overview"  },
    { key: "branches",  label: "Branches"  },
    { key: "top10",     label: "Top 10"    },
    { key: "faculty",   label: "Faculty"   },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <BarChart2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Performance Analytics</h1>
            <p className="text-xs text-muted-foreground">Deep-dive into evaluated exam results</p>
          </div>
        </div>
        <Select
          value={selectedExamId != null ? String(selectedExamId) : ""}
          onValueChange={v => setSelectedExamId(+v)}
          disabled={examsLoading || evalExams.length === 0}
        >
          <SelectTrigger className="w-64 h-9">
            <SelectValue placeholder={examsLoading ? "Loading…" : evalExams.length === 0 ? "No evaluated exams" : "Select exam"} />
          </SelectTrigger>
          <SelectContent>
            {evalExams.map(e => (
              <SelectItem key={e.exam_id} value={String(e.exam_id)}>
                {e.exam_code} · {e.exam_type} {e.paper} · {e.exam_date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedExamId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Select an evaluated exam to view analytics</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Only exams with evaluation data appear in the list</p>
          </CardContent>
        </Card>
      ) : perfLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted rounded-xl" /></Card>
          ))}
        </div>
      ) : perf ? (
        <>
          {/* Exam info badge row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{selectedExamInfo?.exam_code}</Badge>
            <Badge variant="outline" className="text-xs">{selectedExamInfo?.exam_type} {selectedExamInfo?.paper}</Badge>
            <Badge variant="outline" className="text-xs">{selectedExamInfo?.exam_date}</Badge>
            <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700">
              <Users className="h-3 w-3 mr-1" />{perf.students} students
            </Badge>
            <Badge className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Max: {perf.max_score} marks
            </Badge>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatChip label="Avg Score"      value={perf.summary.avg_score} sub={`Top: ${perf.summary.top_score}`} />
            <StatChip label="Avg Percentile" value={`${perf.summary.avg_percentile}%`} sub="overall" />
            <StatChip label="Avg Math"       value={perf.summary.avg_math} accent="border-blue-200 dark:border-blue-800" />
            <StatChip label="Avg Physics"    value={perf.summary.avg_physics} accent="border-amber-200 dark:border-amber-800" />
          </div>

          {/* MI row */}
          {perf.summary.mi_total != null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "MI Total",   mi: perf.summary.mi_total,     above: perf.summary.above_mi_total },
                { label: "MI Math",    mi: perf.summary.mi_math,      above: perf.summary.above_mi_math },
                { label: "MI Physics", mi: perf.summary.mi_physics,   above: perf.summary.above_mi_physics },
                { label: "MI Chem",    mi: perf.summary.mi_chemistry, above: perf.summary.above_mi_chemistry },
              ].map(({ label, mi, above }) => (
                <div key={label} className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-3">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-400 tabular-nums">{mi ?? "—"}</p>
                  {above != null && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-violet-600">{above}</span> / {perf.students} above MI
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 border-b pb-0">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Score distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perf.score_distribution} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v, "Students"]} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Percentile band pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Percentile Band Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bandData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={<PercentileBandLabel />}
                        labelLine={false}
                        fontSize={10}
                      >
                        {bandData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Subject radar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Subject Comparison (Avg)</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={subjectRadar} cx="50%" cy="50%" outerRadius={70}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <Radar
                        name="Avg Score"
                        dataKey="score"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                        dot={{ r: 3, fill: "#8b5cf6" }}
                        label={<RadarValueLabel />}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Avg Chemistry chip */}
              <Card className="flex flex-col justify-center">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Avg Chemistry</p>
                    <p className="text-4xl font-bold mt-1 text-emerald-600">{perf.summary.avg_chemistry}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center border-t pt-4">
                    {[
                      { label: "Math",    val: perf.summary.avg_math,      color: "text-blue-600" },
                      { label: "Physics", val: perf.summary.avg_physics,    color: "text-amber-600" },
                      { label: "Chem",    val: perf.summary.avg_chemistry,  color: "text-emerald-600" },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={cn("text-xl font-bold tabular-nums", color)}>{val}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "branches" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Branch Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-medium">#</th>
                        <th className="px-4 py-2.5 text-left font-medium">Branch</th>
                        <th className="px-4 py-2.5 text-right font-medium">Students</th>
                        <th className="px-4 py-2.5 text-right font-medium">Avg Score</th>
                        <th className="px-4 py-2.5 text-right font-medium">Top Score</th>
                        <th className="px-4 py-2.5 text-right font-medium">Avg Math</th>
                        <th className="px-4 py-2.5 text-right font-medium">Avg Physics</th>
                        <th className="px-4 py-2.5 text-right font-medium">Avg Chem</th>
                        <th className="px-4 py-2.5 text-right font-medium">Avg %ile</th>
                        {perf.summary.mi_total != null && <th className="px-4 py-2.5 text-right font-medium">Above MI</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {perf.branch_comparison.map((b: BranchComparisonRow, i: number) => (
                        <tr key={b.branch_id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="px-4 py-2.5 text-muted-foreground font-medium">{i + 1}</td>
                          <td className="px-4 py-2.5 font-semibold">{b.branch_name}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{b.students}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{b.avg_score}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-blue-600">{b.top_score}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{b.avg_math}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{b.avg_physics}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{b.avg_chemistry}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{b.avg_percentile}%</td>
                          {perf.summary.mi_total != null && (
                            <td className="px-4 py-2.5 text-right">
                              {b.above_mi != null
                                ? <span className="text-violet-600 font-semibold">{b.above_mi}</span>
                                : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Branch bar chart */}
                <div className="p-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Avg Score by Branch</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={perf.branch_comparison} margin={{ top: 18, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="branch_name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="avg_math" name="Math" fill={SUBJECT_COLORS.Mathematics} stackId="a" />
                        <Bar dataKey="avg_physics" name="Physics" fill={SUBJECT_COLORS.Physics} stackId="a" />
                        <Bar dataKey="avg_chemistry" name="Chemistry" fill={SUBJECT_COLORS.Chemistry} stackId="a" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="avg_score" position="top" formatter={(v: number) => Number(v).toFixed(1)} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                        </Bar>
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "top10" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Top 10 Students
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-4 py-2.5 text-left font-medium">Rank</th>
                        <th className="px-4 py-2.5 text-left font-medium">Student</th>
                        <th className="px-4 py-2.5 text-left font-medium">Branch</th>
                        <th className="px-4 py-2.5 text-right font-medium">Total</th>
                        <th className="px-4 py-2.5 text-right font-medium">Math</th>
                        <th className="px-4 py-2.5 text-right font-medium">Physics</th>
                        <th className="px-4 py-2.5 text-right font-medium">Chem</th>
                        <th className="px-4 py-2.5 text-right font-medium">%ile</th>
                        <th className="px-4 py-2.5 text-center font-medium">MI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perf.top10.map((s: Top10Row) => (
                        <tr key={s.student_id} className={cn("border-b last:border-0 hover:bg-muted/40", s.rank === 1 && "bg-amber-50/50 dark:bg-amber-950/10")}>
                          <td className="px-4 py-2.5">
                            {s.rank === 1
                              ? <span className="text-amber-500 font-bold text-base">🥇</span>
                              : s.rank === 2
                              ? <span className="text-slate-400 font-bold">🥈</span>
                              : s.rank === 3
                              ? <span className="text-amber-700 font-bold">🥉</span>
                              : <span className="text-muted-foreground font-medium">{s.rank}</span>
                            }
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.admission_no}</div>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.branch_name}</td>
                          <td className="px-4 py-2.5 text-right font-bold tabular-nums">{s.total_score}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-blue-600">{s.math_score}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{s.physics_score}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{s.chemistry_score}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">{s.percentile?.toFixed(1)}%</td>
                          <td className="px-4 py-2.5 text-center">
                            {s.above_mi
                              ? <FlaskConical className="h-3.5 w-3.5 text-violet-500 mx-auto" />
                              : <span className="text-muted-foreground/40 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "faculty" && (
            <div className="space-y-4">
              {["Mathematics", "Physics", "Chemistry"].map(subj => {
                const rows = perf.faculty_performance.filter((f: FacultyPerfRow) => f.subject === subj);
                if (rows.length === 0) return null;
                return (
                  <Card key={subj}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: SUBJECT_COLORS[subj] }} />
                        {subj} Faculty
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="px-4 py-2 text-left font-medium">Faculty</th>
                            <th className="px-4 py-2 text-right font-medium">Students</th>
                            <th className="px-4 py-2 text-right font-medium">Avg Score</th>
                            <th className="px-4 py-2 text-right font-medium">Top Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((f: FacultyPerfRow) => (
                            <tr key={f.faculty_id} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-4 py-2 font-medium">{f.faculty_name}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{f.students}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-semibold">{f.avg_score}</td>
                              <td className="px-4 py-2 text-right tabular-nums" style={{ color: SUBJECT_COLORS[subj] }}>{f.top_score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="p-4 border-t">
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="faculty_name" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Bar dataKey="avg_score" name="Avg Score" fill={SUBJECT_COLORS[subj]} radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="avg_score" position="top" formatter={(v: number) => Number(v).toFixed(1)} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
