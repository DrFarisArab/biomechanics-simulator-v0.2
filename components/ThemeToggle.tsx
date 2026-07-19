"use client";

import { useThemeStore, type ThemeName } from "@/lib/themeStore";

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <path
        d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6L3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
      <path
        d="M13.5 9.8A5.8 5.8 0 016.2 2.5a5.8 5.8 0 107.3 7.3z"
        fill="currentColor"
      />
    </svg>
  );
}

const THEME_SWATCHES: { id: ThemeName; label: string; from: string; to: string }[] = [
  { id: "sage", label: "Sage — mental wellness", from: "#22223B", to: "#F2E9E4" },
  { id: "ocean", label: "Ocean — medical device azure", from: "#778DA9", to: "#0D1B2A" },
];

// Sits in the header: a light/dark slider switch plus a two-swatch theme
// picker (Sage/Ocean), both writing straight into lib/themeStore.ts, which
// ThemeApplier mirrors onto <html data-theme data-mode> — every themed
// class in the app repaints immediately, no reload needed.
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-ink-700 bg-ink-800/60 p-0.5">
        {THEME_SWATCHES.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            title={swatch.label}
            aria-label={swatch.label}
            aria-pressed={theme === swatch.id}
            onClick={() => setTheme(swatch.id)}
            className={`grid h-5 w-5 place-items-center rounded-full transition ${
              theme === swatch.id ? "ring-2 ring-ink-100/80" : "opacity-60 hover:opacity-100"
            }`}
            style={{ background: `linear-gradient(135deg, ${swatch.from}, ${swatch.to})` }}
          />
        ))}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={mode === "light"}
        aria-label="Toggle light/dark mode"
        onClick={toggleMode}
        data-on={mode === "light"}
        className="flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 text-ink-500 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600 data-[on=true]:text-brand-950"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-900 text-inherit shadow-sm transition-transform">
          {mode === "light" ? <SunIcon /> : <MoonIcon />}
        </span>
      </button>
    </div>
  );
}
