import * as THREE from "three";
import { ARM_JOINT_DOFS, ARM_DOF_META } from "./armDofs";
import { TRUNK_JOINT_DOFS, TRUNK_DOF_META } from "./trunkDofs";
import { LEG_JOINT_DOFS, LEG_DOF_META } from "./legDofs";
import type { Clip, Easing, Keyframe } from "./clip";

/**
 * Record & Replay's interpolation core. This is deliberately NOT a from-
 * scratch animation system: it reuses the exact same DOF spec tables
 * (ARM/TRUNK/LEG_JOINT_DOFS — axis + sign per DOF) and the exact same
 * `"XYZ"` Euler composition order that armDofs.ts/trunkDofs.ts/legDofs.ts's
 * own applyArmPose/applyTrunkPose/applyLegPose already use to turn DOF
 * angles into a bone quaternion (verified directly in those files — every
 * region in this rig composes with `new THREE.Euler(x, y, z, "XYZ")`, no
 * exceptions, so there is no per-region order table to maintain here beyond
 * this one constant). The output of this module is a plain
 * `{ jointId: { dofId: degrees } }` patch — playback never touches a bone
 * or a THREE.Object3D directly, it only ever calls the store's
 * `patchAngles`, and the SAME existing BodyModel/SkinOverlay pose pipeline
 * (unmodified) re-renders from that on its next effect run. That's what
 * "reuse the existing pose-tween code, don't build a second parallel
 * animation system" means in practice here.
 */
const EULER_ORDER: THREE.EulerOrder = "XYZ";
const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;

type FlatDofSpec = { axis: "x" | "y" | "z"; sign: 1 | -1 };

// Normalizes both DofSpec shapes in this codebase — arm/leg DOFs are a
// single { bone, axis, sign } object; trunk (spine-chain) DOFs are a
// DofSpec[] (one entry per vertebra). Every entry in a chain array shares
// the same axis/sign (only per-vertebra `weight` differs — see
// trunkDofs.ts's makeChainDofs), so `specs[0]` is a safe, exact
// representative for the whole DOF at the joint level. Only axis/sign are
// needed here: the per-vertebra weighted fan-out is a bone-application
// detail that the existing applyTrunkPose already re-derives, unchanged,
// from whatever raw DOF angle this module writes back into the store.
function flattenSpec(spec: unknown): FlatDofSpec {
  if (Array.isArray(spec)) {
    const first = spec[0] as { axis: "x" | "y" | "z"; sign: 1 | -1 };
    return { axis: first.axis, sign: first.sign };
  }
  const s = spec as { axis: "x" | "y" | "z"; sign: 1 | -1 };
  return { axis: s.axis, sign: s.sign };
}

const ALL_JOINT_DOFS: Record<string, Record<string, unknown>> = {
  ...ARM_JOINT_DOFS,
  ...TRUNK_JOINT_DOFS,
  ...LEG_JOINT_DOFS,
};
const ALL_DOF_META: Record<string, Record<string, { min: number; max: number }>> = {
  ...ARM_DOF_META,
  ...TRUNK_DOF_META,
  ...LEG_DOF_META,
};

function getSpec(jointId: string, dofId: string): FlatDofSpec | undefined {
  const raw = ALL_JOINT_DOFS[jointId]?.[dofId];
  return raw === undefined ? undefined : flattenSpec(raw);
}

function clampToRom(jointId: string, dofId: string, value: number): number {
  const meta = ALL_DOF_META[jointId]?.[dofId];
  if (!meta) return value;
  return Math.min(meta.max, Math.max(meta.min, value));
}

export function linear(t: number): number {
  return t;
}

// Standard cubic ease-in-out — accelerates out of a keyframe, decelerates
// into the next one, symmetric around t=0.5.
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easingFn(easing: Easing): (t: number) => number {
  return easing === "linear" ? linear : easeInOutCubic;
}

/**
 * Interpolates ONE joint's DOFs from poseA to poseB at eased alpha in
 * [0, 1], using quaternion SLERP for any DOFs that map to distinct axes
 * (the general, correct case — this is what makes a compound multi-axis
 * rotation like a shoulder's abdAdd+rotation trace a natural 3D arc instead
 * of each axis swinging independently on its own schedule). DOFs that
 * happen to share a single axis on the same joint (only shoulder's
 * flexExt/sagittalFlexExt, both on upper_arm's local X — see armDofs.ts)
 * fall back to direct eased-scalar interpolation for just those DOFs:
 * SLERP only changes the interpolated PATH when multiple axes are
 * involved simultaneously, and two DOFs on one axis are, by construction,
 * a single one-dimensional angle with no cross-axis path to preserve —
 * scalar interpolation of each is exact and loses nothing.
 */
