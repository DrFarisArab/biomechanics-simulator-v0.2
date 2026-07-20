import * as THREE from "three";
import type { MutableRefObject } from "react";
import { ARM_DOF_META } from "./armDofs";
import { LEG_DOF_META } from "./legDofs";
import { TRUNK_DOF_META } from "./trunkDofs";
import { type RigPoseRefs } from "./rigPose";

export type SupportId =
  | "foot_left"
  | "foot_right"
  | "hand_left"
  | "hand_right"
  | "knee_left"
  | "knee_right"
  | "ischium_left"
  | "ischium_right"
  | "pelvis_back"
  | "thorax_back"
  | "head_back";

export type SupportSurface = "floor" | "seat" | "bed";

export type PoseSupport = {
  id: SupportId;
  surface: SupportSurface;
};

type Anchor = { bone: string; local?: [number, number, number] };

const SUPPORT_ANCHORS: Record<SupportId, Anchor> = {
  foot_left: { bone: "footL", local: [0, 0.23, 0] },
  foot_right: { bone: "footR", local: [0, 0.23, 0] },
  hand_left: { bone: "handL", local: [0, 0.18, 0] },
  hand_right: { bone: "handR", local: [0, 0.18, 0] },
  knee_left: { bone: "shinL" },
  knee_right: { bone: "shinR" },
  ischium_left: { bone: "pelvis", local: [-0.07, -0.1, 0] },
  ischium_right: { bone: "pelvis", local: [0.07, -0.1, 0] },
  pelvis_back: { bone: "pelvis", local: [0, -0.06, -0.07] },
  thorax_back: { bone: "thoracic_v6", local: [0, 0, -0.08] },
  head_back: { bone: "head", local: [0, 0.1, -0.07] },
};

type DofMeta = { min: number; max: number };
type Candidate = { jointId: string; dofId: string; maxCompensation: number };
type Calibration = {
  key: string;
  targetY: number[];
  balanceAllowance: number;
};

export type GravitySolution = {
  compensation: Record<string, Record<string, number>>;
  rootOffsetY: number;
  com: THREE.Vector3;
  supportPositions: THREE.Vector3[];
  projectionSurfaceY: number;
  stable: boolean;
};

const CANDIDATES: Candidate[] = [
  { jointId: "hip_left", dofId: "flexExt", maxCompensation: 35 },
  { jointId: "hip_right", dofId: "flexExt", maxCompensation: 35 },
  { jointId: "hip_left", dofId: "abdAdd", maxCompensation: 20 },
  { jointId: "hip_right", dofId: "abdAdd", maxCompensation: 20 },
  { jointId: "pelvis", dofId: "tilt", maxCompensation: 18 },
  { jointId: "pelvis", dofId: "obliquity", maxCompensation: 14 },
  { jointId: "lumbar", dofId: "flexExt", maxCompensation: 24 },
  { jointId: "lumbar", dofId: "lateral", maxCompensation: 16 },
  { jointId: "thoracic", dofId: "flexExt", maxCompensation: 18 },
  { jointId: "thoracic", dofId: "lateral", maxCompensation: 14 },
  { jointId: "shoulder_left", dofId: "sagittalFlexExt", maxCompensation: 28 },
  { jointId: "shoulder_right", dofId: "sagittalFlexExt", maxCompensation: 28 },
  { jointId: "shoulder_left", dofId: "abdAdd", maxCompensation: 20 },
  { jointId: "shoulder_right", dofId: "abdAdd", maxCompensation: 20 },
];

const COM_WEIGHTS: Array<[string, number]> = [
  ["pelvis", 0.14],
  ["thoracic_v6", 0.26],
  ["head", 0.08],
  ["thighL", 0.1],
  ["thighR", 0.1],
  ["shinL", 0.05],
  ["shinR", 0.05],
  ["upper_armL", 0.03],
  ["upper_armR", 0.03],
  ["forearmL", 0.02],
  ["forearmR", 0.02],
  ["handL", 0.01],
  ["handR", 0.01],
];

function getMeta(jointId: string, dofId: string): DofMeta | undefined {
  return ARM_DOF_META[jointId]?.[dofId] ?? LEG_DOF_META[jointId]?.[dofId] ?? TRUNK_DOF_META[jointId]?.[dofId];
}

function cloneAngles(angles: Record<string, Record<string, number>>) {
  const clone: Record<string, Record<string, number>> = {};
  for (const [jointId, dofs] of Object.entries(angles)) clone[jointId] = { ...dofs };
  return clone;
}

