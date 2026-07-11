import * as THREE from "three";

/**
 * v0.2 trunk/spine rig — a small, purpose-built armature (v2_trunk_rig, 4
 * bones: pelvis/lumbar/thoracic/cervical), built with the SAME construction
 * method as the arm rig (see armDofs.ts's header comment for the full
 * method/verification description — Gram-Schmidt axis construction,
 * verified via concrete rotation-delta tests before any mesh was bound).
 * See ~/Documents/biomech_v2_full_arm.blend.
 *
 * SCOPE NOTE: each region (lumbar/thoracic/cervical) is ONE rigid bone —
 * all vertebrae in that region move together as a block, unlike the v1
 * app's per-vertebra distributed-rotation chain (which gave a smooth
 * curve). This is a deliberate simplification to get a bulletproof,
 * verified pipeline first; per-vertebra distribution is a possible later
 * refinement, not a blocker.
 *
 * Sign per DOF: flexExt and lateral were verified via a concrete world-
 * position delta on the lumbar bone (same method as the arm rig) —
 * positive flexExt moves anteriorly (verified: -Y decreases = anterior,
 * per the atlas's own -Y-anterior convention), positive lateral bends
 * toward the RIGHT side (verified: -X decreases = toward -X = right side,
 * since +X = left per the atlas convention). rotation's sign was verified
 * via a bent-cervical swing proxy (same technique as the arm rig's
 * internal/external rotation check): positive rotation swings the RIGHT
 * side anteriorly, i.e. the trunk turns to face LEFT — labeled "Left
 * rotation" accordingly. Pelvis DOFs (tilt/obliquity/rotation) reuse the
 * SAME per-axis convention (pelvis is bone[0] in the same chain, built the
 * same way) but were not independently spot-checked with their own test —
 * flag if they look wrong when actually posed.
 */
export type DofSpec = { bone: string; axis: "x" | "y" | "z"; sign: 1 | -1 };
export type JointSpec = Record<string, DofSpec>;

export const TRUNK_JOINT_DOFS: Record<string, JointSpec> = {
  pelvis: {
    tilt: { bone: "pelvis", axis: "x", sign: 1 },
    obliquity: { bone: "pelvis", axis: "z", sign: 1 },
    rotation: { bone: "pelvis", axis: "y", sign: 1 },
  },
  lumbar: {
    flexExt: { bone: "lumbar", axis: "x", sign: 1 },
    lateral: { bone: "lumbar", axis: "z", sign: 1 },
    rotation: { bone: "lumbar", axis: "y", sign: 1 },
  },
  thoracic: {
    flexExt: { bone: "thoracic", axis: "x", sign: 1 },
    lateral: { bone: "thoracic", axis: "z", sign: 1 },
    rotation: { bone: "thoracic", axis: "y", sign: 1 },
  },
  cervical: {
    flexExt: { bone: "cervical", axis: "x", sign: 1 },
    lateral: { bone: "cervical", axis: "z", sign: 1 },
    rotation: { bone: "cervical", axis: "y", sign: 1 },
  },
  // head bone added later (same session, full-body build), child of
  // cervical, built with the identical Gram-Schmidt method — reuses the
  // cervical sign convention by construction-similarity, NOT independently
  // spot-checked with its own rotation-delta test.
  head: {
    flexExt: { bone: "head", axis: "x", sign: 1 },
    lateral: { bone: "head", axis: "z", sign: 1 },
    rotation: { bone: "head", axis: "y", sign: 1 },
  },
};

// Clinical ROM limits (AAOS-style, matching the v1 app's rom.ts values for
// the same joints where available).
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

/** Same rest+delta composition as armDofs.ts's applyArmPose — see that
 * file's doc comment for why an absolute rotation.set() is wrong for this
 * rig (bones don't have identity rotation at rest). */
export function applyTrunkPose(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  angles: Record<string, Record<string, number> | undefined>
) {
  const eulerByBone = new Map<string, [number, number, number]>();

  for (const [jointId, dofs] of Object.entries(TRUNK_JOINT_DOFS)) {
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

export const TRUNK_BONE_NAMES = Array.from(
  new Set(Object.values(TRUNK_JOINT_DOFS).flatMap((dofs) => Object.values(dofs).map((d) => d.bone)))
);
