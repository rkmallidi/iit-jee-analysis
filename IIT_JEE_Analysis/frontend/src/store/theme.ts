import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export const PRESET_COLORS = [
  { name: "Indigo", value: "221 83% 53%" },
  { name: "Blue", value: "217 91% 60%" },
  { name: "Violet", value: "262 83% 58%" },
  { name: "Rose", value: "347 77% 50%" },
  { name: "Orange", value: "25 95% 53%" },
  { name: "Teal", value: "175 77% 37%" },
  { name: "Emerald", value: "158 64% 40%" },
];

export const APP_FONTS = [
  { name: "Inter", value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { name: "System", value: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { name: "Arial", value: "Arial, Helvetica, sans-serif" },
  { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { name: "Trebuchet", value: "'Trebuchet MS', Arial, sans-serif" },
  { name: "Georgia", value: "Georgia, 'Times New Roman', serif" },
];

export interface SidebarScheme {
  name?: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  hover: string;
  hoverForeground: string;
  active: string;
  activeForeground: string;
}

export const SIDEBAR_SCHEMES: SidebarScheme[] = [
  {
    name: "Midnight",
    background: "222 47% 11%",
    foreground: "210 40% 98%",
    muted: "215 20% 67%",
    border: "217 33% 17%",
    hover: "217 33% 17%",
    hoverForeground: "210 40% 98%",
    active: "221 83% 23%",
    activeForeground: "210 40% 98%",
  },
  {
    name: "Graphite",
    background: "220 14% 10%",
    foreground: "210 20% 98%",
    muted: "220 10% 68%",
    border: "220 13% 18%",
    hover: "220 13% 18%",
    hoverForeground: "210 20% 98%",
    active: "220 13% 25%",
    activeForeground: "210 20% 98%",
  },
  {
    name: "Indigo",
    background: "229 57% 16%",
    foreground: "226 100% 96%",
    muted: "226 60% 76%",
    border: "229 48% 24%",
    hover: "229 48% 24%",
    hoverForeground: "226 100% 96%",
    active: "236 70% 32%",
    activeForeground: "226 100% 96%",
  },
  {
    name: "Teal",
    background: "184 70% 13%",
    foreground: "180 65% 96%",
    muted: "181 45% 72%",
    border: "183 59% 20%",
    hover: "183 59% 20%",
    hoverForeground: "180 65% 96%",
    active: "176 64% 28%",
    activeForeground: "180 65% 96%",
  },
  {
    name: "Emerald",
    background: "158 64% 13%",
    foreground: "152 76% 96%",
    muted: "151 50% 72%",
    border: "158 55% 21%",
    hover: "158 55% 21%",
    hoverForeground: "152 76% 96%",
    active: "158 64% 28%",
    activeForeground: "152 76% 96%",
  },
  {
    name: "Slate Light",
    background: "210 40% 96%",
    foreground: "222 47% 11%",
    muted: "215 16% 47%",
    border: "214 32% 86%",
    hover: "214 32% 88%",
    hoverForeground: "222 47% 11%",
    active: "221 83% 90%",
    activeForeground: "221 83% 25%",
  },
];

interface ThemeState {
  mode: ThemeMode;
  primaryColor: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarBorder: string;
  sidebarHover: string;
  sidebarHoverForeground: string;
  sidebarActive: string;
  sidebarActiveForeground: string;
  sidebarFontSize: string;
  appFontFamily: string;
  appFontSize: string;
  radius: string;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setSidebarScheme: (scheme: Partial<SidebarScheme> & { background: string }) => void;
  setSidebarColors: (colors: Partial<SidebarScheme>) => void;
  setSidebarFontSize: (size: string) => void;
  setAppFontFamily: (fontFamily: string) => void;
  setAppFontSize: (size: string) => void;
  setRadius: (radius: string) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      primaryColor: PRESET_COLORS[0].value,
      sidebarBackground: SIDEBAR_SCHEMES[0].background,
      sidebarForeground: SIDEBAR_SCHEMES[0].foreground,
      sidebarMuted: SIDEBAR_SCHEMES[0].muted,
      sidebarBorder: SIDEBAR_SCHEMES[0].border,
      sidebarHover: SIDEBAR_SCHEMES[0].hover,
      sidebarHoverForeground: SIDEBAR_SCHEMES[0].hoverForeground,
      sidebarActive: SIDEBAR_SCHEMES[0].active,
      sidebarActiveForeground: SIDEBAR_SCHEMES[0].activeForeground,
      sidebarFontSize: "13px",
      appFontFamily: APP_FONTS[0].value,
      appFontSize: "14px",
      radius: "0.5rem",

      setMode: (mode) => {
        set({ mode });
        get().applyTheme();
      },

      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        get().applyTheme();
      },

      setSidebarScheme: (scheme) => {
        set({
          sidebarBackground: scheme.background,
          sidebarForeground: scheme.foreground || get().sidebarForeground,
          sidebarMuted: scheme.muted || get().sidebarMuted,
          sidebarBorder: scheme.border || scheme.hover || get().sidebarBorder,
          sidebarHover: scheme.hover || get().sidebarHover,
          sidebarHoverForeground: scheme.hoverForeground || scheme.foreground || get().sidebarHoverForeground,
          sidebarActive: scheme.active || scheme.hover || get().sidebarActive,
          sidebarActiveForeground: scheme.activeForeground || scheme.foreground || get().sidebarActiveForeground,
        });
        get().applyTheme();
      },

      setSidebarColors: (colors) => {
        set({
          ...(colors.background ? { sidebarBackground: colors.background } : {}),
          ...(colors.foreground ? { sidebarForeground: colors.foreground } : {}),
          ...(colors.muted ? { sidebarMuted: colors.muted } : {}),
          ...(colors.border ? { sidebarBorder: colors.border } : {}),
          ...(colors.hover ? { sidebarHover: colors.hover } : {}),
          ...(colors.hoverForeground ? { sidebarHoverForeground: colors.hoverForeground } : {}),
          ...(colors.active ? { sidebarActive: colors.active } : {}),
          ...(colors.activeForeground ? { sidebarActiveForeground: colors.activeForeground } : {}),
        });
        get().applyTheme();
      },

      setSidebarFontSize: (size) => {
        set({ sidebarFontSize: size });
        get().applyTheme();
      },

      setAppFontFamily: (fontFamily) => {
        set({ appFontFamily: fontFamily });
        get().applyTheme();
      },

      setAppFontSize: (size) => {
        set({ appFontSize: size });
        get().applyTheme();
      },

      setRadius: (radius) => {
        set({ radius });
        get().applyTheme();
      },

      applyTheme: () => {
        const {
          mode,
          primaryColor,
          radius,
          sidebarBackground,
          sidebarForeground,
          sidebarMuted,
          sidebarBorder,
          sidebarHover,
          sidebarHoverForeground,
          sidebarActive,
          sidebarActiveForeground,
          sidebarFontSize,
          appFontFamily,
          appFontSize,
        } = get();
        const root = document.documentElement;
        const isDark =
          mode === "dark" ||
          (mode === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        root.classList.toggle("dark", isDark);
        root.style.setProperty("--primary", primaryColor);
        root.style.setProperty("--sidebar-background", sidebarBackground);
        root.style.setProperty("--sidebar-foreground", sidebarForeground);
        root.style.setProperty("--sidebar-muted", sidebarMuted);
        root.style.setProperty("--sidebar-primary", primaryColor);
        root.style.setProperty("--sidebar-accent", sidebarHover);
        root.style.setProperty("--sidebar-accent-foreground", sidebarHoverForeground);
        root.style.setProperty("--sidebar-border", sidebarBorder);
        root.style.setProperty("--sidebar-hover", sidebarHover);
        root.style.setProperty("--sidebar-hover-foreground", sidebarHoverForeground);
        root.style.setProperty("--sidebar-active", sidebarActive);
        root.style.setProperty("--sidebar-active-foreground", sidebarActiveForeground);
        root.style.setProperty("--sidebar-ring", primaryColor);
        root.style.setProperty("--sidebar-font-size", sidebarFontSize);
        root.style.setProperty("--app-font-family", appFontFamily);
        root.style.setProperty("--app-font-size", appFontSize);
        root.style.setProperty("--radius", radius);
      },
    }),
    { name: "theme-store" }
  )
);