export function interpolateJointDofs(
  jointId: string,
  poseA: Record<string, number>,
  poseB: Record<string, number>,
  alpha: number
): Record<string, number> {
  const dofIds = Array.from(new Set([...Object.keys(poseA), ...Object.keys(poseB)]));

  const byAxis = new Map<"x" | "y" | "z", string[]>();
  for (const dofId of dofIds) {
    const spec = getSpec(jointId, dofId);
    if (!spec) continue;
    const list = byAxis.get(spec.axis) ?? [];
    list.push(dofId);
    byAxis.set(spec.axis, list);
  }

  const result: Record<string, number> = {};
  const eulerA: [number, number, number] = [0, 0, 0];
  const eulerB: [number, number, number] = [0, 0, 0];
  const composableAxisDofs: { dofId: string; axis: "x" | "y" | "z"; sign: 1 | -1 }[] = [];

  for (const [axis, dofsOnAxis] of Array.from(byAxis.entries())) {
    if (dofsOnAxis.length > 1) {
      // Axis collision — interpolate each of these DOFs directly.
      for (const dofId of dofsOnAxis) {
        const a = poseA[dofId] ?? 0;
        const b = poseB[dofId] ?? poseA[dofId] ?? 0;
        result[dofId] = clampToRom(jointId, dofId, THREE.MathUtils.lerp(a, b, alpha));
      }
      continue;
    }
    const dofId = dofsOnAxis[0];
    const spec = getSpec(jointId, dofId)!;
    const a = poseA[dofId] ?? 0;
    const b = poseB[dofId] ?? poseA[dofId] ?? 0;
    eulerA[AXIS_INDEX[axis]] = THREE.MathUtils.degToRad(a * spec.sign);
    eulerB[AXIS_INDEX[axis]] = THREE.MathUtils.degToRad(b * spec.sign);
    composableAxisDofs.push({ dofId, axis, sign: spec.sign });
  }

  if (composableAxisDofs.length > 0) {
    const qA = new THREE.Quaternion().setFromEuler(new THREE.Euler(eulerA[0], eulerA[1], eulerA[2], EULER_ORDER));
    const qB = new THREE.Quaternion().setFromEuler(new THREE.Euler(eulerB[0], eulerB[1], eulerB[2], EULER_ORDER));
    const qT = qA.clone().slerp(qB, alpha);
    const eulerT = new THREE.Euler().setFromQuaternion(qT, EULER_ORDER);
    const eulerTArr = [eulerT.x, eulerT.y, eulerT.z];
    for (const { dofId, axis, sign } of composableAxisDofs) {
      const degrees = THREE.MathUtils.radToDeg(eulerTArr[AXIS_INDEX[axis]]) / sign;
      result[dofId] = clampToRom(jointId, dofId, degrees);
    }
  }

  return result;
}

/**
 * Given a clip and a point in time, returns a sparse angles patch covering
 * ONLY `clip.trackedJoints` — pass this straight to the store's
 * `patchAngles`. Every other joint is simply absent from the return value,
 * so it is never touched.
 */
export function applyClipAtTime(clip: Clip, time: number): Record<string, Record<string, number>> {
  const kfs = clip.keyframes;
  if (kfs.length === 0) return {};

  if (kfs.length === 1 || time <= kfs[0].time) {
    return kfs[0].poses;
  }
  const last = kfs[kfs.length - 1];
  if (time >= last.time) {
    return last.poses;
  }

  let i = 0;
  while (i < kfs.length - 1 && kfs[i + 1].time <= time) i++;
  const a = kfs[i];
  const b = kfs[i + 1];
  const span = b.time - a.time;
  const rawAlpha = span > 0 ? (time - a.time) / span : 1;
  const alpha = easingFn(clip.easing)(Math.min(1, Math.max(0, rawAlpha)));

  const out: Record<string, Record<string, number>> = {};
  for (const jointId of clip.trackedJoints) {
    const poseA = a.poses[jointId] ?? {};
    const poseB = b.poses[jointId] ?? poseA;
    out[jointId] = interpolateJointDofs(jointId, poseA, poseB, alpha);
  }
  return out;
}

export function findKeyframeById(clip: Clip | null, id: string): Keyframe | undefined {
  return clip?.keyframes.find((k) => k.id === id);
}
