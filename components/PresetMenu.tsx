"use client";

import { useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { PRESETS, PRESET_GROUPS } from "@/lib/presets";

export function PresetMenu() {
  const activePreset = useArmSimStore((s) => s.activePreset);
  const applyPose = useArmSimStore((s) => s.applyPose);
  const [search, setSearch] = useState("");

  const filtered = PRESETS.filter(
    (p) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="scroll-slim flex w-72 shrink-0 flex-col overflow-y-auto border-r border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 p-3">
        <input
          type="text"
          placeholder="Search poses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-[12px] text-neutral-200 placeholder:text-neutral-600 focus:border-teal-600 focus:outline-none"
        />
      </div>

      <div className="flex-1 px-2 py-2">
        {PRESET_GROUPS.map((group) => {
          const groupPresets = filtered.filter((p) => p.group === group);
          if (groupPresets.length === 0) return null;
          return (
            <div key={group} className="mb-3">
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
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
                        ? "bg-teal-900/30 text-teal-400"
                        : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
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
  );
}
