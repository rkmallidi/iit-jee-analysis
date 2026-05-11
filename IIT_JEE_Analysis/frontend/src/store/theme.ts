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

interface ThemeState {
  mode: ThemeMode;
  primaryColor: string;
  radius: string;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setRadius: (radius: string) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      primaryColor: PRESET_COLORS[0].value,
      radius: "0.5rem",

      setMode: (mode) => {
        set({ mode });
        get().applyTheme();
      },

      setPrimaryColor: (color) => {
        set({ primaryColor: color });
        get().applyTheme();
      },

      setRadius: (radius) => {
        set({ radius });
        get().applyTheme();
      },

      applyTheme: () => {
        const { mode, primaryColor, radius } = get();
        const root = document.documentElement;
        const isDark =
          mode === "dark" ||
          (mode === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        root.classList.toggle("dark", isDark);
        root.style.setProperty("--primary", primaryColor);
        root.style.setProperty("--radius", radius);
      },
    }),
    { name: "theme-store" }
  )
);