export function mergeGravityAngles(
  angles: Record<string, Record<string, number>>,
  compensation: Record<string, Record<string, number>>
) {
  const merged = cloneAngles(angles);
  for (const [jointId, dofs] of Object.entries(compensation)) {
    merged[jointId] = { ...merged[jointId] };
    for (const [dofId, delta] of Object.entries(dofs)) {
      merged[jointId][dofId] = (merged[jointId][dofId] ?? 0) + delta;
    }
  }
  return merged;
}

function supportPosition(
  support: PoseSupport,
  bones: RigPoseRefs["bones"],
  target: THREE.Vector3
) {
  const anchor = SUPPORT_ANCHORS[support.id];
  const bone = bones[anchor.bone];
  if (!bone) return false;
  if (anchor.local) {
    target.set(...anchor.local);
    bone.localToWorld(target);
  } else {
    bone.getWorldPosition(target);
  }
  return true;
}

function centerOfMass(bones: RigPoseRefs["bones"], target: THREE.Vector3) {
  target.set(0, 0, 0);
  const point = new THREE.Vector3();
  let total = 0;
  for (const [boneName, weight] of COM_WEIGHTS) {
    const bone = bones[boneName];
    if (!bone) continue;
    bone.getWorldPosition(point);
    target.addScaledVector(point, weight);
    total += weight;
  }
  return total > 0 ? target.multiplyScalar(1 / total) : target;
}

