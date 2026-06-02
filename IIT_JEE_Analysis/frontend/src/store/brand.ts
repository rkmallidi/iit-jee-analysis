import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BrandState {
  title: string;
  subtitle: string;
  logoUrl: string;
  setBrand: (title: string, subtitle: string, logoUrl?: string) => void;
  resetBrand: () => void;
}

const DEFAULT_TITLE = "Sri Chaitanya";
const DEFAULT_SUBTITLE = "Kavuri Hills";
const DEFAULT_LOGO_URL = "/sc-logo.png.jpeg";

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      title: DEFAULT_TITLE,
      subtitle: DEFAULT_SUBTITLE,
      logoUrl: DEFAULT_LOGO_URL,
      setBrand: (title, subtitle, logoUrl) => set({
        title: title.trim() || DEFAULT_TITLE,
        subtitle: subtitle.trim() || DEFAULT_SUBTITLE,
        logoUrl: logoUrl?.trim() || DEFAULT_LOGO_URL,
      }),
      resetBrand: () => set({ title: DEFAULT_TITLE, subtitle: DEFAULT_SUBTITLE, logoUrl: DEFAULT_LOGO_URL }),
    }),
    { name: "brand-store" }
  )
);
