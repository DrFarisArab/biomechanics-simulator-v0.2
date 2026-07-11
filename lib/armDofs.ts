import * as THREE from "three";

/**
 * v0.2 arm rig — a small, purpose-built armature (v2_arm_rig, 6 bones:
 * upper_arm/forearm/hand × L/R), built fresh in Blender specifically for
 * this app (NOT the Rigify metarig used in the v1 attempt — no FK/IK/tweak
 * constraint layers to fight, so bones are driven directly with nothing to
 * mute). See ~/Documents/biomech_v2_arms.blend.
 *
 * Axis convention, established by CONSTRUCTION (not inherited/assumed):
 * each bone's local Y axis is its own head→tail direction; local X is the
 * world X axis (medial-lateral) Gram-Schmidt-orthogonalized against Y; local
 * Z completes the right-handed basis. Verified empirically before any mesh
 * was bound — rotating a bone's local X moved its child's world Y (and a
 * little Z) while world X stayed ~fixed (confirms X = sagittal-plane axis);
 * rotating local Z moved world X while Y stayed ~fixed (confirms Z =
 * frontal-plane axis). See the Blender session transcript for the exact
 * numeric deltas.
 *
 * Sign per DOF: shoulder flexExt/abdAdd/rotation and elbow flexExt were each
 * individually verified via a concrete world-position delta (which way the
 * hand/elbow tip actually moved for a positive test rotation), matching this
 * app's clinical convention (rom.ts's positive/negative labels). Wrist
 * radUlnar/pronSup signs are inferred by the same L/R-mirroring pattern
 * every other paired frontal/transverse DOF in this project follows, but are
 * NOT individually spot-checked (same honest disclosure as the original
 * Blender project's own pronation/supination caveat) — flag if they look
 * wrong when actually posed.
 */
export type DofSpec = { bone: string; axis: "x" | "y" | "z"; sign: 1 | -1 };
export type JointSpec = Record<string, DofSpec>;

export const ARM_JOINT_DOFS: Record<string, JointSpec> = {
  shoulder_left: {
    flexExt: { bone: "upper_armL", axis: "x", sign: -1 },
    abdAdd: { bone: "upper_armL", axis: "z", sign: -1 },
    rotation: { bone: "upper_armL", axis: "y", sign: -1 },
  },
  shoulder_right: {
    flexExt: { bone: "upper_armR", axis: "x", sign: -1 },
    abdAdd: { bone: "upper_armR", axis: "z", sign: 1 },
    rotation: { bone: "upper_armR", axis: "y", sign: 1 },
  },
  elbow_left: {
    flexExt: { bone: "forearmL", axis: "x", sign: -1 },
  },
  elbow_right: {
    flexExt: { bone: "forearmR", axis: "x", sign: -1 },
  },
  wrist_left: {
    flexExt: { bone: "handL", axis: "x", sign: -1 },
    radUlnar: { bone: "handL", axis: "z", sign: -1 },
    pronSup: { bone: "handL", axis: "y", sign: -1 }, // not concretely spot-checked
  },
  wrist_right: {
    flexExt: { bone: "handR", axis: "x", sign: -1 },
    radUlnar: { bone: "handR", axis: "z", sign: 1 },
    pronSup: { bone: "handR", axis: "y", sign: 1 }, // not concretely spot-checked
  },
};

// Clinical ROM limits (AAOS-style, matching the v1 app's rom.ts values for
// the same joints) — used to clamp slider input and label DOFs in the UI.
export const ARM_DOF_META: Record<
  string,
  Record<string, { label: string; positive: string; negative: string; min: number; max: number }>
> = {
  shoulder_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -60, max: 180 },
    abdAdd: { label: "Adduction · Abduction", positive: "Abduction", negative: "Adduction", min: -40, max: 180 },
    rotation: { label: "Internal · External rotation", positive: "External rotation", negative: "Internal rotation", min: -70, max: 90 },
  },
  elbow_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -5, max: 145 },
  },
  wrist_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -70, max: 80 },
    radUlnar: { label: "Radial · Ulnar deviation", positive: "Ulnar deviation", negative: "Radial deviation", min: -20, max: 30 },
    pronSup: { label: "Pronation · Supination", positive: "Supination", negative: "Pronation", min: -80, max: 85 },
  },
};
ARM_DOF_META.shoulder_right = ARM_DOF_META.shoulder_left;
ARM_DOF_META.elbow_right = ARM_DOF_META.elbow_left;
ARM_DOF_META.wrist_right = ARM_DOF_META.wrist_left;

const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;

/**
 * Applies every joint's current angle map onto the loaded bone objects,
 * composing multiple DOFs sharing one bone (e.g. shoulder's 3 DOFs all live
 * on upper_arm.*) into a single euler before writing it once.
 *
 * CRITICAL: this rig's bones do NOT have identity rotation at rest (unlike
 * Rigify's DEF bones, which are built so rotation=(0,0,0) IS the rest pose —
 * true there because Blender's own pose system separates "rest" from "pose"
 * and always composes them for you). Our bones were built with an explicit
 * Gram-Schmidt matrix per bone, so each one's LOADED rotation already
 * encodes a real, non-identity rest orientation. Calling
 * `bone.rotation.set(x,y,z)` directly (as the v1 arm code did) OVERWRITES
 * that rest orientation with the pose delta, collapsing the whole rig and
 * breaking the skin binding — this was found live ("model is upside down
 * without colors": the mesh renders using the bind-pose skin weights while
 * the bones no longer match that bind pose at all). Fix: compose
 * `finalQuat = restQuat * deltaQuat` — same relationship as Blender's own
 * `pose_bone.matrix_local = rest_matrix_local @ pose_delta_matrix`.
 */
export function applyArmPose(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  angles: Record<string, Record<string, number> | undefined>
) {
  const eulerByBone = new Map<string, [number, number, number]>();

  for (const [jointId, dofs] of Object.entries(ARM_JOINT_DOFS)) {
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

export const ARM_BONE_NAMES = Array.from(
  new Set(Object.values(ARM_JOINT_DOFS).flatMap((dofs) => Object.values(dofs).map((d) => d.bone)))
);
