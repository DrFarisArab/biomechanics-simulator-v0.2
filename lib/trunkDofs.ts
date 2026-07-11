import * as THREE from "three";
import { lumbopelvicTiltDeg } from "./lumbopelvicRhythm";

/**
 * v0.2 trunk/spine rig — UPGRADED from one rigid bone per region to a real
 * per-vertebra chain, matching the v1 app's original smooth-curve approach
 * (the earlier single-bone-per-region version was a deliberate first-pass
 * simplification, disclosed as such, now replaced).
 *
 * Chain: `pelvis` → `lumbar_v0..v4` (5, L5→L1) → `thoracic_v0..v11` (12,
 * T12→T1) → `cervical_v0..v6` (7, C7→Atlas/C1) → `head`. Each vertebra
 * mesh is bound to its OWN bone (not the whole region to one bone), so a
 * region's total clinical angle is DISTRIBUTED across its chain instead of
 * hinging rigidly at one point — verified visually in Blender before any
 * app code was written: a combined 60°/45° lumbar+thoracic flexion
 * produced a genuinely smooth, continuous forward curve.
 *
 * Same Gram-Schmidt construction + rest-position-preserving reparenting
 * technique as every other region in this rig — verified before trusting
 * it: rebuilding the chain reproduced the exact same axis-convention
 * rotation-delta test results as the single-bone version, and the
 * chain's final tip position matched the old single bone's own rest
 * position (both come from the same measured real vertebra coordinates).
 *
 * Distribution: lumbar and thoracic split each DOF UNIFORMLY (angle/N per
 * vertebra — real segmental contribution isn't perfectly uniform, but
 * good data on the exact per-level split is not something a de Leva-style
 * standard table gives the way it does for e.g. cervical rotation, so
 * uniform is the honest choice there). Cervical uses NON-UNIFORM weights
 * (CERVICAL_WEIGHTS below) approximating real segmental contribution —
 * rotation in particular is heavily atlantoaxial-dominant (C1/Atlas
 * carries ~55% of all cervical rotation in real anatomy), matching the
 * same weighting the v1 app used for this exact same DOF.
 */
export type DofSpec = { bone: string; axis: "x" | "y" | "z"; sign: 1 | -1; weight: number };
export type JointSpec = Record<string, DofSpec[]>;

const LUMBAR_COUNT = 5;
const THORACIC_COUNT = 12;
const CERVICAL_COUNT = 7;

// index 0 = cervical_v0 (C7, bottom) ... index 6 = cervical_v6 (Atlas/C1, top).
// {flexExt, lateral, rotation} weight fractions, each column sums to 1.
// Approximated from common PT-education segmental contribution figures —
// same disclosed-approximation spirit as the rest of this file, not
// primary-source data. Rotation is atlantoaxial-dominant (C1 = 0.55).
const CERVICAL_WEIGHTS: { flexExt: number; lateral: number; rotation: number }[] = [
  { flexExt: 0.10, lateral: 0.12, rotation: 0.03 }, // C7
  { flexExt: 0.12, lateral: 0.14, rotation: 0.04 }, // C6
  { flexExt: 0.14, lateral: 0.16, rotation: 0.05 }, // C5
  { flexExt: 0.16, lateral: 0.16, rotation: 0.06 }, // C4
  { flexExt: 0.16, lateral: 0.14, rotation: 0.07 }, // C3
  { flexExt: 0.17, lateral: 0.16, rotation: 0.20 }, // Axis (C2)
  { flexExt: 0.15, lateral: 0.12, rotation: 0.55 }, // Atlas (C1)
];

function makeChainDofs(
  prefix: string,
  count: number,
  axis: "x" | "y" | "z",
  sign: 1 | -1,
  weights?: number[]
): DofSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    bone: `${prefix}_v${i}`,
    axis,
    sign,
    weight: weights ? weights[i] : 1 / count,
  }));
}

const cervicalFlex = CERVICAL_WEIGHTS.map((w) => w.flexExt);
const cervicalLateral = CERVICAL_WEIGHTS.map((w) => w.lateral);
const cervicalRotation = CERVICAL_WEIGHTS.map((w) => w.rotation);

