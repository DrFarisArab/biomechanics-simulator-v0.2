"use client";

import { useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { isParseError, parsePoseCommand } from "@/lib/commandParser";

interface HistoryEntry {
  text: string;
  ok: boolean;
}

const EXAMPLES = [
  "left elbow flexion 90",
  "abduct the right hip 30",
  "externally rotate the shoulder 45",
  "rotate the neck left 40",
  "supinate the forearm 45",
  "ankle dorsiflexion 15",
  "posterior pelvic tilt 12",
];

/**
 * Floating natural-language pose command box, ported from v0.1
 * (components/ui/CommandBox.tsx) — see lib/commandParser.ts for supported
 * phrasing. Sets a single DOF directly via setAngle (same as dragging a
 * sidebar slider), so it composes with everything else already on the model.
 */
export function CommandBox() {
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [exampleIdx, setExampleIdx] = useState(0);
  const setAngle = useArmSimStore((s) => s.setAngle);

  const run = () => {
    const text = value.trim();
    if (!text) return;
    const result = parsePoseCommand(text);
    if (isParseError(result)) {
      setHistory((h) => [{ text: result.error, ok: false }, ...h].slice(0, 4));
      return;
    }
    for (const jointId of result.jointIds) {
      setAngle(jointId, result.dofId, result.value);
    }
    setHistory((h) => [{ text: result.summary, ok: true }, ...h].slice(0, 4));
    setValue("");
    setExampleIdx((i) => (i + 1) % EXAMPLES.length);
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 w-80 rounded-lg border border-neutral-700 bg-neutral-900/90 p-2.5 backdrop-blur">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Pose command <span className="text-neutral-600">(type it naturally)</span>
      </div>

      {history.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {history.map((h, i) => (
            <div key={i} className={`text-[11px] leading-snug ${h.ok ? "text-teal-400" : "text-red-400"}`}>
              {h.ok ? "✓ " : "✗ "}
              {h.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          placeholder={`e.g. "${EXAMPLES[exampleIdx]}"`}
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-[12px] text-neutral-200 placeholder:text-neutral-600 focus:border-teal-600 focus:outline-none"
        />
        <button
          onClick={run}
          className="shrink-0 rounded-md border border-teal-700/50 bg-teal-900/20 px-2.5 py-1.5 text-[11px] font-semibold text-teal-400 transition hover:bg-teal-900/40"
        >
          Set
        </button>
      </div>
    </div>
  );
}
