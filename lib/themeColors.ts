import type { ThemeMode, ThemeName } from "./themeStore";

// Hex mirrors of app/globals.css's --brand-500/--ink-700/--ink-800 per
// theme/mode combo, for the handful of spots that need a real color value
// instead of a CSS variable — three.js material/light colors and canvas
// gradients can't consume `rgb(var(--x))`, so those live spots (the
// orientation-gizmo hub in components/Scene.tsx, the viewport grid) look
// this up directly from the theme store instead.
const BRAND_500: Record<ThemeName, Record<ThemeMode, string>> = {
  sage: { dark: "#C9ADA7", light: "#9A8C98" },
  ocean: { dark: "#778DA9", light: "#5C7490" },
};

const INK_950: Record<ThemeName, Record<ThemeMode, string>> = {
  sage: { dark: "#22223B", light: "#FDFCFB" },
  ocean: { dark: "#0D1B2A", light: "#FAFBFC" },
};

const GRID_CELL: Record<ThemeName, Record<ThemeMode, string>> = {
  sage: { dark: "#4A4E69", light: "#EAE0DC" },
  ocean: { dark: "#415A77", light: "#CBD5E0" },
};

const GRID_SECTION: Record<ThemeName, Record<ThemeMode, string>> = {
  sage: { dark: "#726D80", light: "#C9ADA7" },
  ocean: { dark: "#5C7490", light: "#A1B1C6" },
};

export function getBrand500(theme: ThemeName, mode: ThemeMode): string {
  return BRAND_500[theme][mode];
}

export function getInk950(theme: ThemeName, mode: ThemeMode): string {
  return INK_950[theme][mode];
}

export function getGridColors(theme: ThemeName, mode: ThemeMode): { cell: string; section: string } {
  return { cell: GRID_CELL[theme][mode], section: GRID_SECTION[theme][mode] };
}