export const TRUNK_JOINT_DOFS: Record<string, JointSpec> = {
  pelvis: {
    tilt: [{ bone: "pelvis", axis: "x", sign: 1, weight: 1 }],
    obliquity: [{ bone: "pelvis", axis: "z", sign: 1, weight: 1 }],
    rotation: [{ bone: "pelvis", axis: "y", sign: 1, weight: 1 }],
  },
  lumbar: {
    flexExt: makeChainDofs("lumbar", LUMBAR_COUNT, "x", 1),
    lateral: makeChainDofs("lumbar", LUMBAR_COUNT, "z", 1),
    rotation: makeChainDofs("lumbar", LUMBAR_COUNT, "y", 1),
  },
  thoracic: {
    flexExt: makeChainDofs("thoracic", THORACIC_COUNT, "x", 1),
    lateral: makeChainDofs("thoracic", THORACIC_COUNT, "z", 1),
    rotation: makeChainDofs("thoracic", THORACIC_COUNT, "y", 1),
  },
  cervical: {
    flexExt: makeChainDofs("cervical", CERVICAL_COUNT, "x", 1, cervicalFlex),
    lateral: makeChainDofs("cervical", CERVICAL_COUNT, "z", 1, cervicalLateral),
    rotation: makeChainDofs("cervical", CERVICAL_COUNT, "y", 1, cervicalRotation),
  },
  head: {
    flexExt: [{ bone: "head", axis: "x", sign: 1, weight: 1 }],
    lateral: [{ bone: "head", axis: "z", sign: 1, weight: 1 }],
    rotation: [{ bone: "head", axis: "y", sign: 1, weight: 1 }],
  },
};

export const TRUNK_DOF_META: Record<
  string,
  Record<string, { label: string; positive: string; negative: string; min: number; max: number }>
> = {
  pelvis: {
    tilt: { label: "Posterior · Anterior tilt", positive: "Anterior tilt", negative: "Posterior tilt", min: -15, max: 20 },
    obliquity: { label: "L hike · R hike", positive: "R hike", negative: "L hike", min: -15, max: 15 },
    rotation: { label: "L rotation · R rotation", positive: "R rotation", negative: "L rotation", min: -15, max: 15 },
  },
  lumbar: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -25, max: 60 },
    lateral: { label: "Left · Right lateral flexion", positive: "Right lateral flexion", negative: "Left lateral flexion", min: -25, max: 25 },
    rotation: { label: "Left · Right rotation", positive: "Left rotation", negative: "Right rotation", min: -5, max: 5 },
  },
  thoracic: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -25, max: 45 },
    lateral: { label: "Left · Right lateral flexion", positive: "Right lateral flexion", negative: "Left lateral flexion", min: -25, max: 25 },
    rotation: { label: "Left · Right rotation", positive: "Left rotation", negative: "Right rotation", min: -35, max: 35 },
  },
  cervical: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -60, max: 50 },
    lateral: { label: "Left · Right lateral flexion", positive: "Right lateral flexion", negative: "Left lateral flexion", min: -45, max: 45 },
    rotation: { label: "Left · Right rotation", positive: "Left rotation", negative: "Right rotation", min: -80, max: 80 },
  },
  head: {
    flexExt: { label: "Extension · Flexion (head on neck)", positive: "Flexion", negative: "Extension", min: -30, max: 25 },
    lateral: { label: "Left · Right tilt (head on neck)", positive: "Right tilt", negative: "Left tilt", min: -20, max: 20 },
    rotation: { label: "Left · Right rotation (head on neck)", positive: "Left rotation", negative: "Right rotation", min: -20, max: 20 },
  },
};

const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;

/**
 * Same rest+delta composition as armDofs.ts's applyArmPose. Each DOF may
 * now target MULTIPLE bones (a chain) with per-bone weights instead of
 * always exactly one — a bone can accumulate contributions from more than
 * one DOF spec entry (e.g. every lumbar_vN bone gets a share of flexExt,
 * lateral, AND rotation), composed into one euler per bone before writing.
 *
 * Lumbopelvic rhythm: pelvis.tilt gets an ADDITIVE derived contribution
 * from the lumbar spine's current TOTAL flexion (summed across the whole
 * chain) on top of whatever the user dialled directly.
 */
export function applyTrunkPose(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  angles: Record<string, Record<string, number> | undefined>
) {
  const eulerByBone = new Map<string, [number, number, number]>();

  for (const [jointId, dofs] of Object.entries(TRUNK_JOINT_DOFS)) {
    const angleMap = angles[jointId];
    if (!angleMap) continue;
    for (const [dofId, specs] of Object.entries(dofs)) {
      let degrees = angleMap[dofId] ?? 0;
      if (jointId === "pelvis" && dofId === "tilt") {
        degrees += lumbopelvicTiltDeg(angles.lumbar?.flexExt ?? 0);
      }
      for (const spec of specs) {
        const euler = eulerByBone.get(spec.bone) ?? [0, 0, 0];
        euler[AXIS_INDEX[spec.axis]] += THREE.MathUtils.degToRad(degrees * spec.sign * spec.weight);
        eulerByBone.set(spec.bone, euler);
      }
    }
  }

  eulerByBone.forEach(([x, y, z], boneName) => {
    const bone = bones[boneName];
    const rest = restQuats[boneName];
    if (!bone || !rest) return;
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "XYZ"));
    bone.quaternion.copy(rest).multiply(delta);
  });
}

export const TRUNK_BONE_NAMES = Array.from(
  new Set(Object.values(TRUNK_JOINT_DOFS).flatMap((dofs) => Object.values(dofs).flatMap((specs) => specs.map((d) => d.bone))))
);
