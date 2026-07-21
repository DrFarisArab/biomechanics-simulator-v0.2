"use client";

import { useEffect, useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { PRESETS, PRESET_GROUPS } from "@/lib/presets";

export function PresetMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const activePreset = useArmSimStore((s) => s.activePreset);
  const applyPose = useArmSimStore((s) => s.applyPose);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const filtered = PRESETS.filter(
    (p) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <>
      <div className="absolute inset-0 z-20 bg-black/30" onClick={() => onOpenChange(false)} aria-hidden />
      <aside className="scroll-slim absolute inset-y-0 left-0 z-30 flex w-[min(20rem,calc(100vw-2.5rem))] flex-col overflow-y-auto border-r border-ink-800 bg-ink-900 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 border-b border-ink-800 p-3">
        <input
          type="text"
          placeholder="Search poses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-[12px] text-ink-200 placeholder:text-ink-600 focus:border-brand-600 focus:outline-none"
        />
        <button
          onClick={() => onOpenChange(false)}
          title="Close pose menu"
          aria-label="Close pose menu"
          className="shrink-0 rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
        >
          <span className="text-[16px] leading-none">×</span>
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
                    onClick={() => {
                      applyPose(p.angles, {
                        presetId: p.id,
                        rootPosition: p.rootPosition,
                        rootRotation: p.rootRotation,
                        furniture: p.furniture,
                        furnitureRotation: p.furnitureRotation,
                        stanceLeg: p.stanceLeg,
                      });
                      onOpenChange(false);
                    }}
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
