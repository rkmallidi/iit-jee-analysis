import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AcademicYear } from "@/types";

interface AcademicYearState {
  selectedYear: AcademicYear | null;
  setSelectedYear: (year: AcademicYear) => void;
}

export const useAcademicYearStore = create<AcademicYearState>()(
  persist(
    (set) => ({
      selectedYear: null,
      setSelectedYear: (year) => set({ selectedYear: year }),
    }),
    {
      name: "academic-year-store",
    }
  )
);
