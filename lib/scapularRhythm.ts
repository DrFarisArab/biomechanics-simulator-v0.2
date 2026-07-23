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

// Scaption-specific scapulohumeral rhythm (clinical spec): below 30° of
// elevation the motion is essentially all glenohumeral; above 30° a 2:1
// GH:scapular ratio applies — for every 3° of total elevation, ~2° is GH
// and ~1° is scapular upward rotation, i.e. the scapula takes 1/3 of the
// elevation past the 30° set point. Kept as its own constants (not the
// generic abduction ST_SET_POINT=25 above) so "Scaption outward" follows
// the exact ratio the clinician specified without changing legacy abd/flex.
const SCAPTION_ST_SET_POINT = 30;
const SCAPTION_ST_FRACTION = 1 / 3;

/** Scapular share of ONE elevation direction (abduction OR flexion), degrees. */
export function scapUpwardDeg(elevationDeg: number): number {
  const past = Math.max(0, elevationDeg - ST_SET_POINT);
  return past * ST_FRACTION;
}

/** Scapular upward-rotation share of a scaption-outward elevation, degrees
 * (2:1 GH:scapular above a 30° set point — see constants above). */
export function scaptionScapularDeg(elevationDeg: number): number {
  const past = Math.max(0, elevationDeg - SCAPTION_ST_SET_POINT);
  return past * SCAPTION_ST_FRACTION;
}

/** Combined scapular upward-rotation contribution (unsigned magnitude) for
 * a given shoulder's current abdAdd/flexExt — used to rotate the scapula
 * bone itself (both directions summed into one frontal-plane rotation,
 * same as real scapular upward rotation is a single DOF regardless of
 * which movement drove it). */
