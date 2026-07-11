import * as THREE from "three";

/**
 * v0.2 leg DOFs — hip/knee/ankle × L/R, bones added to the SAME v2_body_rig
 * unified armature (thigh.L/R parented to pelvis, shin->thigh, foot->shin).
 * Same Gram-Schmidt construction + empirical verification method as every
 * other region in this rig.
 *
 * Sign per DOF, each individually verified via a concrete world-position
 * delta (not inferred): hip flexExt=-1 (same anterior-flexion convention as
 * shoulder/elbow), hip abdAdd L=-1/R=+1 (same L/R-mirrored frontal pattern).
 * KNEE IS THE ONE REAL DIFFERENCE FROM THE ARM: knee flexExt=+1 (NOT -1
 * like elbow) — verified explicitly rather than assumed, because real knee
 * flexion bends the shin POSTERIOR while elbow flexion bends the forearm
 * ANTERIOR; copying the elbow's sign would have been silently wrong.
 * Ankle dorsiPlantar=-1 (verified: positive raises the toes = dorsiflexion),
 * matching the v1 app's own independently-derived convention for the same
 * DOF — a useful cross-check. Ankle invEv signs are inferred by the
 * established L/R-mirroring pattern, NOT individually spot-checked (same
 * disclosed-uncertainty style as wrist pronSup/radUlnar) — hip rotation WAS
 * spot-checked via a bent-knee swing proxy (same technique as shoulder
 * internal/external rotation).
 */
export type DofSpec = { bone: string; axis: "x" | "y" | "z"; sign: 1 | -1 };
export type JointSpec = Record<string, DofSpec>;

export const LEG_JOINT_DOFS: Record<string, JointSpec> = {
  hip_left: {
    flexExt: { bone: "thighL", axis: "x", sign: -1 },
    abdAdd: { bone: "thighL", axis: "z", sign: -1 },
    rotation: { bone: "thighL", axis: "y", sign: -1 },
  },
  hip_right: {
    flexExt: { bone: "thighR", axis: "x", sign: -1 },
    abdAdd: { bone: "thighR", axis: "z", sign: 1 },
    rotation: { bone: "thighR", axis: "y", sign: 1 },
  },
  knee_left: {
    flexExt: { bone: "shinL", axis: "x", sign: 1 },
  },
  knee_right: {
    flexExt: { bone: "shinR", axis: "x", sign: 1 },
  },
  ankle_left: {
    dorsiPlantar: { bone: "footL", axis: "x", sign: -1 },
    invEv: { bone: "footL", axis: "z", sign: -1 }, // not concretely spot-checked
  },
  ankle_right: {
    dorsiPlantar: { bone: "footR", axis: "x", sign: -1 },
    invEv: { bone: "footR", axis: "z", sign: 1 }, // not concretely spot-checked
  },
};

export const LEG_DOF_META: Record<
  string,
  Record<string, { label: string; positive: string; negative: string; min: number; max: number }>
> = {
  hip_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -20, max: 120 },
    abdAdd: { label: "Adduction · Abduction", positive: "Abduction", negative: "Adduction", min: -30, max: 45 },
    rotation: { label: "Internal · External rotation", positive: "External rotation", negative: "Internal rotation", min: -40, max: 45 },
  },
  knee_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Hyperextension", min: -10, max: 140 },
  },
  ankle_left: {
    dorsiPlantar: { label: "Plantarflexion · Dorsiflexion", positive: "Dorsiflexion", negative: "Plantarflexion", min: -50, max: 20 },
    invEv: { label: "Eversion · Inversion", positive: "Inversion", negative: "Eversion", min: -20, max: 35 },
  },
};
LEG_DOF_META.hip_right = LEG_DOF_META.hip_left;
LEG_DOF_META.knee_right = LEG_DOF_META.knee_left;
LEG_DOF_META.ankle_right = LEG_DOF_META.ankle_left;

const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;

/** Same rest+delta composition as armDofs.ts's applyArmPose. */
export function applyLegPose(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  angles: Record<string, Record<string, number> | undefined>
) {
  const eulerByBone = new Map<string, [number, number, number]>();

  for (const [jointId, dofs] of Object.entries(LEG_JOINT_DOFS)) {
    const angleMap = angles[jointId];
    if (!angleMap) continue;
    for (const [dofId, spec] of Object.entries(dofs)) {
      const degrees = angleMap[dofId] ?? 0;
      const euler = eulerByBone.get(spec.bone) ?? [0, 0, 0];
      euler[AXIS_INDEX[spec.axis]] = THREE.MathUtils.degToRad(degrees * spec.sign);
      eulerByBone.set(spec.bone, euler);
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

export const LEG_BONE_NAMES = Array.from(
  new Set(Object.values(LEG_JOINT_DOFS).flatMap((dofs) => Object.values(dofs).map((d) => d.bone)))
);
