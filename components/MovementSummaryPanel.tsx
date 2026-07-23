"use client";

import { useMemo, useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { ARM_DOF_META, ARM_JOINT_DOFS } from "@/lib/armDofs";
import { TRUNK_DOF_META, TRUNK_JOINT_DOFS } from "@/lib/trunkDofs";
import { LEG_DOF_META, LEG_JOINT_DOFS } from "@/lib/legDofs";
import { MANDIBLE_DOF_META, MANDIBLE_JOINT_DOFS } from "@/lib/mandibleDofs";
import { ALL_JOINT_IDS, JOINT_LABELS } from "@/lib/jointLabels";
import {
  applyGravityMovement,
  gravityMovementIsScapular,
  GRAVITY_MOVEMENTS,
} from "@/lib/gravityMovements";
import { mergeGravityAngles } from "@/lib/gravityMode";

const ALL_JOINT_DOFS = { ...ARM_JOINT_DOFS, ...TRUNK_JOINT_DOFS, ...LEG_JOINT_DOFS, ...MANDIBLE_JOINT_DOFS };
const ALL_DOF_META = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META, ...MANDIBLE_DOF_META };

const MOVING_THRESHOLD = 0.5;

type DofUnit = "°" | "mm" | "cm";

type MovingDof = {
  id: string;
  label: string;
  value: number;
  unit: DofUnit;
};

type MovingJoint = {
  id: string;
  label: string;
  dofs: MovingDof[];
};

function formatValue(value: number, unit: DofUnit) {
  const rounded = unit === "°" ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}${unit === "°" ? unit : ` ${unit}`}`;
}

export function MovementSummaryPanel() {
  const angles = useArmSimStore((s) => s.angles);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const gravityMovement = useArmSimStore((s) => s.gravityMovement);
  const gravityCompensation = useArmSimStore((s) => s.gravityCompensation);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const effectiveAngles = useMemo(() => {
    if (!gravityEnabled) return angles;
    return mergeGravityAngles(applyGravityMovement(angles, gravityMovement), gravityCompensation);
  }, [angles, gravityCompensation, gravityEnabled, gravityMovement]);

  const movingJoints = useMemo<MovingJoint[]>(
    () =>
      ALL_JOINT_IDS.map((jointId) => {
        const jointAngles = effectiveAngles[jointId] ?? {};
        const dofs = Object.keys(ALL_JOINT_DOFS[jointId] ?? {})
          .map((dofId) => {
            const value = jointAngles[dofId] ?? 0;
            if (Math.abs(value) < MOVING_THRESHOLD) return null;
            return {
              id: dofId,
              label: ALL_DOF_META[jointId]?.[dofId]?.label ?? dofId,
              value,
              unit: (jointId === "mandible" ? "mm" : "°") as DofUnit,
            } satisfies MovingDof;
          })
          .filter((dof): dof is MovingDof => dof !== null);
        if (dofs.length === 0) return null;
        return { id: jointId, label: JOINT_LABELS[jointId], dofs };
      }).filter((joint): joint is MovingJoint => joint !== null),
    [effectiveAngles]
  );

  // Scapular closed-chain movements drive a `scapula` pseudo-joint that isn't
  // in the standard DOF tables, so surface it here as its own summary row
  // rather than leaving the panel reading "Neutral pose" mid-movement.
  const scapularJoint = useMemo<MovingJoint | null>(() => {
    if (!gravityEnabled || !gravityMovementIsScapular(gravityMovement)) return null;
    if (gravityMovement.amount < MOVING_THRESHOLD) return null;
    const def = GRAVITY_MOVEMENTS.find((m) => m.id === gravityMovement.id);
    if (!def) return null;
    return {
      id: "scapula",
      label: "Scapula (bilateral)",
      dofs: [
        {
          id: gravityMovement.id,
          label: def.controlLabel,
          value: gravityMovement.amount,
          unit: def.unit === "cm" ? "cm" : "°",
        },
      ],
    };
  }, [gravityEnabled, gravityMovement]);

  const summaryJoints = useMemo(
    () => (scapularJoint ? [...movingJoints, scapularJoint] : movingJoints),
    [movingJoints, scapularJoint]
  );

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-0 w-[min(10rem,calc(100%-1rem))] opacity-70 sm:left-4 sm:top-4">
      <section className="flex flex-col overflow-hidden rounded-md border border-ink-700/40 bg-ink-950/42 shadow-sm shadow-black/10 backdrop-blur-[2px]">
        <div className={`flex shrink-0 items-center justify-between gap-2 px-2 py-1.5 ${summaryCollapsed ? "" : "border-b border-ink-800/55"}`}>
          <div className="truncate text-[9px] font-semibold uppercase tracking-wider text-ink-500">
            Movement summary
          </div>
          <button
            type="button"
            onClick={() => setSummaryCollapsed((collapsed) => !collapsed)}
            aria-label={summaryCollapsed ? "Expand movement summary" : "Collapse movement summary"}
            title={summaryCollapsed ? "Show movement details" : "Hide movement details"}
            className="pointer-events-auto grid h-5 w-5 shrink-0 place-items-center rounded border border-ink-700/55 bg-ink-900/35 text-ink-400 transition hover:border-brand-600/60 hover:text-brand-300"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
              <path
                d={summaryCollapsed ? "m4 6 4 4 4-4" : "m4 10 4-4 4 4"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-out ${summaryCollapsed ? "max-h-0 opacity-0" : "max-h-[24dvh] opacity-100"}`}>
          <div className="px-2 pt-1.5 text-[10px] font-semibold text-ink-300">
            {summaryJoints.length === 0 ? "Neutral pose" : `${summaryJoints.length} joint${summaryJoints.length === 1 ? "" : "s"} moving`}
          </div>
          {summaryJoints.length === 0 ? (
            <div className="px-2 py-1.5 text-[10px] leading-relaxed text-ink-600">
              No joint movement applied.
            </div>
          ) : (
            <div className="pointer-events-auto scroll-slim mt-1 flex max-h-[19dvh] min-h-0 flex-col gap-1 overflow-y-auto overscroll-contain p-1">
              {summaryJoints.map((joint) => (
                <div
                  key={joint.id}
                  className="rounded border border-ink-700/35 bg-ink-900/28 px-1.5 py-1 text-left"
                >
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    <span className="min-w-0 truncate text-[10px] font-semibold text-ink-300">{joint.label}</span>
                    <span className="shrink-0 text-[10px] font-medium text-brand-500">
                      {joint.dofs.length}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {joint.dofs.map((dof) => (
                      <div key={dof.id} className="flex items-baseline justify-between gap-1.5 text-[10px]">
                        <span className="min-w-0 truncate text-ink-500">{dof.label}</span>
                        <span className="shrink-0 font-mono tabular-nums text-brand-400">{formatValue(dof.value, dof.unit)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
