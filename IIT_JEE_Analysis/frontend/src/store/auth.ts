import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, RoleName } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  // Branch context loaded from /auth/me/context
  branchIds: number[];
  contextLoaded: boolean;

  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  setContext: (branchIds: number[]) => void;
  logout: () => void;

  // Role helpers
  hasRole: (role: RoleName) => boolean;
  isAdmin: () => boolean;
  isDean: () => boolean;
  isPrincipal: () => boolean;
  isVicePrincipal: () => boolean;
  isOperator: () => boolean;
  isFaculty: () => boolean;

  // Access helpers
  canAccessAdmin: () => boolean;      // Admin only
  canAccessBranchMgmt: () => boolean; // Admin, Dean, Principal, VP
  canAccessStudents: () => boolean;   // Admin, Dean, Principal, VP
  canAccessExams: () => boolean;      // Admin, Dean, Principal, VP
  canUploadOMR: () => boolean;        // Admin, Principal, Operator
  canAccessResults: () => boolean;    // Admin, Dean, Principal, VP
  canAccessAnalytics: () => boolean;  // Admin, Dean, Principal
  canAccessMasterData: () => boolean; // Admin only (branches/programs/classes/sections/users)
  canAccessMappings: () => boolean;   // Admin only
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      branchIds: [],
      contextLoaded: false,

      setTokens: (access, refresh) => {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      setUser: (user) => set({ user }),

      setContext: (branchIds) => set({ branchIds, contextLoaded: true }),

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("academic-year-store");
        set({ user: null, accessToken: null, refreshToken: null, branchIds: [], contextLoaded: false });
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        return user.roles.some((r) => r.name === role);
      },

      isAdmin:         () => get().hasRole("Admin"),
      isDean:          () => get().hasRole("Dean"),
      isPrincipal:     () => get().hasRole("Principal"),
      isVicePrincipal: () => get().hasRole("Vice-Principal"),
      isOperator:      () => get().hasRole("Operator"),
      isFaculty:       () => get().hasRole("Faculty"),

      canAccessAdmin: () => get().isAdmin(),

      canAccessMasterData: () => get().isAdmin(),

      canAccessMappings: () => get().isAdmin(),

      canAccessBranchMgmt: () => {
        const { isAdmin, isDean, isPrincipal, isVicePrincipal } = get();
        return isAdmin() || isDean() || isPrincipal() || isVicePrincipal();
      },

      canAccessStudents: () => {
        const { isAdmin, isDean, isPrincipal, isVicePrincipal } = get();
        return isAdmin() || isDean() || isPrincipal() || isVicePrincipal();
      },

      canAccessExams: () => {
        const { isAdmin, isDean, isPrincipal, isVicePrincipal } = get();
        return isAdmin() || isDean() || isPrincipal() || isVicePrincipal();
      },

      canUploadOMR: () => {
        const { isAdmin, isPrincipal, isOperator } = get();
        return isAdmin() || isPrincipal() || isOperator();
      },

      canAccessResults: () => {
        const { isAdmin, isDean, isPrincipal, isVicePrincipal } = get();
        return isAdmin() || isDean() || isPrincipal() || isVicePrincipal();
      },

      canAccessAnalytics: () => {
        const { isAdmin, isDean, isPrincipal } = get();
        return isAdmin() || isDean() || isPrincipal();
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        branchIds: state.branchIds,
        contextLoaded: state.contextLoaded,
      }),
    }
  )
);
