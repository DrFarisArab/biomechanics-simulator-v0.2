"use client";

import * as THREE from "three";
import { useHandEditorStore, nextHandId, type GizmoMode, type DraftHand } from "@/lib/handEditorStore";
import { useHandPlacementStore } from "@/lib/handPlacementStore";
import { useArmSimStore } from "@/lib/store";
import { DEFAULT_HAND_SCALE, type HandContact } from "@/lib/handContacts";
import { contactToWorld, worldToContact } from "@/lib/handAnchor";
import { TEST_HAND_CONTACTS } from "@/lib/handContacts";
import { saveBlobAsFile } from "@/lib/saveBlobAsFile";

// Dump every saved placement as JSON so it can be handed back and folded into
// lib/handContacts.ts (the registry). Runs on the device where placements were
// made, so it works whether that's this preview or the packaged app.
async function exportAllPlacements() {
  const all = useHandPlacementStore.getState().placements;
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  await saveBlobAsFile(blob, "special-test-hand-placements.json");
}

// Where a newly added hand appears: the point the camera is orbiting (the
// user is looking there), so it's always on-screen and near the region of
// interest before they drag it onto the target.
function defaultDropWorld(): [number, number, number] {
  const three = (window as unknown as { __three?: { controls?: { target?: THREE.Vector3 } } }).__three;
  const t = three?.controls?.target;
  return t ? [t.x, t.y, t.z] : [0, 1, 0];
}

const POS_STEP = 0.005; // metres per nudge
const ROT_STEP = (2 * Math.PI) / 180; // 2° per nudge