function hull(points: THREE.Vector3[]) {
  const sorted = points
    .map((point) => ({ x: point.x, z: point.z }))
    .sort((a, b) => a.x - b.x || a.z - b.z);
  if (sorted.length <= 2) return sorted;
  const cross = (a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }) =>
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const lower: { x: number; z: number }[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: { x: number; z: number }[] = [];
  for (const point of sorted.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function supportDistance(com: THREE.Vector3, supports: THREE.Vector3[]) {
  if (supports.length === 0) return 0;
  if (supports.length === 1) return Math.max(0, Math.hypot(com.x - supports[0].x, com.z - supports[0].z) - 0.12);
  if (supports.length === 2) {
    const [a, b] = supports;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = THREE.MathUtils.clamp(((com.x - a.x) * dx + (com.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.max(0, Math.hypot(com.x - (a.x + dx * t), com.z - (a.z + dz * t)) - 0.12);
  }
  const polygon = hull(supports);
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.z > com.z) !== (b.z > com.z) && com.x < ((b.x - a.x) * (com.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  if (inside) return 0;
  let min = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = THREE.MathUtils.clamp(((com.x - a.x) * dx + (com.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    min = Math.min(min, Math.hypot(com.x - (a.x + dx * t), com.z - (a.z + dz * t)));
  }
  return min;
}

function projectionSurfaceY(supports: PoseSupport[], targetY: number[]) {
  if (supports.some((support) => support.surface === "floor")) return 0;
  return targetY.length > 0 ? Math.min(...targetY) : 0;
}

function sameCompensation(a: Record<string, Record<string, number>>, b: Record<string, Record<string, number>>) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function solveGravityConstraints({
  enabled,
  supportProfileId,
  supports,
  angles,
  lastEdited,
  lockedDofs = [],
  verticalOnly = false,
  pose,
  rigRoot,
  applyPose,
  calibration,
}: {
  enabled: boolean;
  supportProfileId: string;
  supports: PoseSupport[];
  angles: Record<string, Record<string, number>>;
  lastEdited: { jointId: string; dofId: string } | null;
  lockedDofs?: string[];
  verticalOnly?: boolean;
  pose: RigPoseRefs;
  rigRoot: THREE.Group;
  applyPose: (angles: Record<string, Record<string, number>>) => void;
  calibration: MutableRefObject<Calibration | null>;
}): GravitySolution {
  rigRoot.position.y = 0;
  applyPose(angles);
  rigRoot.updateMatrixWorld(true);

  const point = new THREE.Vector3();
  const currentSupports = supports.flatMap((support) => {
    const position = new THREE.Vector3();
    return supportPosition(support, pose.bones, position) ? [position] : [];
  });
  const calibrationKey = `gravity-v2:${supportProfileId}:${supports
    .map((support) => `${support.id}:${support.surface}`)
    .join("|")}`;
  if (!enabled || supports.length === 0) {
    calibration.current = null;
    return {
      compensation: {},
      rootOffsetY: 0,
      com: centerOfMass(pose.bones, point),
      supportPositions: currentSupports,
      projectionSurfaceY: currentSupports.length > 0 ? Math.min(...currentSupports.map((position) => position.y)) : 0,
      stable: true,
    };
  }

  if (!calibration.current || calibration.current.key !== calibrationKey) {
    const com = centerOfMass(pose.bones, new THREE.Vector3());
    calibration.current = {
      key: calibrationKey,
      targetY: currentSupports.map((position) => position.y),
      balanceAllowance: supportDistance(com, currentSupports),
    };
    return {
      compensation: {},
      rootOffsetY: 0,
      com,
      supportPositions: currentSupports,
      projectionSurfaceY: projectionSurfaceY(supports, calibration.current.targetY),
      stable: true,
    };
  }
  const targetY = calibration.current.targetY;
  const compensation: Record<string, Record<string, number>> = {};
  const lockedDofSet = new Set(lockedDofs);
  const supportPoints = () =>
    supports.flatMap((support) => {
      const position = new THREE.Vector3();
      return supportPosition(support, pose.bones, position) ? [position] : [];
    });
  const score = () => {
    const points = supportPoints();
    const vertical = points.reduce((sum, position, index) => sum + (position.y - (targetY[index] ?? position.y)) ** 2, 0);
    const com = centerOfMass(pose.bones, new THREE.Vector3());
    const balanceError = Math.max(0, supportDistance(com, points) - calibration.current!.balanceAllowance);
    return vertical * 24 + balanceError ** 2 * 2;
  };
  const applyWorkingPose = () => {
    applyPose(mergeGravityAngles(angles, compensation));
    rigRoot.updateMatrixWorld(true);
  };

  if (!verticalOnly) {
    for (let pass = 0; pass < 5; pass++) {
      for (const candidate of CANDIDATES) {
        if (lastEdited?.jointId === candidate.jointId && lastEdited.dofId === candidate.dofId) continue;
        if (lockedDofSet.has(`${candidate.jointId}:${candidate.dofId}`)) continue;
        const meta = getMeta(candidate.jointId, candidate.dofId);
        if (!meta) continue;
        const current = compensation[candidate.jointId]?.[candidate.dofId] ?? 0;
        let best = current;
        let bestScore = score();
        for (const delta of [-2, 2]) {
          const next = THREE.MathUtils.clamp(current + delta, -candidate.maxCompensation, candidate.maxCompensation);
          const resolved = THREE.MathUtils.clamp((angles[candidate.jointId]?.[candidate.dofId] ?? 0) + next, meta.min, meta.max);
          const bounded = resolved - (angles[candidate.jointId]?.[candidate.dofId] ?? 0);
          compensation[candidate.jointId] = { ...compensation[candidate.jointId], [candidate.dofId]: bounded };
          applyWorkingPose();
          const nextScore = score();
          if (nextScore < bestScore) {
            best = bounded;
            bestScore = nextScore;
          }
        }
        compensation[candidate.jointId] = { ...compensation[candidate.jointId], [candidate.dofId]: best };
        applyWorkingPose();
      }
    }
  }

  const finalSupports = supportPoints();
  const averageError = finalSupports.reduce((sum, position, index) => sum + ((targetY[index] ?? position.y) - position.y), 0) /
    Math.max(1, finalSupports.length);
  rigRoot.position.y = averageError;
  rigRoot.updateMatrixWorld(true);
  const shiftedSupports = supportPoints();
  const com = centerOfMass(pose.bones, new THREE.Vector3());
  const cleaned = Object.fromEntries(
    Object.entries(compensation)
      .map(([jointId, dofs]) => [jointId, Object.fromEntries(Object.entries(dofs).filter(([, value]) => Math.abs(value) > 0.01))])
      .filter(([, dofs]) => Object.keys(dofs).length > 0)
  );
  return {
    compensation: cleaned,
    rootOffsetY: averageError,
    com,
    supportPositions: shiftedSupports,
    projectionSurfaceY: projectionSurfaceY(supports, targetY),
    stable: supportDistance(com, shiftedSupports) <= calibration.current.balanceAllowance + 0.001,
  };
}

export function gravitySolutionChanged(
  previous: { compensation: Record<string, Record<string, number>>; rootOffsetY: number },
  next: { compensation: Record<string, Record<string, number>>; rootOffsetY: number }
) {
  return !sameCompensation(previous.compensation, next.compensation) || Math.abs(previous.rootOffsetY - next.rootOffsetY) > 0.0001;
}
