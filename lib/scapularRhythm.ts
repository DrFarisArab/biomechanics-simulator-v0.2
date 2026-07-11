import * as THREE from "three";

/**
 * Scapulohumeral rhythm — VISUAL coupling only, disclosed simplification.
 *
 * `upper_arm.L/R` are parented directly to `thoracic` (not to the scapula),
 * so this does NOT reduce the glenohumeral joint's own rotation the way
 * the v1 app's true kinematic chain did (there, scapula was a real parent
 * of the humerus, so the derived scapular share and the remaining humeral
 * share summed to the user's dialled angle by construction). Restructuring
 * the parent chain to make that true again was judged too risky this late
 * in a very large session — re-verifying the whole arm chain's rest
 * position against a new parent is real work, not a quick edit.
 *
 * What this DOES do: rotates the scapula/clavicle bone by a fraction of
 * the shoulder's current abduction+flexion, purely for visual realism (the
 * shoulder blade visibly elevates/rotates as the arm lifts) — same
 * ST_FRACTION-style formula the v1 app used, reapplied here as a pure
 * derived-from-angles function, not a stored DOF.
 */
const ST_FRACTION = 1 / 3;
const ST_SET_POINT = 25; // degrees of abduction/flexion before scapula starts moving

function scapUpwardDeg(elevationDeg: number): number {
  const past = Math.max(0, elevationDeg - ST_SET_POINT);
  return past * ST_FRACTION;
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
    const abd = Math.max(0, shoulder?.abdAdd ?? 0);
    const flex = Math.max(0, shoulder?.flexExt ?? 0);
    const upwardDeg = scapUpwardDeg(abd) + scapUpwardDeg(flex) * 0.4;
    // frontal-plane axis (z), sign mirrored L/R same as every other paired
    // frontal DOF in this rig (left=-1, right=+1)
    const sign = side === "left" ? -1 : 1;
    const delta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, THREE.MathUtils.degToRad(upwardDeg * sign), "XYZ")
    );
    bone.quaternion.copy(rest).multiply(delta);
  }
}
