import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Settings2,
  Network, Settings, GraduationCap, ChevronLeft, ChevronRight, IdCard,
  UserCheck, CalendarCheck, Scan, BarChart2,
  TrendingUp, UserCircle2, Upload,
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
  icon: React.ElementType;
  label: string;
  end?: boolean;
  visible: () => boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// ── Nav structure ──────────────────────────────────────────────────────────────

function useNavGroups(): NavGroup[] {
  const {
    isAdmin, isOperator, canAccessMasterData, canAccessMappings,
    canAccessStudents, canAccessExams, canUploadOMR, canAccessResults,
    canAccessAnalytics,
  } = useAuthStore();

  return [
    {
      items: [
        {
          to: "/", icon: LayoutDashboard, label: "Dashboard", end: true,
          visible: () => !isOperator(),
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          to: "/master-data", icon: Settings2, label: "Institute Setup",
          visible: canAccessMasterData,
        },
        {
          to: "/students", icon: IdCard, label: "Students",
          visible: canAccessStudents,
        },
        {
          to: "/users", icon: Users, label: "Users",
          visible: isAdmin,
        },
      ],
    },
    {
      label: "Per Academic Year",
      items: [
        {
          to: "/mappings", icon: Network, label: "Branch Configuration",
          visible: canAccessMappings,
        },
        {
          to: "/student-mapping", icon: UserCheck, label: "Student Mapping",
          visible: canAccessMappings,
        },
        {
          to: "/exams", icon: CalendarCheck, label: "Exams",
          visible: canAccessExams,
        },
        {
          to: "/results", icon: canUploadOMR() ? Upload : Scan, label: "OMR Results",
          visible: canUploadOMR,
        },
        {
          to: "/branch-results", icon: BarChart2, label: "Branch Results",
          visible: canAccessResults,
        },
        {
          to: "/analytics", icon: TrendingUp, label: "Analytics",
          visible: canAccessAnalytics,
        },
        {
          to: "/student-report", icon: UserCircle2, label: "Student Report",
          visible: canAccessAnalytics,
        },
      ],
    },
    {
      label: "System",
      items: [
        {
          to: "/settings", icon: Settings, label: "Settings",
          visible: () => true,
        },
      ],
    },
  ];
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuthStore();
  const navGroups = useNavGroups();

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
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => item.visible());
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
