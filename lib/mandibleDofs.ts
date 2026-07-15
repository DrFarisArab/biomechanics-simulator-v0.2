import * as THREE from "three";

/**
 * TMJ / mandible — the one joint in this rig that genuinely breaks the
 * "pure rotation about a fixed pivot" assumption every other apply*Pose
 * function relies on. Mouth opening is BIPHASIC (rotation first, then the
 * pivot itself translates forward-down along the articular eminence), and
 * lateral excursion is ASYMMETRIC (the working-side condyle rotates near
 * its own position while the balancing-side condyle glides forward-
 * medial) — see tmj-biomechanics-brief.md for the full clinical rationale
 * this was built from.
 *
 * Architecturally this is the "shared rigid body" pattern the pelvis
 * already uses (one control, `angles.mandible`, resolved procedurally) —
 * NOT a per-DOF DofSpec table like every other joint, because the
 * biphasic/asymmetric math genuinely isn't a fixed axis+sign rotation.
 * `applyMandiblePose` below is the bespoke resolver, in the same spirit as
 * stanceMode.ts's stance-leg pivot correction (also a single control
 * resolved via the "offset = P − R·P" trick used here for lateral
 * excursion).
 *
 * DISCLOSED, NOT YET LIVE-VERIFIED: the `jaw` bone (parented to `head`) is
 * brand new — added to v2_body_rig specifically for this feature — and
 * this file was written before an updated GLB existed to test against.
 * Axis choices below follow this rig's own consistent conventions
 * elsewhere (hinge/flex DOFs on local X — hip/knee/elbow/wrist/ankle/spine
 * all do this; rotation/swivel DOFs on local Y — hip rotation, forearm
 * pronSup, spine rotation, pelvis rotation all do this), so they're a
 * principled starting point, not a blind guess — but per this rig's own
 * standard practice (see legDofs.ts/armDofs.ts's doc comments on
 * "not concretely spot-checked" DOFs), they still need a live pass against
 * the actual loaded bone once available, the same way every other joint's
 * signs were confirmed empirically rather than assumed.
 */

export const MANDIBLE_BONE_NAMES = ["jaw"];

// Same "just the DOF ids" contract every other *_JOINT_DOFS table
// satisfies for store.ts's neutralAngles() (Object.keys() is all that's
// read) — there's no declarative axis/sign spec here because pose
// application is bespoke (see applyMandiblePose below), not table-driven.
export const MANDIBLE_JOINT_DOFS: Record<string, Record<string, true>> = {
  mandible: { depression: true, protrusion: true, lateralExcursion: true },
};

export const MANDIBLE_DOF_META: Record<
  string,
  Record<string, { label: string; positive: string; negative: string; min: number; max: number }>
> = {
  mandible: {
    depression: {
      label: "Elevation · Depression (mouth open/close)",
      positive: "Depression (open)",
      negative: "Elevation (close)",
      min: 0,
      max: 50,
    },
    protrusion: {
      label: "Retrusion · Protrusion",
      positive: "Protrusion",
      negative: "Retrusion",
      min: -3,
      max: 10,
    },
    lateralExcursion: {
      label: "Left · Right excursion",
      positive: "Right excursion",
      negative: "Left excursion",
      min: -12,
      max: 12,
    },
  },
};

const D2R = THREE.MathUtils.degToRad;

// Biphasic mouth-opening constants (brief §3/§5) — a demo-grade
// approximation, same disclosed-approximation spirit as every other
// coupling/curve in this codebase (see lumbopelvicRhythm.ts's "setting
// phase" constants):
//  - Phase 1 (rotation-only), 0-20mm: pure hinge rotation up to ~13°
//    (brief: "first ~11-13° / ~0-20mm").
//  - Phase 2 (rotation+translation), 20-50mm: rotation keeps climbing at a
//    slower secondary rate while the pivot itself glides forward-down —
//    a HANDOFF between mechanisms, not a linear blend of both from t=0.
const ROTATION_ONLY_THRESHOLD_MM = 20;
const MAX_DEPRESSION_MM = 50;
const PHASE1_MAX_ROTATION_DEG = 13;
const PHASE2_EXTRA_ROTATION_DEG = 12; // additional rotation reached by full 50mm opening
const PHASE2_MAX_FORWARD_M = 0.012; // condyle's own forward glide along the eminence, not chin drop
const PHASE2_MAX_DOWN_M = 0.006;