export function scapularContributionDeg(abdAddDeg: number, flexExtDeg: number, scaptionOutDeg = 0): number {
  const abd = Math.max(0, abdAddDeg);
  const flex = Math.max(0, flexExtDeg);
  return scapUpwardDeg(abd) + scapUpwardDeg(flex) * ST_FLEX_SHARE + scaptionScapularDeg(scaptionOutDeg);
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

// Sign of the protraction swing per side, about the body's vertical axis, so
// that a POSITIVE `scapula.protRet` draws BOTH glenoids forward around the
// rib cage (protraction) and a negative value draws them back (retraction).
// Verified live against the loaded rig — flip a value here if a side swings
// the wrong way.
const PROTRACTION_SIGN = { left: -1, right: 1 } as const;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_FORWARD = new THREE.Vector3(0, 0, 1);
const _parentQuat = new THREE.Quaternion();
const _parentQuatInv = new THREE.Quaternion();
const _swing = new THREE.Quaternion();
const _swingLocal = new THREE.Quaternion();
const _glide = new THREE.Vector3();
const _clavicleDelta = new THREE.Quaternion();
const _clavicleOffset = new THREE.Vector3();
const _clavicleMovedLateral = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _parentWorldQuatInv = new THREE.Quaternion();
const _worldAnchor = new THREE.Vector3();
const _worldLateral = new THREE.Vector3();
const _worldAxis = new THREE.Vector3();

export type ScapularCouplingRef = {
  object: THREE.Object3D;
  restPosition: THREE.Vector3;
  restQuaternion: THREE.Quaternion;
  restScale: THREE.Vector3;
  anchor: THREE.Vector3;
  lateral: THREE.Vector3;
  rotationAxis: THREE.Vector3;
};

export type ScapularCouplingRefs = { left?: ScapularCouplingRef; right?: ScapularCouplingRef };

/** Capture the static clavicle meshes used by the atlas export. They are not
 * armature joints, so the shoulder-girdle motion must pose them explicitly.
 * The medial endpoint is anchored to the manubrium; the opposite endpoint is
 * used to carry the scapula during elevation/depression. */
export function captureScapularCouplingRefs(scene: THREE.Object3D): ScapularCouplingRefs {
  scene.updateMatrixWorld(true);
  const manubrium = scene.getObjectByName("Manubrium of sternum");
  if (!manubrium) return {};
  const sternumBox = new THREE.Box3().setFromObject(manubrium);
  const sternumCenter = sternumBox.getCenter(new THREE.Vector3());
  const refs: ScapularCouplingRefs = {};

  for (const side of ["left", "right"] as const) {
    const object = scene.getObjectByName(side === "left" ? "Clavicle.l" : "Clavicle.r");
    if (!object) continue;
    const box = new THREE.Box3().setFromObject(object);
    const medialX = side === "left" ? box.min.x : box.max.x;
    const lateralX = side === "left" ? box.max.x : box.min.x;
    _worldAnchor.set(
      medialX,
      THREE.MathUtils.clamp(sternumCenter.y, box.min.y, box.max.y),
      THREE.MathUtils.clamp(sternumCenter.z, box.min.z, box.max.z)
    );
    _worldLateral.set(lateralX, _worldAnchor.y, _worldAnchor.z);
    const parent = object.parent ?? scene;
    parent.updateWorldMatrix(true, false);
    parent.getWorldQuaternion(_parentWorldQuat);
    _parentWorldQuatInv.copy(_parentWorldQuat).invert();
    const anchor = parent.worldToLocal(_worldAnchor.clone());
    const lateral = parent.worldToLocal(_worldLateral.clone());
    _worldAxis.copy(WORLD_FORWARD).applyQuaternion(_parentWorldQuatInv).normalize();
    refs[side] = {
      object,
      restPosition: object.position.clone(),
      restQuaternion: object.quaternion.clone(),
      restScale: object.scale.clone(),
      anchor,
      lateral,
      rotationAxis: _worldAxis.clone(),
    };
  }
  return refs;
}

function applyClavicleCoupling(ref: ScapularCouplingRef, elevationCm: number) {
  ref.object.position.copy(ref.restPosition);
  ref.object.quaternion.copy(ref.restQuaternion);
  ref.object.scale.copy(ref.restScale);
  if (!elevationCm) return;

  const length = Math.max(0.001, ref.anchor.distanceTo(ref.lateral));
  const angle = Math.atan2(elevationCm / 100, length);
  const sideSign = ref.lateral.x > ref.anchor.x ? 1 : -1;
  _clavicleDelta.setFromAxisAngle(ref.rotationAxis, angle * sideSign);
  _clavicleOffset.copy(ref.restPosition).sub(ref.anchor).applyQuaternion(_clavicleDelta);
  ref.object.position.copy(ref.anchor).add(_clavicleOffset);
  ref.object.quaternion.copy(_clavicleDelta).multiply(ref.restQuaternion);
}

/**
 * Drives the scapula bones. Two independent contributions are composed:
 *
 *  1. Scapulohumeral rhythm — the scapula's automatic upward rotation that
 *     tracks the shoulder's own abduction/flexion/scaption (unchanged; this
 *     is what every normal shoulder pose relies on).
 *  2. An OPTIONAL explicit scapular pose (`angles.scapula`), used by the
 *     closed-chain scapular movements (gravityMovements.ts). Present only
 *     while one of those movements is dialled in, so ordinary posing is
 *     completely unaffected — the block is skipped when the key is absent.
 *
 * Upward/downward rotation reuses the SAME frontal-plane (local-Z) mechanism
 * as the rhythm, so the two just add. Protraction/retraction and elevation/
 * depression have no local-axis equivalent (the scapula bone's rest frame is
 * heavily tilted, so its local axes don't line up with the body planes), so
 * they're expressed in the body/world frame and converted into the bone's
 * parent space — a rotation about world-up for the horizontal swing, and a
 * superior/inferior translation for the glide.
 */
export function applyScapularRhythm(
  bones: Record<string, THREE.Object3D | undefined>,
  restQuats: Record<string, THREE.Quaternion | undefined>,
  angles: Record<string, Record<string, number> | undefined>,
  scapulaRestPositions?: { left?: THREE.Vector3; right?: THREE.Vector3 },
  couplingRefs?: ScapularCouplingRefs
) {
  const scap = angles.scapula;
  for (const side of ["left", "right"] as const) {
    const boneName = side === "left" ? "scapulaL" : "scapulaR";
    const bone = bones[boneName];
    const rest = restQuats[boneName];
    if (!bone || !rest) continue;

    const shoulder = angles[`shoulder_${side}`];
    let upwardDeg = scapularContributionDeg(
      shoulder?.abdAdd ?? 0,
      shoulder?.flexExt ?? 0,
      shoulder?.scaption_out ?? 0
    );
    // Explicit upward (+) / downward (−) rotation rides the same axis.
    if (scap) upwardDeg += scap.upDownRot ?? 0;

    // frontal-plane axis (z), sign mirrored L/R same as every other paired
    // frontal DOF in this rig (left=-1, right=+1) — same sign convention
    // as shoulder_*.abdAdd, since scapula and upper_arm share the same
    // Gram-Schmidt construction and therefore the same local-Z meaning.
    const sign = side === "left" ? -1 : 1;
    const delta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, THREE.MathUtils.degToRad(upwardDeg * sign), "XYZ")
    );
    bone.quaternion.copy(rest).multiply(delta);

    const restPos = side === "left" ? scapulaRestPositions?.left : scapulaRestPositions?.right;
    if (restPos) bone.position.copy(restPos);

    const protRet = scap?.protRet ?? 0;
    const elevDep = scap?.elevDep ?? 0;
    const coupling = couplingRefs?.[side];
    if (coupling) applyClavicleCoupling(coupling, elevDep);
    if (!protRet && !elevDep) continue;

    // Both the horizontal swing and the vertical glide are defined in the
    // body/world frame, so convert through the parent's world orientation.
    const parent = bone.parent;
    if (parent) {
      parent.updateWorldMatrix(true, false);
      parent.getWorldQuaternion(_parentQuat);
    } else {
      _parentQuat.identity();
    }
    _parentQuatInv.copy(_parentQuat).invert();

    if (protRet) {
      // World-up rotation, conjugated into parent space, then pre-multiplied
      // onto the bone's current (rhythm+rotation) local quaternion.
      _swing.setFromAxisAngle(
        WORLD_UP,
        THREE.MathUtils.degToRad(protRet * PROTRACTION_SIGN[side])
      );
      _swingLocal.copy(_parentQuatInv).multiply(_swing).multiply(_parentQuat);
      bone.quaternion.premultiply(_swingLocal);
    }

    if (elevDep && restPos) {
      // Carry the scapula from the clavicle's lateral endpoint. This keeps
      // the shoulder girdle coupled to the sternoclavicular anchor instead
      // of translating the scapula independently through the clavicle.
      if (coupling) {
        _clavicleMovedLateral.copy(coupling.lateral).sub(coupling.anchor).applyQuaternion(_clavicleDelta).add(coupling.anchor);
        _glide.copy(_clavicleMovedLateral).sub(coupling.lateral).applyQuaternion(_parentQuatInv);
      } else {
        _glide.copy(WORLD_UP).multiplyScalar(elevDep / 100).applyQuaternion(_parentQuatInv);
      }
      bone.position.copy(restPos).add(_glide);
    }
  }
}
