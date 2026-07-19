import { useEffect, useState } from "react";

// Small SSR-safe matchMedia hook. Initial state is `false` on both server and
// first client render (so hydration matches), then corrected in an effect —
// callers must tolerate one settle frame on load, which is fine here since the
// whole app is client-heavy (Scene is dynamically imported with ssr:false).
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}

// Phone = below Tailwind's `sm` breakpoint (640px). Kept in lockstep with the
// CSS `sm:` breakpoint used across the responsive layout so the JS-driven
// panel/sheet swap and the CSS-driven column/toolbar changes flip together.
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 639.98px)");
}
