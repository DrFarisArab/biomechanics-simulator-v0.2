"use client";

import { useArmSimStore } from "@/lib/store";
import { ARM_JOINT_DOFS, ARM_DOF_META } from "@/lib/armDofs";
import { TRUNK_JOINT_DOFS, TRUNK_DOF_META } from "@/lib/trunkDofs";
import { LEG_JOINT_DOFS, LEG_DOF_META } from "@/lib/legDofs";
import { MANDIBLE_JOINT_DOFS, MANDIBLE_DOF_META } from "@/lib/mandibleDofs";
import { JOINT_LABELS } from "@/lib/jointLabels";
import { GRAVITY_MOVEMENTS } from "@/lib/gravityMovements";
import { DegreeSlider } from "./DegreeSlider";

const ALL_JOINT_DOFS = { ...ARM_JOINT_DOFS, ...TRUNK_JOINT_DOFS, ...LEG_JOINT_DOFS, ...MANDIBLE_JOINT_DOFS };
const ALL_DOF_META = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META, ...MANDIBLE_DOF_META };

function movementLabel(meta: { positive: string; negative: string }, value: number) {
  if (Math.abs(value) < 0.5) return "Neutral";
  return value > 0 ? meta.positive : meta.negative;
}

const STANCE_OPTIONS: { id: "none" | "left" | "right"; label: string }[] = [
  { id: "none", label: "Double" },
  { id: "left", label: "L stance" },
  { id: "right", label: "R stance" },
];

type JointPickerItem = {
  key: string;
  jointId: string;
  label: string;
};

const JOINT_PICKER_SECTIONS: { id: string; label: string; joints: JointPickerItem[] }[] = [
  {
    id: "center",
    label: "Center",
    joints: [
      { key: "head", jointId: "head", label: JOINT_LABELS.head },
      { key: "cervical", jointId: "cervical", label: JOINT_LABELS.cervical },
      { key: "thoracic", jointId: "thoracic", label: JOINT_LABELS.thoracic },
      { key: "lumbar", jointId: "lumbar", label: JOINT_LABELS.lumbar },
      { key: "pelvis", jointId: "pelvis", label: JOINT_LABELS.pelvis },
    ],
  },
  {
    id: "left",
    label: "Left",
    joints: [
      { key: "tmj_left", jointId: "mandible", label: "Left TMJ" },
      { key: "shoulder_left", jointId: "shoulder_left", label: JOINT_LABELS.shoulder_left },
      { key: "elbow_left", jointId: "elbow_left", label: JOINT_LABELS.elbow_left },
      { key: "forearm_left", jointId: "forearm_left", label: JOINT_LABELS.forearm_left },
      { key: "wrist_left", jointId: "wrist_left", label: JOINT_LABELS.wrist_left },
      { key: "hip_left", jointId: "hip_left", label: JOINT_LABELS.hip_left },
      { key: "knee_left", jointId: "knee_left", label: JOINT_LABELS.knee_left },
      { key: "ankle_left", jointId: "ankle_left", label: JOINT_LABELS.ankle_left },
    ],
  },
  {
    id: "right",
    label: "Right",
    joints: [
      { key: "tmj_right", jointId: "mandible", label: "Right TMJ" },
      { key: "shoulder_right", jointId: "shoulder_right", label: JOINT_LABELS.shoulder_right },
      { key: "elbow_right", jointId: "elbow_right", label: JOINT_LABELS.elbow_right },
      { key: "forearm_right", jointId: "forearm_right", label: JOINT_LABELS.forearm_right },
      { key: "wrist_right", jointId: "wrist_right", label: JOINT_LABELS.wrist_right },
      { key: "hip_right", jointId: "hip_right", label: JOINT_LABELS.hip_right },
      { key: "knee_right", jointId: "knee_right", label: JOINT_LABELS.knee_right },
      { key: "ankle_right", jointId: "ankle_right", label: JOINT_LABELS.ankle_right },
    ],
  },
];

