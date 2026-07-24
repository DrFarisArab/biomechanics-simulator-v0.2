import type { Config } from "tailwindcss";

// `ink`/`brand`/`danger` replace the app's old literal neutral/teal/red
// Tailwind classes. Each shade resolves to a CSS custom property (defined in
// app/globals.css per data-theme/data-mode combination) via the
// `rgb(var(--x) / <alpha-value>)` pattern, so every existing utility class
// (bg-ink-900, text-brand-400/60, etc.) repaints live when the theme store
// flips data-theme/data-mode on <html> — no per-component edits needed.
function themedScale(prefix: string) {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return Object.fromEntries(shades.map((s) => [s, `rgb(var(--${prefix}-${s}) / <alpha-value>)`]));
}

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: themedScale("ink"),
        brand: themedScale("brand"),
        danger: themedScale("danger"),
        // Single saturated accent (NOT part of the muted brand scale — see
        // globals.css's --warm) reserved for "this is the selected option"
        // states. The brand scale is deliberately soft/low-contrast (calming
        // clinic palette), which made selected chips hard to spot at a
        // glance, especially in dark mode. `warm` stays a consistently
        // punchy orange across every theme/mode combination instead.
        warm: "rgb(var(--warm) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
export default config;
