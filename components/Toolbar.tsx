"use client";

import { useEffect, useRef, useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { ThemeToggle } from "./ThemeToggle";

// Exact switch styling shared by the desktop toolbar row and the mobile menu,
// so both stay pixel-identical to the original inline header switches.
const SWITCH_CLASS =
  "flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40";
const KNOB_CLASS = "h-4 w-4 rounded-full bg-ink-50 shadow-sm transition-transform";
const LABEL = "text-[11px] font-medium transition";

function Switch({
  checked,
  onToggle,
  ariaLabel,
  disabled,
  title,
}: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      onClick={onToggle}
      data-on={checked}
      className={SWITCH_CLASS}
    >
      <span className={KNOB_CLASS} />
    </button>
  );
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// The full set of viewport controls. Rendered as the original horizontal row
// on desktop (lg+) and, unchanged in behavior, as a vertical popover on
// smaller screens so the toolbar never wraps into multiple rows and eats
// vertical space (requirement 2). All state lives in the arm-sim store, so
// both presentations drive the exact same toggles.
export function Toolbar() {
  const appearance = useArmSimStore((s) => s.appearance);
  const setAppearance = useArmSimStore((s) => s.setAppearance);
  const showSkin = useArmSimStore((s) => s.showSkin);
  const setShowSkin = useArmSimStore((s) => s.setShowSkin);
  const showJointMarkers = useArmSimStore((s) => s.showJointMarkers);
  const setShowJointMarkers = useArmSimStore((s) => s.setShowJointMarkers);
  const showCommandBox = useArmSimStore((s) => s.showCommandBox);
  const setShowCommandBox = useArmSimStore((s) => s.setShowCommandBox);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const skinDisabled = appearance === "muscles";

  return (
    <div className="flex items-center gap-3">
      {/* Desktop (lg+): original horizontal row, unchanged. */}
      <div className="hidden items-center gap-3 lg:flex">
        <ThemeToggle />
        <div className="h-4 w-px bg-ink-800" />
        <div className="flex items-center gap-2">
          <span className={`${LABEL} ${showJointMarkers ? "text-brand-400" : "text-ink-500"}`}>Markers</span>
          <Switch
            checked={showJointMarkers}
            onToggle={() => setShowJointMarkers(!showJointMarkers)}
            ariaLabel="Toggle joint markers"
          />
        </div>
        <div className="h-4 w-px bg-ink-800" />
        <div className="flex items-center gap-2">
          <span
            className={`${LABEL} ${skinDisabled ? "text-ink-700" : showSkin ? "text-brand-400" : "text-ink-500"}`}
          >
            Skin
          </span>
          <Switch
            checked={showSkin}
            onToggle={() => setShowSkin(!showSkin)}
            ariaLabel="Toggle translucent reference skin overlay"
            disabled={skinDisabled}
            title={skinDisabled ? "Skin overlay is only available on the skeleton model" : undefined}
          />
        </div>
        <div className="h-4 w-px bg-ink-800" />
        <div className="flex items-center gap-2">
          <span className={`${LABEL} ${appearance === "skeleton" ? "text-brand-400" : "text-ink-500"}`}>Skeleton</span>
          <Switch
            checked={appearance === "muscles"}
            onToggle={() => setAppearance(appearance === "skeleton" ? "muscles" : "skeleton")}
            ariaLabel="Toggle between skeleton and muscles view"
          />
          <span className={`${LABEL} ${appearance === "muscles" ? "text-brand-400" : "text-ink-500"}`}>Muscles</span>
        </div>
        <div className="h-4 w-px bg-ink-800" />
        <div className="flex items-center gap-2">
          <span className={`${LABEL} ${showCommandBox ? "text-brand-400" : "text-ink-500"}`}>Command box</span>
          <Switch
            checked={showCommandBox}
            onToggle={() => setShowCommandBox(!showCommandBox)}
            ariaLabel="Toggle the pose command box"
          />
        </div>
      </div>

      {/* Below lg: hamburger + popover holding the same controls, vertically. */}
      <div className="relative lg:hidden" ref={menuRef}>
        <button
          type="button"
          aria-label="Open controls menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="grid h-8 w-8 place-items-center rounded-md border border-ink-700 bg-ink-800 text-ink-300 transition hover:text-ink-100"
        >
          <HamburgerIcon />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 top-10 z-50 flex w-60 flex-col gap-3 rounded-xl border border-ink-800 bg-ink-900 p-3 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-ink-400">Theme</span>
                <ThemeToggle />
              </div>
              <div className="h-px bg-ink-800" />
              <div className="flex items-center justify-between">
                <span className={`${LABEL} ${showJointMarkers ? "text-brand-400" : "text-ink-300"}`}>Markers</span>
                <Switch
                  checked={showJointMarkers}
                  onToggle={() => setShowJointMarkers(!showJointMarkers)}
                  ariaLabel="Toggle joint markers"
                />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`${LABEL} ${skinDisabled ? "text-ink-700" : showSkin ? "text-brand-400" : "text-ink-300"}`}
                >
                  Skin
                </span>
                <Switch
                  checked={showSkin}
                  onToggle={() => setShowSkin(!showSkin)}
                  ariaLabel="Toggle translucent reference skin overlay"
                  disabled={skinDisabled}
                  title={skinDisabled ? "Skin overlay is only available on the skeleton model" : undefined}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`${LABEL} ${appearance === "skeleton" ? "text-brand-400" : "text-ink-300"}`}>
                  Skeleton
                </span>
                <Switch
                  checked={appearance === "muscles"}
                  onToggle={() => setAppearance(appearance === "skeleton" ? "muscles" : "skeleton")}
                  ariaLabel="Toggle between skeleton and muscles view"
                />
                <span className={`${LABEL} ${appearance === "muscles" ? "text-brand-400" : "text-ink-300"}`}>
                  Muscles
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`${LABEL} ${showCommandBox ? "text-brand-400" : "text-ink-300"}`}>Command box</span>
                <Switch
                  checked={showCommandBox}
                  onToggle={() => setShowCommandBox(!showCommandBox)}
                  ariaLabel="Toggle the pose command box"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
