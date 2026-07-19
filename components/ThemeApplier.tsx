"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/themeStore";

// Keeps <html data-theme data-mode> in sync with the theme store on every
// change after hydration. The FIRST paint is handled separately by the
// blocking inline script in app/layout.tsx (reading the same localStorage
// key synchronously, before React even runs) — this component only takes
// over from there, so toggling the theme picker/light-dark switch updates
// the whole app's CSS variables instantly.
export function ThemeApplier() {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  return null;
}
