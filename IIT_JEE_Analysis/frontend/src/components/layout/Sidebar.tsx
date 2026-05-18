import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Settings2,
  Network, Settings, IdCard,
  UserCheck, CalendarCheck, Scan, BarChart2,
  TrendingUp, UserCircle2, Upload, LogOut,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

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

function useNavGroups(): NavGroup[] {
  const {
    isAdmin, isOperator, canAccessMasterData, canAccessMappings,
    canAccessStudents, canAccessExams, canUploadOMR, canAccessResults,
    canAccessAnalytics,
  } = useAuthStore();

  return [
    {
      items: [
        { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true, visible: () => !isOperator() },
      ],
    },
    {
      label: "Management",
      items: [
        { to: "/master-data",     icon: Settings2,   label: "Institute Setup",     visible: canAccessMasterData },
        { to: "/students",        icon: IdCard,       label: "Students",            visible: canAccessStudents },
        { to: "/users",           icon: Users,        label: "Users",               visible: isAdmin },
      ],
    },
    {
      label: "Academic Year",
      items: [
        { to: "/mappings",        icon: Network,      label: "Branch Config",       visible: canAccessMappings },
        { to: "/student-mapping", icon: UserCheck,    label: "Student Mapping",     visible: canAccessMappings },
        { to: "/exams",           icon: CalendarCheck, label: "Exams",              visible: canAccessExams },
        { to: "/results",         icon: canUploadOMR() ? Upload : Scan, label: "OMR Results", visible: canUploadOMR },
        { to: "/branch-results",  icon: BarChart2,    label: "Branch Results",      visible: canAccessResults },
        { to: "/analytics",       icon: TrendingUp,   label: "Analytics",           visible: canAccessAnalytics },
        { to: "/student-report",  icon: UserCircle2,  label: "Student Report",      visible: canAccessAnalytics },
      ],
    },
    {
      label: "System",
      items: [
        { to: "/settings", icon: Settings, label: "Settings", visible: () => true },
      ],
    },
  ];
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navGroups = useNavGroups();

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-white/5 transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* ── Brand + collapse ── */}
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-3.5 border-b border-white/5 shrink-0",
        collapsed && "flex-col gap-1.5 px-2 py-3"
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-white">
          <img src="/sc-logo.png.jpeg" alt="Sri Chaitanya" className="h-full w-full object-cover" />
        </div>
        {collapsed && (
          <button
            onClick={onToggle}
            title="Expand sidebar"
            className="border-0 flex items-center justify-center h-6 w-6 rounded-md text-white/25 hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <PanelLeftOpen className="h-3.5 w-3.5" />
          </button>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-[13px] text-white leading-none tracking-tight">Sri Chaitanya</p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">Kavuri Hills</p>
            </div>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="border-0 shrink-0 flex items-center justify-center h-6 w-6 rounded-md text-white/25 hover:text-white/70 hover:bg-white/10 transition-colors"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {navGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => item.visible());
          if (visibleItems.length === 0) return null;

          return (
            <div key={gi} className={gi > 0 ? "pt-2" : ""}>
              {/* Group label */}
              {!collapsed && group.label && (
                <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                  {group.label}
                </p>
              )}
              {collapsed && group.label && gi > 0 && (
                <div className="my-1 mx-auto w-5 h-px bg-white/10 rounded" />
              )}

              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label, end = false }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-all duration-150",
                        collapsed ? "h-9 w-9 mx-auto justify-center" : "px-2.5 py-2",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:bg-white/5 hover:text-white/80"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left bar */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
                        )}
                        {isActive && collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
                        )}
                        <Icon className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-white/40 group-hover:text-white/70"
                        )} />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>


{/* ── User footer ── */}
      <div className={cn(
        "shrink-0 border-t border-white/5",
        collapsed ? "p-2" : "p-2.5"
      )}>
        {collapsed ? (
          <div title={user?.full_name} className="flex h-9 w-9 mx-auto rounded-lg overflow-hidden bg-white/10 cursor-default">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white text-[11px] font-bold">{initials}</div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 rounded-lg overflow-hidden bg-white/10">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user?.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-white text-[11px] font-bold">{initials}</div>
              )}
            </div>
            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-[12px] font-semibold text-white/90 truncate leading-none">{user?.full_name}</p>
              <p className="text-[10px] text-white/35 truncate mt-0.5 capitalize">{user?.roles.map(r => r.name).join(", ")}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="border-0 h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-white/25 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