export function HandPlacementEditor({ testId }: { testId: string }) {
  const editingTestId = useHandEditorStore((s) => s.editingTestId);
  const draft = useHandEditorStore((s) => s.draft);
  const selectedId = useHandEditorStore((s) => s.selectedId);
  const mode = useHandEditorStore((s) => s.mode);
  const start = useHandEditorStore((s) => s.start);
  const cancel = useHandEditorStore((s) => s.cancel);
  const addHand = useHandEditorStore((s) => s.addHand);
  const removeHand = useHandEditorStore((s) => s.removeHand);
  const select = useHandEditorStore((s) => s.select);
  const setMode = useHandEditorStore((s) => s.setMode);
  const updateHand = useHandEditorStore((s) => s.updateHand);

  const placement = useHandPlacementStore((s) => s.placements[testId]);
  const setPlacement = useHandPlacementStore((s) => s.setPlacement);
  const clearPlacement = useHandPlacementStore((s) => s.clearPlacement);
  const setActiveSpecialTestId = useArmSimStore((s) => s.setActiveSpecialTestId);

  const isEditingThis = editingTestId === testId;
  const editingOther = editingTestId !== null && editingTestId !== testId;

  const beginEdit = () => {
    // Seed drafts from an existing saved placement (or the shipped registry),
    // converting each bone-anchored contact to its current world transform.
    const source: HandContact[] = placement?.hands ?? TEST_HAND_CONTACTS[testId] ?? [];
    const seed: DraftHand[] = source
      .map((c) => {
        const w = contactToWorld(c);
        if (!w) return null;
        return { id: nextHandId(), kind: c.kind ?? "hand", side: c.side, pos: w.pos, euler: w.euler, scale: w.scale };
      })
      .filter((d): d is DraftHand => d !== null);
    // Make sure this test's markers are the ones shown while editing (matters
    // for tests with no shipped pose, where nothing else activates them).
    setActiveSpecialTestId(testId);
    start(testId, seed);
  };

  const add = (kind: "hand" | "arrow", side: "left" | "right" = "right") =>
    addHand({ id: nextHandId(), kind, side, pos: defaultDropWorld(), euler: [0, 0, 0], scale: DEFAULT_HAND_SCALE });

  const save = () => {
    const contacts: HandContact[] = [];
    for (const h of draft) {
      const c = worldToContact(new THREE.Vector3(...h.pos), new THREE.Euler(...h.euler, "XYZ"), h.scale, h.side, h.kind);
      if (c) contacts.push(c);
    }
    setPlacement(testId, contacts);
    // Keep this test's markers visible after saving (esp. unposed tests).
    setActiveSpecialTestId(testId);
    cancel();
  };

  const nudge = (axis: 0 | 1 | 2, dir: 1 | -1) => {
    if (!selectedId) return;
    const h = draft.find((d) => d.id === selectedId);
    if (!h) return;
    if (mode === "rotate") {
      const e = [...h.euler] as [number, number, number];
      e[axis] += dir * ROT_STEP;
      updateHand(selectedId, { euler: e });
    } else {
      const p = [...h.pos] as [number, number, number];
      p[axis] += dir * POS_STEP;
      updateHand(selectedId, { pos: p });
    }
  };

  const setScale = (v: number) => {
    if (!selectedId) return;
    updateHand(selectedId, { scale: v });
  };

  const selected = draft.find((d) => d.id === selectedId) ?? null;

  // --- Collapsed states -------------------------------------------------
  if (!isEditingThis) {
    return (
      <div className="rounded-md border border-ink-700 bg-ink-800/30 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">Examiner hands</span>
          {placement && (
            <span className="text-[10px] text-brand-400">{placement.hands.length} placed</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={beginEdit}
            disabled={editingOther}
            className="rounded-md border border-brand-700/50 bg-brand-900/20 px-2.5 py-1.5 text-[12px] font-semibold text-brand-400 transition hover:bg-brand-900/40 disabled:opacity-40"
          >
            {placement ? "✎ Edit hand placement" : "✋ Place examiner hands"}
          </button>
          {placement && (
            <button
              onClick={() => clearPlacement(testId)}
              className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[12px] text-ink-400 transition hover:border-rose-700/60 hover:text-rose-300"
            >
              Clear
            </button>
          )}
          <button
            onClick={exportAllPlacements}
            className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[12px] text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
          >
            ⤓ Export all
          </button>
        </div>
        {editingOther && (
          <div className="mt-1.5 text-[10px] text-ink-500">Finish the other test's placement first.</div>
        )}
      </div>
    );
  }

  // --- Active editing UI ------------------------------------------------
  return (
    <div className="rounded-md border border-brand-700/40 bg-brand-900/10 p-2.5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-300">
        Placing examiner hands
      </div>

      {/* Add */}
      <div className="mb-2 flex gap-1.5">
        <button
          onClick={() => add("hand", "right")}
          className="flex-1 rounded-md border border-ink-600 bg-ink-800/50 px-2 py-1.5 text-[12px] font-medium text-ink-200 transition hover:border-brand-600/60"
        >
          + Right hand
        </button>
        <button
          onClick={() => add("hand", "left")}
          className="flex-1 rounded-md border border-ink-600 bg-ink-800/50 px-2 py-1.5 text-[12px] font-medium text-ink-200 transition hover:border-brand-600/60"
        >
          + Left hand
        </button>
      </div>
      <div className="mb-2">
        <button
          onClick={() => add("arrow")}
          className="w-full rounded-md border border-orange-600/50 bg-orange-900/15 px-2 py-1.5 text-[12px] font-medium text-orange-300 transition hover:border-orange-500/70"
        >
          + Pressure arrow →
        </button>
      </div>

      {/* Hand list */}
      {draft.length > 0 ? (
        <div className="mb-2 flex flex-col gap-1">
          {draft.map((h, i) => (
            <button
              key={h.id}
              onClick={() => select(h.id)}
              className={`flex items-center justify-between rounded border px-2 py-1 text-[11px] transition ${
                h.id === selectedId
                  ? "border-warm bg-warm text-ink-950 font-semibold"
                  : "border-ink-700 bg-ink-800/40 text-ink-300 hover:border-ink-600"
              }`}
            >
              <span>
                {h.kind === "arrow" ? `Arrow ${i + 1}` : `${h.side === "right" ? "Right" : "Left"} hand ${i + 1}`}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  removeHand(h.id);
                }}
                className="rounded px-1 text-ink-500 hover:text-rose-300"
              >
                ✕
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-2 rounded border border-dashed border-ink-700 px-2 py-2 text-[10px] leading-relaxed text-ink-500">
          Add a hand, then drag the on-model gizmo to place and rotate it. Auto-snaps to the nearest bone on save.
        </div>
      )}

      {/* Per-hand controls */}
      {selected && (
        <div className="mb-2 rounded border border-ink-700 bg-ink-800/30 p-2">
          {/* Gizmo mode */}
          <div className="mb-2 flex gap-1">
            {(["translate", "rotate", "scale"] as GizmoMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium capitalize transition ${
                  mode === m
                    ? "bg-brand-700/40 text-brand-200"
                    : "bg-ink-800/60 text-ink-400 hover:text-ink-200"
                }`}
              >
                {m === "translate" ? "Move" : m}
              </button>
            ))}
          </div>

          {/* Nudge (X/Y/Z) — position when in Move, angle when in Rotate */}
          {mode !== "scale" && (
            <div className="mb-2 grid grid-cols-3 gap-1">
              {(["X", "Y", "Z"] as const).map((label, axis) => (
                <div key={label} className="flex items-center justify-between rounded bg-ink-800/60 px-1">
                  <button
                    onClick={() => nudge(axis as 0 | 1 | 2, -1)}
                    className="px-1.5 py-1 text-[13px] text-ink-300 hover:text-brand-300"
                  >
                    −
                  </button>
                  <span className="text-[10px] text-ink-500">{label}</span>
                  <button
                    onClick={() => nudge(axis as 0 | 1 | 2, 1)}
                    className="px-1.5 py-1 text-[13px] text-ink-300 hover:text-brand-300"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Scale */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ink-500">Size</span>
            <input
              type="range"
              min={0.004}
              max={0.016}
              step={0.0002}
              value={selected.scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="h-1 flex-1 accent-brand-500"
            />
          </div>
        </div>
      )}

      {/* Save / Cancel */}
      <div className="flex gap-1.5">
        <button
          onClick={save}
          className="flex-1 rounded-md border border-brand-600/60 bg-brand-900/30 px-2 py-1.5 text-[12px] font-semibold text-brand-300 transition hover:bg-brand-900/50"
        >
          Save
        </button>
        <button
          onClick={cancel}
          className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[12px] text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
