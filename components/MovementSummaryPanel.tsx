"use client";

import { useMemo } from "react";
import { useArmSimStore } from "@/lib/store";
import { ARM_DOF_META, ARM_JOINT_DOFS } from "@/lib/armDofs";
import { TRUNK_DOF_META, TRUNK_JOINT_DOFS } from "@/lib/trunkDofs";
import { LEG_DOF_META, LEG_JOINT_DOFS } from "@/lib/legDofs";
import { MANDIBLE_DOF_META, MANDIBLE_JOINT_DOFS } from "@/lib/mandibleDofs";
import { ALL_JOINT_IDS, JOINT_LABELS } from "@/lib/jointLabels";
import { applyGravityMovement } from "@/lib/gravityMovements";
import { mergeGravityAngles } from "@/lib/gravityMode";

const ALL_JOINT_DOFS = { ...ARM_JOINT_DOFS, ...TRUNK_JOINT_DOFS, ...LEG_JOINT_DOFS, ...MANDIBLE_JOINT_DOFS };
const ALL_DOF_META = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META, ...MANDIBLE_DOF_META };

const MOVING_THRESHOLD = 0.5;

type MovingDof = {
  id: string;
  label: string;
  value: number;
  unit: "°" | "mm";
};

type MovingJoint = {
  id: string;
  label: string;
  dofs: MovingDof[];
};

function formatValue(value: number, unit: "°" | "mm") {
  const rounded = unit === "mm" ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}${unit}`;
}

export function MovementSummaryPanel() {
  const angles = useArmSimStore((s) => s.angles);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const gravityMovement = useArmSimStore((s) => s.gravityMovement);
  const gravityCompensation = useArmSimStore((s) => s.gravityCompensation);
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
              unit: jointId === "mandible" ? "mm" : "°",
            } satisfies MovingDof;
          })
          .filter((dof): dof is MovingDof => dof !== null);
        if (dofs.length === 0) return null;
        return { id: jointId, label: JOINT_LABELS[jointId], dofs };
      }).filter((joint): joint is MovingJoint => joint !== null),
    [effectiveAngles]
  );

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-0 max-h-[36dvh] w-[min(15rem,calc(100%-1.5rem))] opacity-80 sm:left-4 sm:top-4">
      <section className="flex max-h-[36dvh] flex-col overflow-hidden rounded-md border border-ink-700/45 bg-ink-950/48 shadow-sm shadow-black/10 backdrop-blur-[2px]">
        <div className="shrink-0 border-b border-ink-800/60 px-2.5 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Movement summary
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-ink-300">
            {movingJoints.length === 0 ? "Neutral pose" : `${movingJoints.length} joint${movingJoints.length === 1 ? "" : "s"} moving`}
          </div>
        </div>

        {movingJoints.length === 0 ? (
          <div className="px-2.5 py-2.5 text-[11px] leading-relaxed text-ink-600">
            No joint movement applied.
          </div>
        ) : (
          <div className="scroll-slim flex min-h-0 flex-col gap-1 overflow-y-auto p-1.5">
            {movingJoints.map((joint) => (
              <div
                key={joint.id}
                className="rounded border border-ink-700/35 bg-ink-900/28 px-2 py-1.5 text-left"
              >
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="min-w-0 truncate text-[11px] font-semibold text-ink-300">{joint.label}</span>
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
      </section>
    </div>
  );
}
