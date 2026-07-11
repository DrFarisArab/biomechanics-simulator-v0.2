"use client";

import { useArmSimStore } from "@/lib/store";
import { ARM_JOINT_DOFS, ARM_DOF_META } from "@/lib/armDofs";
import { TRUNK_JOINT_DOFS, TRUNK_DOF_META } from "@/lib/trunkDofs";
import { LEG_JOINT_DOFS, LEG_DOF_META } from "@/lib/legDofs";

const ALL_JOINT_DOFS = { ...ARM_JOINT_DOFS, ...TRUNK_JOINT_DOFS, ...LEG_JOINT_DOFS };
const ALL_DOF_META = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META };

const JOINT_LABELS: Record<string, string> = {
  shoulder_left: "Left Shoulder",
  shoulder_right: "Right Shoulder",
  elbow_left: "Left Elbow",
  elbow_right: "Right Elbow",
  wrist_left: "Left Wrist",
  wrist_right: "Right Wrist",
  pelvis: "Pelvis",
  lumbar: "Lumbar Spine",
  thoracic: "Thoracic Spine",
  cervical: "Cervical Spine",
  head: "Head",
  hip_left: "Left Hip",
  hip_right: "Right Hip",
  knee_left: "Left Knee",
  knee_right: "Right Knee",
  ankle_left: "Left Ankle",
  ankle_right: "Right Ankle",
};

function movementLabel(meta: { positive: string; negative: string }, value: number) {
  if (Math.abs(value) < 0.5) return "Neutral";
  return value > 0 ? meta.positive : meta.negative;
}

const STANCE_OPTIONS: { id: "none" | "left" | "right"; label: string }[] = [
  { id: "none", label: "Double" },
  { id: "left", label: "L stance" },
  { id: "right", label: "R stance" },
];

export function Sidebar() {
  const selectedJoint = useArmSimStore((s) => s.selectedJoint);
  const angles = useArmSimStore((s) => s.angles);
  const setAngle = useArmSimStore((s) => s.setAngle);
  const resetAll = useArmSimStore((s) => s.resetAll);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);
  const setStanceLeg = useArmSimStore((s) => s.setStanceLeg);

  if (!selectedJoint) {
    return (
      <aside className="flex w-80 shrink-0 flex-col items-center justify-center gap-2 border-l border-neutral-800 bg-neutral-900 px-6 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-neutral-700 text-neutral-500">
          ◎
        </div>
        <div className="text-[13px] font-medium text-neutral-200">No joint selected</div>
        <div className="text-[12px] leading-relaxed text-neutral-500">
          Click a joint marker in the viewport to open its degrees of freedom.
        </div>
      </aside>
    );
  }

  const dofs = ALL_JOINT_DOFS[selectedJoint];
  const meta = ALL_DOF_META[selectedJoint];
  const jointAngles = angles[selectedJoint] ?? {};

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-900">
      <div className="border-b border-neutral-800 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Selected joint
        </div>
        <div className="mt-0.5 text-[15px] font-semibold text-neutral-100">
          {JOINT_LABELS[selectedJoint]}
        </div>
      </div>

      {selectedJoint === "pelvis" && (
        <div className="border-b border-neutral-800 px-4 py-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Ground contact (weight-bearing leg)
          </div>
          <div className="flex gap-1">
            {STANCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStanceLeg(opt.id)}
                className={`flex-1 rounded border px-1.5 py-1 text-[11px] font-medium transition ${
                  stanceLeg === opt.id
                    ? "border-teal-600/60 bg-teal-900/25 text-teal-400"
                    : "border-neutral-700 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {stanceLeg !== "none" && (
            <div className="mt-1.5 text-[10px] leading-relaxed text-neutral-500">
              Pelvic obliquity now pivots about the {stanceLeg} hip (stays planted) —
              the other hip drops/lifts to compensate, matching real single-limb
              stance mechanics.
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 py-3">
        {Object.keys(dofs).map((dofId) => {
          const dofMeta = meta[dofId];
          const value = jointAngles[dofId] ?? 0;
          return (
            <div key={dofId} className="rounded-md border border-neutral-700 bg-neutral-800/50 p-2.5">
              <div className="mb-1 flex items-baseline justify-between">
                <div className="text-[12px] font-medium text-neutral-200">{dofMeta.label}</div>
                <div className="font-mono text-[12px] tabular-nums text-teal-400">
                  {value > 0 ? "+" : ""}
                  {Math.round(value)}°
                </div>
              </div>
              <div className="mb-1 text-[10px] text-neutral-500">{movementLabel(dofMeta, value)}</div>
              <input
                type="range"
                min={dofMeta.min}
                max={dofMeta.max}
                step={1}
                value={value}
                onChange={(e) => setAngle(selectedJoint, dofId, Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
                <span>{dofMeta.min}°</span>
                <span>{dofMeta.max}°</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-neutral-800 px-4 py-3">
        <button
          onClick={resetAll}
          className="w-full rounded-md border border-teal-700/50 bg-teal-900/20 px-2.5 py-2 text-[12px] font-medium text-teal-400 transition hover:bg-teal-900/40"
        >
          Reset Pose
        </button>
      </div>
    </aside>
  );
}
