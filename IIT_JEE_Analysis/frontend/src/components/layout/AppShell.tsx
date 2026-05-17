import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { useAcademicYearStore } from "@/store/academicYear";
import { getAcademicYears } from "@/lib/api";
import { Toaster } from "@/components/ui/toaster";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/users": "User Management",
  "/master-data": "Institute Setup",
  "/mappings": "Mapping & Overview",
  "/students": "Students",
  "/settings": "Settings",
};

export default function AppShell() {
  const { user } = useAuthStore();
  const { applyTheme } = useThemeStore();
  const { selectedYear, setSelectedYear } = useAcademicYearStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  const { data: years = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => getAcademicYears().then(r => r.data),
    enabled: !!user,
  });

  // Set the default (is_current) year once on login, before any page renders
  useEffect(() => {
    if (years.length === 0 || selectedYear) return;
    const current = years.find(y => y.is_current) ?? years[years.length - 1];
    setSelectedYear(current);
  }, [years, selectedYear, setSelectedYear]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const title = PAGE_TITLES[location.pathname] ?? "IIT JEE Analysis";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-6 px-6 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
