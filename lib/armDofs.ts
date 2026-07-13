import * as THREE from "three";
import { scapularReductionDeg } from "./scapularRhythm";

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
 * radUlnar and forearm pronSup signs are inferred by the same L/R-mirroring
 * pattern every other paired frontal/transverse DOF in this project follows,
 * but are NOT individually spot-checked (same honest disclosure as the
 * original Blender project's own pronation/supination caveat) — flag if
 * they look wrong when actually posed.
 *
 * Shoulder has TWO DOFs sharing the same bone+axis (upper_arm's local X):
 * `flexExt` (UI-labelled "Scaption") and `sagittalFlexExt` (UI-labelled
 * "Extension · Flexion"). `flexExt` is the original DOF, left mechanically
 * untouched (still reduced by scapularReductionDeg, same as before — every
 * existing preset that dials shoulder.flexExt keeps producing exactly the
 * pose it always did). It's renamed to "Scaption" because, verified via
 * world-space hand-position deltas, it already reads as scapular-plane
 * elevation in practice (the scapula's own frontal-plane contribution
 * during arm raise, from the true scapulohumeral kinematic chain, blends
 * with it). `sagittalFlexExt` is new: a raw, uncoupled rotation on the
 * SAME axis (deliberately — the axis itself is verified pure sagittal-
 * plane, see above) with NO scapular reduction applied, so it's an
 * independent, un-coupled sagittal-plane flexion/extension control. Both
 * contribute ADDITIVELY to upper_arm's final X rotation (see applyArmPose's
 * `+=` accumulation) — dialing one doesn't reset or fight the other.
 */
export type DofSpec = { bone: string; axis: "x" | "y" | "z"; sign: 1 | -1 };
export type JointSpec = Record<string, DofSpec>;

export const ARM_JOINT_DOFS: Record<string, JointSpec> = {
  shoulder_left: {
    flexExt: { bone: "upper_armL", axis: "x", sign: -1 },
    sagittalFlexExt: { bone: "upper_armL", axis: "x", sign: -1 },
    abdAdd: { bone: "upper_armL", axis: "z", sign: -1 },
    rotation: { bone: "upper_armL", axis: "y", sign: -1 },
  },
  shoulder_right: {
    flexExt: { bone: "upper_armR", axis: "x", sign: -1 },
    sagittalFlexExt: { bone: "upper_armR", axis: "x", sign: -1 },
    abdAdd: { bone: "upper_armR", axis: "z", sign: 1 },
    rotation: { bone: "upper_armR", axis: "y", sign: 1 },
  },
  elbow_left: {
    flexExt: { bone: "forearmL", axis: "x", sign: -1 },
  },
  elbow_right: {
    flexExt: { bone: "forearmR", axis: "x", sign: -1 },
  },
  // Pronation/supination is a FOREARM movement (the radius rotating over the
  // ulna), not a wrist movement — it used to live on wrist's DOFs, rotating
  // the HAND bone's own local Y. That's wrong on two counts: (1) it's not
  // anatomically a wrist motion, and (2) mechanically it left the forearm
  // bone's own rotation untouched, so any soft-tissue mesh weighted to BOTH
  // forearm and hand near the wrist crease got torn apart at extreme angles
  // (confirmed live: forearmR's quaternion was byte-identical whether
  // supination was 0° or 80°, and the muscle mesh visibly degraded at 80°).
  // Fix: apply it to the forearm bone's own local Y axis (its long axis, by
  // this rig's own head->tail construction convention — see file header)
  // instead. Since hand is a direct child of forearm, the hand (and
  // fingers) inherit this rotation automatically through the scene graph —
  // no separate wrist-side code needed for "child segments follow".
  forearm_left: {
    pronSup: { bone: "forearmL", axis: "y", sign: -1 }, // not concretely spot-checked
  },
  forearm_right: {
    pronSup: { bone: "forearmR", axis: "y", sign: 1 }, // not concretely spot-checked
  },
  wrist_left: {
    flexExt: { bone: "handL", axis: "x", sign: -1 },
    radUlnar: { bone: "handL", axis: "z", sign: -1 },
  },
  wrist_right: {
    flexExt: { bone: "handR", axis: "x", sign: -1 },
    radUlnar: { bone: "handR", axis: "z", sign: 1 },
  },
};

// Clinical ROM limits (AAOS-style, matching the v1 app's rom.ts values for
// the same joints) — used to clamp slider input and label DOFs in the UI.
export const ARM_DOF_META: Record<
  string,
  Record<string, { label: string; positive: string; negative: string; min: number; max: number }>
> = {
  shoulder_left: {
    flexExt: { label: "Scaption", positive: "Scaption (elevation)", negative: "Extension", min: -60, max: 180 },
    sagittalFlexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -60, max: 180 },
    abdAdd: { label: "Adduction · Abduction", positive: "Abduction", negative: "Adduction", min: -40, max: 180 },
    rotation: { label: "Internal · External rotation", positive: "External rotation", negative: "Internal rotation", min: -70, max: 90 },
  },
  elbow_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -5, max: 145 },
  },
  forearm_left: {
    // AAOS 0° = neutral (thumb-up/handshake position), matching every other
    // DOF's convention here — supination (palm up) positive, pronation
    // (palm down) negative.
    pronSup: { label: "Pronation · Supination", positive: "Supination", negative: "Pronation", min: -80, max: 85 },
  },
  wrist_left: {
    flexExt: { label: "Extension · Flexion", positive: "Flexion", negative: "Extension", min: -70, max: 80 },
    radUlnar: { label: "Radial · Ulnar deviation", positive: "Ulnar deviation", negative: "Radial deviation", min: -20, max: 30 },
  },
};
ARM_DOF_META.shoulder_right = ARM_DOF_META.shoulder_left;
ARM_DOF_META.elbow_right = ARM_DOF_META.elbow_left;
ARM_DOF_META.forearm_right = ARM_DOF_META.forearm_left;
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
 *
 * TRUE scapulohumeral chain: `upper_arm.L/R`'s bone is now a real child of
 * `scapula.L/R` (reparented in Blender, rest position verified to match
 * the old thoracic-parented arm exactly first). That means the scapula's
 * own rotation (applied separately by applyScapularRhythm) ADDS to
 * whatever the humerus does here — so for the total arm elevation to
 * still equal the user's dialled clinical angle, the shoulder's OWN
 * abdAdd/flexExt must be reduced by the scapula's share before being
 * applied. See scapularRhythm.ts for the shared formula both this
 * function and the scapula's own rotation are built from.
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
    const isShoulder = jointId.startsWith("shoulder_");
    for (const [dofId, spec] of Object.entries(dofs)) {
      let degrees = angleMap[dofId] ?? 0;
      if (isShoulder && (dofId === "abdAdd" || dofId === "flexExt")) {
        degrees -= scapularReductionDeg(dofId, degrees);
      }
      const euler = eulerByBone.get(spec.bone) ?? [0, 0, 0];
      // += (not =): shoulder's flexExt and sagittalFlexExt both target the
      // same bone+axis (upper_arm's local X) and must combine additively —
      // every other DOF here still only ever writes its axis once, so this
      // is a no-op change for them (starting from 0).
      euler[AXIS_INDEX[spec.axis]] += THREE.MathUtils.degToRad(degrees * spec.sign);
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
