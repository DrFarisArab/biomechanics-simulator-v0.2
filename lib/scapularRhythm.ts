import * as THREE from "three";

/**
 * Scapulohumeral rhythm — TRUE kinematic chain (upgraded from the earlier
 * visual-only version). `scapula.L/R` is now a real parent of
 * `upper_arm.L/R` in the rig (reparented in Blender, rest position
 * verified to match the old standalone-thoracic-parented arm exactly
 * before trusting it). That means whatever rotation the scapula bone
 * gets is ADDED to whatever the humerus bone gets, as seen by the hand —
 * so for the total arm elevation to still equal the user's dialled
 * clinical angle, the humerus's OWN share must be the REMAINDER after the
 * scapula's share, not the full angle. `applyArmPose` (armDofs.ts) calls
 * `scapularContributionDeg` to compute exactly what to subtract before
 * applying the shoulder's own abdAdd/flexExt — the two functions must
 * stay in sync, which is why the shared math lives here as the single
 * source of truth for both.
 *
 * Same ST_FRACTION/ST_SET_POINT formula the v1 app used for its own
 * scapulothoracic coupling.
 */
const ST_FRACTION = 1 / 3;
const ST_SET_POINT = 25; // degrees of abduction/flexion before scapula starts moving
const ST_FLEX_SHARE = 0.4; // flexion contributes less upward rotation than abduction

/** Scapular share of ONE elevation direction (abduction OR flexion), degrees. */
export function scapUpwardDeg(elevationDeg: number): number {
  const past = Math.max(0, elevationDeg - ST_SET_POINT);
  return past * ST_FRACTION;
}

/** Combined scapular upward-rotation contribution (unsigned magnitude) for
 * a given shoulder's current abdAdd/flexExt — used to rotate the scapula
 * bone itself (both directions summed into one frontal-plane rotation,
 * same as real scapular upward rotation is a single DOF regardless of
 * which movement drove it). */
export function scapularContributionDeg(abdAddDeg: number, flexExtDeg: number): number {
  const abd = Math.max(0, abdAddDeg);
  const flex = Math.max(0, flexExtDeg);
  return scapUpwardDeg(abd) + scapUpwardDeg(flex) * ST_FLEX_SHARE;
}

/** Per-DOF reduction (degrees) to subtract from the shoulder's OWN
 * abdAdd/flexExt before driving the humerus — this is what makes
 * scapula-share + humerus-share sum back to the user's dialled angle,
 * now that upper_arm is a real child of scapula. Each DOF is reduced by
 * its OWN component only (matching the scapula's combined rotation being
 * built from these same two separate terms). */
export function scapularReductionDeg(dofId: "abdAdd" | "flexExt", degrees: number): number {
  const magnitude = Math.max(0, degrees);
  if (dofId === "abdAdd") return scapUpwardDeg(magnitude);
  return scapUpwardDeg(magnitude) * ST_FLEX_SHARE;
}

export function applyScapularRhythm(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  angles: Record<string, Record<string, number> | undefined>
) {
  for (const side of ["left", "right"] as const) {
    const boneName = side === "left" ? "scapulaL" : "scapulaR";
    const bone = bones[boneName];
    const rest = restQuats[boneName];
    if (!bone || !rest) continue;

    const shoulder = angles[`shoulder_${side}`];
    const upwardDeg = scapularContributionDeg(shoulder?.abdAdd ?? 0, shoulder?.flexExt ?? 0);
    // frontal-plane axis (z), sign mirrored L/R same as every other paired
    // frontal DOF in this rig (left=-1, right=+1) — same sign convention
    // as shoulder_*.abdAdd, since scapula and upper_arm share the same
    // Gram-Schmidt construction and therefore the same local-Z meaning.
    const sign = side === "left" ? -1 : 1;
    const delta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, THREE.MathUtils.degToRad(upwardDeg * sign), "XYZ")
    );
    bone.quaternion.copy(rest).multiply(delta);
  }
}
