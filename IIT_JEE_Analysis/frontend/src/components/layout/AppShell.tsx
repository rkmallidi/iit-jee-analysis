import { useState, useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { Toaster } from "@/components/ui/toaster";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/users": "User Management",
  "/branches": "Branch Management",
  "/programs": "Program Management",
  "/classes": "Class Management",
  "/sections": "Section Management",
  "/academic-years": "Academic Years",
  "/mappings": "Mapping & Overview",
  "/students": "Students",
  "/settings": "Settings",
};

export default function AppShell() {
  const { user } = useAuthStore();
  const { applyTheme } = useThemeStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

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
