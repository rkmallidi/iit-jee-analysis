import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie,
} from "recharts";
import {
  FlaskConical, Upload, CheckCircle2, Clock,
  FileText, TrendingUp, School, AlertTriangle, ArrowRight,
  CalendarCheck, BarChart2, UserCircle2, Scan,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCommandCenter, getAcademicYears } from "@/lib/api";
import { useAcademicYearStore } from "@/store/academicYear";
import { cn } from "@/lib/utils";

const PIPELINE_COLORS = ["#94a3b8", "#f59e0b", "#3b82f6", "#8b5cf6"];

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, iconColor, sub, progress }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  iconColor: string;
  sub?: string;
  progress?: number; // 0–100
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-1.5 tabular-nums tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {progress !== undefined && (
              <div className="mt-2.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", iconColor.replace("text-", "bg-"))}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Completion Ring ───────────────────────────────────────────────────────────
function CompletionRing({ evaluated, total }: { evaluated: number; total: number }) {
  const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
  const data = [
    { value: pct,       fill: "#8b5cf6" },
    { value: 100 - pct, fill: "hsl(var(--muted))" },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Evaluation Rate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-52 gap-2">
        <div className="relative">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                startAngle={90}
                endAngle={-270}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold tabular-nums">{pct}%</span>
            <span className="text-[11px] text-muted-foreground">evaluated</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {evaluated} of {total} exams
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const yearId = selectedYear?.id;

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

  const { data: cc, isLoading } = useQuery({
    queryKey: ["command-center", yearId],
    queryFn: () => getCommandCenter(yearId).then(r => r.data),
    staleTime: 30_000,
  });

  const pipeline = cc?.pipeline;
  const pipelineChart = pipeline ? [
    { name: "Draft",     value: pipeline.draft,      fill: PIPELINE_COLORS[0] },
    { name: "Published", value: pipeline.published,   fill: PIPELINE_COLORS[1] },
    { name: "Completed", value: pipeline.completed,   fill: PIPELINE_COLORS[2] },
    { name: "Evaluated", value: pipeline.evaluated,   fill: PIPELINE_COLORS[3] },
  ] : [];

  const totalExams   = pipeline?.total_logical ?? 0;
  const evaluated    = pipeline?.evaluated ?? 0;
  const resultsUploaded    = cc?.totals.results_uploaded ?? 0;
  const studentsEvaluated  = cc?.totals.students_evaluated ?? 0;
  const evalProgress = totalExams > 0 ? Math.round((evaluated / totalExams) * 100) : 0;
  const uploadProgress = totalExams > 0 ? Math.round((resultsUploaded / Math.max(totalExams, 1)) * 100) : 0;

  const pendingBranches  = (cc?.branch_uploads ?? []).filter(b => !b.uploaded);
  const uploadedBranches = (cc?.branch_uploads ?? []).filter(b => b.uploaded);

  const quickLinks = [
    { label: "Exams",          to: "/exams",          icon: CalendarCheck, color: "bg-blue-500",    desc: "Create & publish" },
    { label: "Upload OMR",     to: "/results",        icon: Upload,        color: "bg-emerald-500", desc: "Upload scan results" },
    { label: "Branch Results", to: "/branch-results", icon: BarChart2,     color: "bg-violet-500",  desc: "Compare branches" },
    { label: "Analytics",      to: "/analytics",      icon: TrendingUp,    color: "bg-amber-500",   desc: "Performance insights" },
    { label: "Student Report", to: "/student-report", icon: UserCircle2,   color: "bg-rose-500",    desc: "Individual report card" },
    { label: "OMR Results",    to: "/results",        icon: Scan,          color: "bg-cyan-500",    desc: "View uploaded results" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {selectedYear && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {selectedYear.name}
              </span>
            )}
            {selectedYear?.is_current && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Current Year
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold leading-tight">Command Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Year-wide exam health at a glance</p>
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

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Exams"
          value={isLoading ? "…" : totalExams}
          icon={FileText}
          color="bg-blue-100 dark:bg-blue-900/40"
          iconColor="text-blue-600 dark:text-blue-400"
          sub="logical exam papers"
        />
        <KpiCard
          label="Evaluated"
          value={isLoading ? "…" : evaluated}
          icon={FlaskConical}
          color="bg-violet-100 dark:bg-violet-900/40"
          iconColor="text-violet-600 dark:text-violet-400"
          sub={`${evalProgress}% of total exams`}
          progress={evalProgress}
        />
        <KpiCard
          label="OMR Uploaded"
          value={isLoading ? "…" : resultsUploaded}
          icon={Upload}
          color="bg-emerald-100 dark:bg-emerald-900/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          sub="student answer sheets"
          progress={uploadProgress}
        />
        <KpiCard
          label="Students Ranked"
          value={isLoading ? "…" : studentsEvaluated}
          icon={TrendingUp}
          color="bg-amber-100 dark:bg-amber-900/40"
          iconColor="text-amber-600 dark:text-amber-400"
          sub="across all evaluated exams"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Exam Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChart} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                    cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                    formatter={(v) => [v, "Exams"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
                    <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                    {pipelineChart.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Completion ring */}
        {!isLoading && (
          <CompletionRing evaluated={evaluated} total={totalExams} />
        )}
        {isLoading && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Evaluation Rate</CardTitle>
            </CardHeader>
            <CardContent className="flex h-52 items-center justify-center text-muted-foreground text-sm">
              Loading…
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Recent exams + Branch uploads ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent exams */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Exams</CardTitle>
            <Link to="/exams" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (cc?.recent_exams ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <FileText className="h-8 w-8 opacity-30" />
                <p className="text-sm">No exams yet for this year</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium">Exam</th>
                      <th className="px-4 py-2.5 text-left font-medium">Date</th>
                      <th className="px-4 py-2.5 text-center font-medium">Results</th>
                      <th className="px-4 py-2.5 text-center font-medium">Status</th>
                      <th className="px-4 py-2.5 text-center font-medium">Evaluated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cc?.recent_exams ?? []).map(e => (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium">
                          {e.exam_code}
                          <span className="ml-1.5 text-xs text-muted-foreground">{e.exam_type} · {e.paper}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs tabular-nums">{e.exam_date}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums font-medium">{e.result_count}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                            e.status === "draft"      && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                            e.status === "published"  && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
                            e.status === "completed"  && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              e.status === "draft"     && "bg-slate-400",
                              e.status === "published" && "bg-amber-500",
                              e.status === "completed" && "bg-blue-500",
                            )} />
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {e.evaluated ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branch upload readiness */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Branch Upload Status</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-4">Loading…</div>
            ) : cc?.branch_uploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <CheckCircle2 className="h-7 w-7 opacity-30" />
                <p className="text-xs text-center">No published exams pending upload</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadedBranches.length} uploaded</span>
                    <span>{pendingBranches.length} pending</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${cc.branch_uploads.length > 0 ? (uploadedBranches.length / cc.branch_uploads.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {pendingBranches.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-amber-600 flex items-center gap-1 mb-1.5">
                      <AlertTriangle className="h-3 w-3" /> Pending ({pendingBranches.length})
                    </p>
                    {pendingBranches.map(b => (
                      <div key={b.branch_id} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 mb-1">
                        <span className="text-xs font-medium">{b.branch_name}</span>
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
                {uploadedBranches.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Uploaded ({uploadedBranches.length})
                    </p>
                    {uploadedBranches.map(b => (
                      <div key={b.branch_id} className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 mb-1">
                        <span className="text-xs font-medium">{b.branch_name}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map(({ label, to, icon: Icon, color, desc }) => (
          <Link key={label} to={to}>
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group h-full">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2.5">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", color)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

    </div>
  );
}
