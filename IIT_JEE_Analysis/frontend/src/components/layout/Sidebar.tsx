import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, School, BookOpen, SquareStack, Grid3x3,
  Network, Settings, GraduationCap, ChevronLeft, ChevronRight, BookUser,
  CalendarDays, UserCheck, BookOpenCheck, CalendarCheck, Scan,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    ],
  },
  {
    label: "Master Data",
    items: [
      { to: "/academic-years", icon: CalendarDays, label: "Academic Years" },
      { to: "/branches",       icon: School,        label: "Branches" },
      { to: "/programs",       icon: BookOpen,       label: "Programs" },
      { to: "/classes",        icon: SquareStack,    label: "Classes" },
      { to: "/sections",       icon: Grid3x3,        label: "Sections" },
      { to: "/students",       icon: BookUser,       label: "Students" },
      { to: "/users",          icon: Users,          label: "Users",    adminOnly: true },
    ],
  },
  {
    label: "Per Academic Year",
    items: [
      { to: "/mappings",         icon: Network,    label: "Branch Configuration" },
      { to: "/student-mapping",  icon: UserCheck,      label: "Student Mapping" },
      { to: "/exams",            icon: CalendarCheck,  label: "Exams" },
      { to: "/results",          icon: Scan,           label: "OMR Results" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, isAdmin } = useAuthStore();
  const admin = isAdmin();

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border shrink-0",
        collapsed && "justify-center px-2"
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight text-sidebar-foreground truncate">IIT JEE</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">Analysis Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4 px-2">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item =>
            !("adminOnly" in item && item.adminOnly && !admin)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className="space-y-0.5">
              {/* Group label */}
              {group.label && !collapsed && (
                <div className="px-2 pb-1">
                  <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider truncate">
                    {group.label}
                  </p>
                </div>
              )}

              {/* Nav items */}
              {visibleItems.map(({ to, icon: Icon, label, end = false }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-2"
                    )
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="shrink-0 p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
              {user.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.full_name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">
                {user.roles.map(r => r.name).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3.5 top-16 h-7 w-7 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent z-10"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </Button>
    </aside>
  );
}
