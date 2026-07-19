"use client";

import { useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { PRESETS, PRESET_GROUPS } from "@/lib/presets";

// Rounded-rect-with-divided-panel glyph (the reference "collapse sidebar"
// icon) — chevron flips direction with `collapsed` so the same icon works
// as both the collapse and expand affordance.
function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
      <line x1="9" y1="4.5" x2="9" y2="19.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d={collapsed ? "M12.5 9l3 3-3 3" : "M6 9l-3 3 3 3"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PresetMenu() {
  const activePreset = useArmSimStore((s) => s.activePreset);
  const applyPose = useArmSimStore((s) => s.applyPose);
  const [search, setSearch] = useState("");
  // Collapsed by default on app start for maximum viewport — matches
  // showCommandBox's default in lib/store.ts.
  const [collapsed, setCollapsed] = useState(true);

  const filtered = PRESETS.filter(
    (p) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (collapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-r border-ink-800 bg-ink-900 py-3">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand pose menu"
          aria-label="Expand pose menu"
          className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
        >
          <PanelToggleIcon collapsed />
        </button>
      </aside>
    );
  }

  return (
    <>
      {/* Phone: dim scrim behind the drawer; tap to collapse. Inert (hidden)
          at sm+ where the menu is a normal docked column. */}
      <div className="absolute inset-0 z-20 bg-black/30 sm:hidden" onClick={() => setCollapsed(true)} aria-hidden />
      <aside className="scroll-slim absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col overflow-y-auto border-r border-ink-800 bg-ink-900 shadow-2xl shadow-black/40 sm:static sm:z-auto sm:shadow-none">
        <div className="flex items-center gap-2 border-b border-ink-800 p-3">
        <input
          type="text"
          placeholder="Search poses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-[12px] text-ink-200 placeholder:text-ink-600 focus:border-brand-600 focus:outline-none"
        />
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse pose menu"
          aria-label="Collapse pose menu"
          className="shrink-0 rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
        >
          <PanelToggleIcon collapsed={false} />
        </button>
      </div>

      <div className="flex-1 px-2 py-2">
        {PRESET_GROUPS.map((group) => {
          const groupPresets = filtered.filter((p) => p.group === group);
          if (groupPresets.length === 0) return null;
          return (
            <div key={group} className="mb-3">
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {group}
              </div>
              <div className="flex flex-col gap-0.5">
                {groupPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      applyPose(p.angles, {
                        presetId: p.id,
                        rootPosition: p.rootPosition,
                        rootRotation: p.rootRotation,
                        furniture: p.furniture,
                        furnitureRotation: p.furnitureRotation,
                        stanceLeg: p.stanceLeg,
                      })
                    }
                    title={p.description}
                    className={`rounded-md px-2.5 py-1.5 text-left text-[12px] transition ${
                      activePreset === p.id
                        ? "bg-brand-900/30 text-brand-400"
                        : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </aside>
    </>
  );
}