function activeDofCount(jointAngles: Record<string, number> | undefined) {
  return Object.values(jointAngles ?? {}).filter((value) => Math.abs(value) >= 0.5).length;
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path d="M5.2 4.2h7.3M5.2 8h7.3M5.2 11.8h7.3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M2.8 4.2h.05M2.8 8h.05M2.8 11.8h.05" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChainModeSelector({
  closedChain,
  onChange,
}: {
  closedChain: boolean;
  onChange: (closedChain: boolean) => void;
}) {
  return (
    <div className="border-b border-ink-800 px-4 py-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        Chain mode
      </div>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-[11px] font-medium transition ${
            closedChain ? "text-brand-400" : "text-ink-500"
          }`}
        >
          Close-chain
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!closedChain}
          aria-label="Toggle between close-chain and open-chain modes"
          onClick={() => onChange(!closedChain)}
          data-on={!closedChain}
          className="flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600"
        >
          <span className="h-4 w-4 rounded-full bg-ink-50 shadow-sm transition-transform" />
        </button>
        <span
          className={`text-[11px] font-medium transition ${
            !closedChain ? "text-brand-400" : "text-ink-500"
          }`}
        >
          Open-chain
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const selectedJoint = useArmSimStore((s) => s.selectedJoint);
  const hoveredJoint = useArmSimStore((s) => s.hoveredJoint);
  const angles = useArmSimStore((s) => s.angles);
  const setAngle = useArmSimStore((s) => s.setAngle);
  const resetAll = useArmSimStore((s) => s.resetAll);
  const selectJoint = useArmSimStore((s) => s.selectJoint);
  const hoverJoint = useArmSimStore((s) => s.hoverJoint);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);
  const setStanceLeg = useArmSimStore((s) => s.setStanceLeg);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const gravityMovement = useArmSimStore((s) => s.gravityMovement);
  const setGravityEnabled = useArmSimStore((s) => s.setGravityEnabled);
  const setGravityMovement = useArmSimStore((s) => s.setGravityMovement);
  const setGravityMovementAmount = useArmSimStore((s) => s.setGravityMovementAmount);
  const setGravityMovementSide = useArmSimStore((s) => s.setGravityMovementSide);
  const resetGravityMovement = useArmSimStore((s) => s.resetGravityMovement);
  const setChainMode = (closedChain: boolean) => {
    if (closedChain === gravityEnabled) return;
    hoverJoint(null);
    selectJoint(null);
    setGravityEnabled(closedChain);
  };

  if (gravityEnabled) {
    const movement = GRAVITY_MOVEMENTS.find((item) => item.id === gravityMovement.id) ?? GRAVITY_MOVEMENTS[0];
    return (
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-ink-800 bg-ink-900 sm:h-auto sm:w-80 sm:border-l">
        <ChainModeSelector closedChain onChange={setChainMode} />
        <div className="border-b border-ink-800 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Closed-chain movements
          </div>
          <div className="mt-0.5 text-[15px] font-semibold text-ink-100">Select a Movement</div>
        </div>

        <div className="scroll-slim flex flex-col gap-4 px-4 py-3 sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
          <section>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Movement
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {GRAVITY_MOVEMENTS.map((item) => {
                const active = item.id === gravityMovement.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGravityMovement(item.id)}
                    className={`min-h-9 rounded-md border px-2 py-2 text-[12px] font-medium leading-tight transition ${
                      active
                        ? "border-brand-600/70 bg-brand-900/30 text-brand-300"
                        : "border-ink-700 bg-ink-800/40 text-ink-300 hover:border-ink-600 hover:bg-ink-800"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>

          {movement.sideLabel && (
            <section>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {movement.sideLabel}
              </div>
              <div className="flex gap-1">
                {(["left", "right"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setGravityMovementSide(side)}
                    className={`flex-1 rounded border px-2 py-1.5 text-[11px] font-medium capitalize transition ${
                      gravityMovement.side === side
                        ? "border-brand-600/60 bg-brand-900/25 text-brand-400"
                        : "border-ink-700 text-ink-400 hover:text-ink-200"
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-md border border-ink-700 bg-ink-800/50 p-2.5">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div className="text-[12px] font-medium text-ink-200">{movement.controlLabel}</div>
              <div className="shrink-0 font-mono text-[12px] tabular-nums text-brand-400">
                {Math.round(gravityMovement.amount)}°
              </div>
            </div>
            <div className="mb-1.5 text-[10px] leading-relaxed text-ink-500">{movement.summary}</div>
            <DegreeSlider
              value={gravityMovement.amount}
              min={0}
              max={movement.max}
              onChange={setGravityMovementAmount}
            />
          </section>

          <div className="rounded border border-ink-800 bg-ink-950/35 px-2.5 py-2 text-[10px] leading-relaxed text-ink-500">
            Support contacts stay anchored while the movement knob coordinates the linked joints.
          </div>
        </div>

        <div className="mt-auto border-t border-ink-800 px-4 py-3">
          <button
            type="button"
            onClick={resetGravityMovement}
            className="w-full rounded-md border border-brand-700/50 bg-brand-900/20 px-2.5 py-2 text-[12px] font-medium text-brand-400 transition hover:bg-brand-900/40"
          >
            Reset Movement
          </button>
        </div>
      </aside>
    );
  }

  if (!selectedJoint) {
    return (
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-ink-800 bg-ink-900 sm:h-auto sm:w-80 sm:border-l">
        <ChainModeSelector closedChain={false} onChange={setChainMode} />
        <div className="border-b border-ink-800 px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Open-chain movements
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-[15px] font-semibold text-ink-100">Select a joint</div>
            <button
              type="button"
              onClick={resetAll}
              className="shrink-0 rounded-md border border-warning-500/45 bg-warning-500/12 px-2 py-1 text-[10px] font-semibold text-warning-300 transition hover:border-warning-400/70 hover:bg-warning-500/20"
            >
              Reset Model
            </button>
          </div>
        </div>

        <div className="scroll-slim flex flex-col gap-3 px-4 py-3 sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
          {JOINT_PICKER_SECTIONS.map((section) => (
            <section key={section.id}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {section.label}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {section.joints.map((joint) => {
                  const isHovered = hoveredJoint === joint.jointId;
                  const activeCount = activeDofCount(angles[joint.jointId]);
                  return (
                    <button
                      key={joint.key}
                      type="button"
                      onClick={() => selectJoint(joint.jointId)}
                      onMouseEnter={() => hoverJoint(joint.jointId)}
                      onMouseLeave={() => hoverJoint(null)}
                      onFocus={() => hoverJoint(joint.jointId)}
                      onBlur={() => hoverJoint(null)}
                      className={`flex h-9 items-center justify-between gap-2 rounded-md border px-2.5 text-left transition ${
                        isHovered
                          ? "border-brand-600/70 bg-brand-900/30 text-brand-200"
                          : "border-ink-700 bg-ink-800/40 text-ink-200 hover:border-ink-600 hover:bg-ink-800"
                      }`}
                    >
                      <span className="min-w-0 truncate text-[12px] font-medium">{joint.label}</span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          activeCount > 0
                            ? "border border-warning-500/60 bg-warning-500/18 text-warning-300 shadow-[0_0_10px_rgba(245,158,11,0.18)]"
                            : "bg-ink-900 text-ink-500"
                        }`}
                      >
                        {activeCount > 0 ? `${activeCount} moved` : "Neutral"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </aside>
    );
  }

  const dofs = ALL_JOINT_DOFS[selectedJoint];
  const meta = ALL_DOF_META[selectedJoint];
  const jointAngles = angles[selectedJoint] ?? {};
  // The mandible's DOFs are measured in millimetres of translation/
  // interincisal distance (see mandibleDofs.ts), not degrees like every
  // other joint here — only the display unit differs, the slider/state
  // plumbing is identical.
  const unit = selectedJoint === "mandible" ? "mm" : "°";

  // Ground-contact stance mode locks the stance leg's hip/knee/ankle —
  // moving them manually would silently invalidate the pinned-hip geometry
  // (see stanceMode.ts's computePelvisPivotOffset/stanceHipCorrectionDeg,
  // which only cancels the frontal-plane obliquity contribution, not
  // arbitrary flexion/rotation that would lift the "planted" foot).
  const isStanceLegJoint =
    stanceLeg !== "none" &&
    (selectedJoint === `hip_${stanceLeg}` ||
      selectedJoint === `knee_${stanceLeg}` ||
      selectedJoint === `ankle_${stanceLeg}`);

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-ink-800 bg-ink-900 sm:h-auto sm:w-80 sm:border-l">
      <ChainModeSelector closedChain={false} onChange={setChainMode} />
      <div className="border-b border-ink-800 px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          Selected joint
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[15px] font-semibold text-ink-100">
            {JOINT_LABELS[selectedJoint]}
          </div>
          <button
            type="button"
            onClick={() => {
              hoverJoint(null);
              selectJoint(null);
            }}
            aria-label="Show joint marker list"
            title="Joint marker list"
            className="grid h-7 w-7 shrink-0 place-items-center rounded border border-ink-700 bg-ink-800 text-ink-300 transition hover:border-brand-600/60 hover:text-brand-300"
          >
            <ListIcon />
          </button>
        </div>
      </div>

      {selectedJoint === "pelvis" && (
        <div className="border-b border-ink-800 px-4 py-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Ground contact (weight-bearing leg)
          </div>
          <div className="flex gap-1">
            {STANCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStanceLeg(opt.id)}
                className={`flex-1 rounded border px-1.5 py-1 text-[11px] font-medium transition ${
                  stanceLeg === opt.id
                    ? "border-brand-600/60 bg-brand-900/25 text-brand-400"
                    : "border-ink-700 text-ink-400 hover:text-ink-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {stanceLeg !== "none" && (
            <div className="mt-1.5 text-[10px] leading-relaxed text-ink-500">
              Pelvic obliquity now pivots about the {stanceLeg} hip (stays planted) —
              the other hip drops/lifts to compensate, matching real single-limb
              stance mechanics.
            </div>
          )}
        </div>
      )}

      <div className="scroll-slim flex flex-col gap-2 px-4 py-3 sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
        {Object.keys(dofs).map((dofId) => {
          const dofMeta = meta[dofId];
          const value = jointAngles[dofId] ?? 0;
          if (isStanceLegJoint) {
            return (
              <div
                key={dofId}
                className="rounded-md border border-dashed border-ink-700 bg-ink-800/20 p-2.5 opacity-60"
              >
                <div className="mb-1 flex items-baseline justify-between">
                  <div className="text-[12px] font-medium text-ink-300">{dofMeta.label}</div>
                  <div className="font-mono text-[12px] tabular-nums text-ink-500">
                    {value > 0 ? "+" : ""}
                    {Math.round(value)}{unit}
                  </div>
                </div>
                <div className="text-[10px] text-ink-500">
                  Locked — this leg is the ground-contact stance limb. Select
                  Pelvis to change stance leg.
                </div>
              </div>
            );
          }
          return (
            <div key={dofId} className="rounded-md border border-ink-700 bg-ink-800/50 p-2.5">
              <div className="mb-1 flex items-baseline justify-between">
                <div className="text-[12px] font-medium text-ink-200">{dofMeta.label}</div>
                <div className="font-mono text-[12px] tabular-nums text-brand-400">
                  {value > 0 ? "+" : ""}
                  {Math.round(value)}{unit}
                </div>
              </div>
              <div className="mb-1.5 text-[10px] text-ink-500">{movementLabel(dofMeta, value)}</div>
              <DegreeSlider
                value={value}
                min={dofMeta.min}
                max={dofMeta.max}
                onChange={(next) => setAngle(selectedJoint, dofId, next)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-auto border-t border-ink-800 px-4 py-3">
        <button
          onClick={resetAll}
          className="w-full rounded-md border border-brand-700/50 bg-brand-900/20 px-2.5 py-2 text-[12px] font-medium text-brand-400 transition hover:bg-brand-900/40"
        >
          Reset Pose
        </button>
      </div>
    </aside>
  );
}
