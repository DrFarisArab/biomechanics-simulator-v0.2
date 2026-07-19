import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeName = "sage" | "ocean";
export type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeName;
  mode: ThemeMode;
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

// Persisted under the same localStorage key the blocking inline script in
// app/layout.tsx reads before first paint (see THEME_STORAGE_KEY there) —
// keeping them in sync is what avoids a flash of the wrong theme on load.
export const THEME_STORAGE_KEY = "biomech-theme";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "sage",
      mode: "dark",
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === "dark" ? "light" : "dark" })),
    }),
    { name: THEME_STORAGE_KEY }
  )
);
