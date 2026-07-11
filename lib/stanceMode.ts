import * as THREE from "three";

/**
 * Ground-contact single-limb stance — pelvic hiking pivots about the
 * PLANTED (stance) hip instead of the pelvis's own origin.
 *
 * Naive behavior (rotating the pelvis bone about its own origin) swings
 * BOTH hips in world space together, since both thigh bones are children
 * of pelvis — that would lift the "stance" foot off the ground too,
 * which is backwards. Real hiking keeps the stance foot planted and
 * raises/drops the OTHER hip.
 *
 * Fix (same closed-form trick the v1 app used): for a rotation R about the
 * pelvis's own local origin, the ADDITIONAL position offset that keeps a
 * given point P (the stance hip's rest-local offset from pelvis) exactly
 * fixed in world space is `offset = P − R·P`. Applied as the pelvis
 * bone's own position (on top of its rest position), this makes the
 * stance hip stay put while the pelvis visibly tilts/hikes around it —
 * the swing-side hip moves instead, matching real single-limb-stance
 * mechanics.
 *
 * `stanceLeg` is a plain store field ("none"|"left"|"right"), not derived
 * from anything — the user picks which leg is planted (matching v1's own
 * explicit stance selector UX).
 */
export type StanceLeg = "none" | "left" | "right";

export function computePelvisPivotOffset(
  stanceLeg: StanceLeg,
  restPelvisPos: THREE.Vector3,
  hipLocalOffsets: { left?: THREE.Vector3; right?: THREE.Vector3 },
  obliquityDeg: number
): THREE.Vector3 {
  if (stanceLeg === "none") return restPelvisPos.clone();
  const hipOffset = stanceLeg === "left" ? hipLocalOffsets.left : hipLocalOffsets.right;
  if (!hipOffset) return restPelvisPos.clone();

  // Same sign convention as pelvis.obliquity in trunkDofs.ts (sign=1, axis=z).
  const deltaQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0, THREE.MathUtils.degToRad(obliquityDeg), "XYZ")
  );
  const rotated = hipOffset.clone().applyQuaternion(deltaQuat);
  const pivotCorrection = hipOffset.clone().sub(rotated);
  return restPelvisPos.clone().add(pivotCorrection);
}
