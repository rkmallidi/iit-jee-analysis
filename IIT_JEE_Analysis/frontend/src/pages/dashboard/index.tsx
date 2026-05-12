import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, GitBranch, BookOpen, Layers, Grid3x3, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBranches, getPrograms, getUsers, getClasses, getSections, getBranchSections, getAcademicYears } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useAcademicYearStore } from "@/store/academicYear";

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) => (
  <Card className="overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuthStore();
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

  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => getUsers().then((r) => r.data), enabled: user?.roles.some(r => r.name === "Admin") });
  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: () => getBranches().then((r) => r.data) });
  const { data: programs } = useQuery({ queryKey: ["programs"], queryFn: () => getPrograms().then((r) => r.data) });
  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: () => getClasses().then((r) => r.data) });
  const { data: sections } = useQuery({ queryKey: ["sections"], queryFn: () => getSections().then((r) => r.data) });
  const { data: bsections } = useQuery({
    queryKey: ["branch-sections", yearId],
    queryFn: () => getBranchSections({ academic_year_id: yearId }).then((r) => r.data),
  });

  const isAdmin = user?.roles.some(r => r.name === "Admin");

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome back, {user?.full_name.split(" ")[0]} 👋
          </h2>
          <p className="text-muted-foreground mt-1">
            Here's an overview of the IIT JEE platform.
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

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {isAdmin && (
          <StatCard icon={Users} label="Users" value={users?.length ?? "—"} color="bg-primary/10 text-primary" />
        )}
        <StatCard icon={GitBranch} label="Branches" value={branches?.length ?? "—"} color="bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300" />
        <StatCard icon={BookOpen} label="Programs" value={programs?.length ?? "—"} color="bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300" />
        <StatCard icon={Layers} label="Classes" value={classes?.length ?? "—"} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300" />
        <StatCard icon={Grid3x3} label="Sections" value={sections?.length ?? "—"} color="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300" />
        <StatCard icon={Network} label="Active Slots" value={bsections?.length ?? "—"} color="bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-300" />
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate between modules. Admins can manage Users, Branches, Programs, Classes, Sections, and all Mappings. Use the <strong>Mappings</strong> module to assign faculty to sections and view the full academic structure overview.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
