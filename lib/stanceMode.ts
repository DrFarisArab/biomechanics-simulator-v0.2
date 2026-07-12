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

/**
 * Part 2 of 2 (see `computePelvisPivotOffset` above for part 1 — both are
 * needed together). Pinning the pivot keeps the stance hip's WORLD POSITION
 * fixed, but `thighL`/`thighR` are real children of `pelvis` in this rig's
 * actual bone hierarchy (unlike the v1 app's simplified FK tree, where hip
 * and pelvis are siblings composed via linear Euler summation) — so the
 * stance leg's WORLD ROTATION still inherits pelvis's obliquity delta
 * through normal parent/child quaternion composition, and the leg would
 * still visibly swing even with its hip point pinned. A first attempt at
 * porting v1's fix (adding a compensating value to the stance hip's own
 * abdAdd Euler DOF) was tried and empirically DISPROVEN — verified via
 * world-space bone coordinates: the stance-side shin/foot still moved
 * substantially (foot X shifted from -0.085 to -0.351 at just -10°
 * obliquity). That approach only cancels correctly when the child bone's
 * local rotation axis happens to be parallel to the parent's, which isn't
 * guaranteed by this rig's Gram-Schmidt-constructed bone axes.
 *
 * This is the exact, general fix instead: given `world = parent ∘ local`
 * quaternion composition, solving for the stance thigh's corrected LOCAL
 * quaternion that keeps its WORLD rotation equal to what it would be with
 * ZERO obliquity gives
 *   local_corrected = (pelvisDelta_full)⁻¹ · pelvisDelta_noObliquity · local_normal
 * i.e. a correction quaternion computed ENTIRELY from the pelvis's own two
 * delta eulers (full vs. obliquity-zeroed) — the pelvis's rest quaternion
 * cancels out algebraically, so this needs no knowledge of the thigh bone's
 * own rest orientation and makes no alignment assumption. Applied as
 * `thighBone.quaternion.premultiply(correction)` AFTER applyLegPose has set
 * the bone's normal local quaternion. Verified: with this fix, the stance
 * foot's world position returns to within rounding of its rest position at
 * -10° obliquity, and the whole leg (shin + foot, not just the hip point)
 * moves with it.
 */
export function stanceLegRotationCorrection(
  side: "left" | "right",
  stanceLeg: StanceLeg,
  effectiveTiltDeg: number,
  rotationDeg: number,
  obliquityDeg: number
): THREE.Quaternion {
  if (side !== stanceLeg) return new THREE.Quaternion();
  const D2R = THREE.MathUtils.degToRad;
  const deltaFull = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(D2R(effectiveTiltDeg), D2R(rotationDeg), D2R(obliquityDeg), "XYZ")
  );
  const deltaNoObliquity = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(D2R(effectiveTiltDeg), D2R(rotationDeg), 0, "XYZ")
  );
  return deltaFull.invert().multiply(deltaNoObliquity);
}
