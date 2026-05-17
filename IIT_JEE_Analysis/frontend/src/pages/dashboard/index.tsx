import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  LayoutDashboard, FlaskConical, Upload, CheckCircle2, Clock,
  FileText, TrendingUp, School, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCommandCenter, getAcademicYears } from "@/lib/api";
import { useAcademicYearStore } from "@/store/academicYear";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  published: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const PIPELINE_COLORS = ["#94a3b8", "#f59e0b", "#3b82f6", "#8b5cf6"];

function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
    { name: "Draft",     value: pipeline.draft,     fill: PIPELINE_COLORS[0] },
    { name: "Published", value: pipeline.published,  fill: PIPELINE_COLORS[1] },
    { name: "Completed", value: pipeline.completed,  fill: PIPELINE_COLORS[2] },
    { name: "Evaluated", value: pipeline.evaluated,  fill: PIPELINE_COLORS[3] },
  ] : [];

  const pendingBranches = (cc?.branch_uploads ?? []).filter(b => !b.uploaded);
  const uploadedBranches = (cc?.branch_uploads ?? []).filter(b => b.uploaded);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Command Center</h1>
            <p className="text-xs text-muted-foreground">Year-wide exam health at a glance</p>
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

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Exams"
          value={isLoading ? "…" : (pipeline?.total_logical ?? 0)}
          icon={FileText}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          sub="logical exam papers"
        />
        <KpiCard
          label="Evaluated"
          value={isLoading ? "…" : (pipeline?.evaluated ?? 0)}
          icon={FlaskConical}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
          sub="with rank & MI data"
        />
        <KpiCard
          label="OMR Results"
          value={isLoading ? "…" : (cc?.totals.results_uploaded ?? 0)}
          icon={Upload}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          sub="student sheets uploaded"
        />
        <KpiCard
          label="Students Evaluated"
          value={isLoading ? "…" : (cc?.totals.students_evaluated ?? 0)}
          icon={TrendingUp}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          sub="ranked across all exams"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline funnel bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Exam Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [v, "Exams"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {pipelineChart.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pipeline pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status Split</CardTitle>
          </CardHeader>
          <CardContent className="h-52">
            {isLoading || !pipeline ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineChart.filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {pipelineChart.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent exams + Branch uploads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent exams table */}
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Exam</th>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-center font-medium">Results</th>
                      <th className="px-4 py-2 text-center font-medium">Status</th>
                      <th className="px-4 py-2 text-center font-medium">Eval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cc?.recent_exams ?? []).map(e => (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium">
                          {e.exam_code}
                          <span className="ml-1.5 text-xs text-muted-foreground">{e.exam_type} {e.paper}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.exam_date}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums">{e.result_count}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLOR[e.status] ?? "")}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {e.evaluated
                            ? <FlaskConical className="h-3.5 w-3.5 text-violet-500 mx-auto" />
                            : <span className="text-muted-foreground/40 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                    {!isLoading && (cc?.recent_exams ?? []).length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">No exams yet</td></tr>
                    )}
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
              <div className="text-center text-sm text-muted-foreground py-4">
                No published exams pending upload
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingBranches.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-amber-600 flex items-center gap-1 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Pending ({pendingBranches.length})
                    </p>
                    {pendingBranches.map(b => (
                      <div key={b.branch_id} className="flex items-center justify-between py-1 px-2 rounded-md bg-amber-50 dark:bg-amber-950/30 mb-1">
                        <span className="text-xs font-medium">{b.branch_name}</span>
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                    ))}
                  </div>
                )}
                {uploadedBranches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded ({uploadedBranches.length})
                    </p>
                    {uploadedBranches.map(b => (
                      <div key={b.branch_id} className="flex items-center justify-between py-1 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 mb-1">
                        <span className="text-xs font-medium">{b.branch_name}</span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Manage Exams",    to: "/exams",          color: "bg-blue-500",   desc: "Create & publish" },
          { label: "Upload OMR",      to: "/results",        color: "bg-emerald-500", desc: "Upload scan results" },
          { label: "Branch Results",  to: "/branch-results", color: "bg-violet-500",  desc: "Compare branches" },
          { label: "Analytics",       to: "/analytics",      color: "bg-amber-500",   desc: "Performance insights" },
        ].map(({ label, to, color, desc }) => (
          <Link key={to} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                  <ArrowRight className="h-4 w-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