const MAX_LATERAL_MM = 12;
const MAX_LATERAL_DEG = 11; // reached at full 12mm excursion

// Condyle offset FROM the jaw bone's own rest origin, in the bone's own
// local space — used only for the lateral-excursion pivot (brief §6):
// rotating about a point offset toward the working (ipsilateral) side,
// instead of the bone's own center, is what makes that side "rotate in
// place" while the other side swings through an arc — same closed-form
// trick as stanceMode.ts's pelvis pivot. Magnitude (~50mm) measured in
// Blender from the actual condyle apex vertices; which local axis is
// "left-right" is this rig's X-for-left-right convention, not yet
// confirmed against the live bone (see file header).
// Exported so BodyModel.tsx's condyle markers sit at the exact same
// offset the lateral-excursion pivot math above uses — one source of
// truth for "where the condyle is relative to the jaw bone's origin."
export const CONDYLE_OFFSET_LOCAL = new THREE.Vector3(0.05, 0, 0);

/**
 * Resolves the single `angles.mandible` control into the jaw bone's rest+
 * delta quaternion AND a position offset — every other apply*Pose function
 * only needs the quaternion because every other joint rotates about a
 * fixed pivot; this one needs both (see file header — the whole point of
 * this joint).
 */
export function applyMandiblePose(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  restPositions: Record<string, THREE.Vector3 | undefined>,
  angles: Record<string, Record<string, number> | undefined>
) {
  const jaw = bones.jaw;
  const restQuat = restQuats.jaw;
  const restPos = restPositions.jaw;
  if (!jaw || !restQuat || !restPos) return;

  const mandible = angles.mandible;
  const depressionMm = THREE.MathUtils.clamp(mandible?.depression ?? 0, 0, MAX_DEPRESSION_MM);
  const protrusionMm = THREE.MathUtils.clamp(mandible?.protrusion ?? 0, -3, 10);
  const lateralMm = THREE.MathUtils.clamp(mandible?.lateralExcursion ?? 0, -MAX_LATERAL_MM, MAX_LATERAL_MM);

  // --- Depression/elevation: biphasic rotation + translation ---
  const phase1Frac = Math.min(1, depressionMm / ROTATION_ONLY_THRESHOLD_MM);
  const pastThreshold = Math.max(0, depressionMm - ROTATION_ONLY_THRESHOLD_MM);
  const phase2Span = MAX_DEPRESSION_MM - ROTATION_ONLY_THRESHOLD_MM;
  const phase2Frac = phase2Span > 0 ? Math.min(1, pastThreshold / phase2Span) : 0;

  const hingeDeg = phase1Frac * PHASE1_MAX_ROTATION_DEG + phase2Frac * PHASE2_EXTRA_ROTATION_DEG;

  // Curved (not straight-line) eminence path: down-dominant right at the
  // threshold, increasingly forward-dominant toward full opening — two
  // different ease exponents on the same 0-1 progress produce a genuine
  // curve rather than a uniformly-scaled straight line (brief §4).
  const forwardM = PHASE2_MAX_FORWARD_M * Math.pow(phase2Frac, 1.5);
  const downM = PHASE2_MAX_DOWN_M * Math.pow(phase2Frac, 0.7);

  // --- Protrusion/retrusion: bilateral symmetric translation ---
  const protrusionM = protrusionMm * 0.001;

  // --- Lateral excursion: asymmetric pivot rotation ---
  const lateralRad = D2R((lateralMm / MAX_LATERAL_MM) * MAX_LATERAL_DEG);
  const pivot = lateralMm >= 0 ? CONDYLE_OFFSET_LOCAL : CONDYLE_OFFSET_LOCAL.clone().negate();
  const lateralDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, lateralRad, 0, "XYZ"));
  const rotatedPivot = pivot.clone().applyQuaternion(lateralDelta);
  const lateralPivotCorrection = pivot.clone().sub(rotatedPivot);

  // --- Compose rotation: hinge (local X) then lateral swivel (local Y) ---
  const hingeDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(D2R(hingeDeg), 0, 0, "XYZ"));
  const delta = hingeDelta.multiply(lateralDelta);
  jaw.quaternion.copy(restQuat).multiply(delta);

  // --- Compose position: rest + depression's phase-2 glide + protrusion + lateral pivot correction ---
  jaw.position.copy(restPos);
  jaw.position.z -= downM;
  jaw.position.y -= forwardM + protrusionM;
  jaw.position.add(lateralPivotCorrection);
}
