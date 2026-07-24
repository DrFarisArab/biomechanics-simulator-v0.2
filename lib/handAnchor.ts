import * as THREE from "three";
import { ANCHOR_BONE_CANDIDATES, DEFAULT_HAND_SCALE, type ContactKind, type HandContact } from "./handContacts";

// Converting between a hand's free WORLD transform (how the placement editor
// manipulates it) and a bone-anchored HandContact (how it's stored/shipped).

const _bonePos = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _boneQuat = new THREE.Quaternion();
const _boneScale = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _euler = new THREE.Euler();

function getBodyScene(): THREE.Object3D | null {
  return (window as unknown as { __bodyScene?: THREE.Object3D }).__bodyScene ?? null;
}

/** Nearest candidate bone (by world-space distance) to a world point. */
export function nearestBone(worldPos: THREE.Vector3): THREE.Object3D | null {
  const scene = getBodyScene();
  if (!scene) return null;
  let best: THREE.Object3D | null = null;
  let bestD = Infinity;
  for (const name of ANCHOR_BONE_CANDIDATES) {
    const bone = scene.getObjectByName(name);
    if (!bone) continue;
    bone.getWorldPosition(_bonePos);
    const d = _bonePos.distanceToSquared(worldPos);
    if (d < bestD) {
      bestD = d;
      best = bone;
    }
  }
  return best;
}

/**
 * Convert a hand's world transform into a bone-anchored HandContact, binding
 * to the nearest candidate bone. Offset/euler are expressed in that bone's
 * local frame so the stored contact renders identically to what was placed.
 */
export function worldToContact(
  worldPos: THREE.Vector3,
  worldEuler: THREE.Euler,
  scale: number,
  side: "left" | "right",
  kind: ContactKind = "hand"
): HandContact | null {
  const bone = nearestBone(worldPos);
  if (!bone) return null;

  bone.updateWorldMatrix(true, false);
  bone.matrixWorld.decompose(_bonePos, _boneQuat, _boneScale);

  // Local offset = boneWorld^-1 applied to the world point.
  const invMat = _mat.copy(bone.matrixWorld).invert();
  _p.copy(worldPos).applyMatrix4(invMat);

  // Local rotation = boneWorldQuat^-1 * worldQuat.
  _q.setFromEuler(worldEuler);
  const localQuat = _boneQuat.clone().invert().multiply(_q);
  _euler.setFromQuaternion(localQuat, "XYZ");

  return {
    kind,
    bone: bone.name,
    side,
    offset: [round(_p.x), round(_p.y), round(_p.z)],
    euler: [round(_euler.x), round(_euler.y), round(_euler.z)],
    scale: round(scale),
  };
}

/**
 * Inverse: a stored bone-anchored contact's current WORLD transform, used to
 * seed the editor's draft when re-opening an existing placement.
 */
export function contactToWorld(
  contact: HandContact
): { pos: [number, number, number]; euler: [number, number, number]; scale: number } | null {
  const scene = getBodyScene();
  const bone = scene?.getObjectByName(contact.bone);
  if (!bone) return null;

  bone.updateWorldMatrix(true, false);
  const local = _mat.identity();
  local.compose(
    new THREE.Vector3(...contact.offset),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...contact.euler, "XYZ")),
    new THREE.Vector3(1, 1, 1)
  );
  const world = local.premultiply(bone.matrixWorld);
  world.decompose(_p, _q, _boneScale);
  _euler.setFromQuaternion(_q, "XYZ");
  return {
    pos: [round(_p.x), round(_p.y), round(_p.z)],
    euler: [round(_euler.x), round(_euler.y), round(_euler.z)],
    scale: contact.scale ?? DEFAULT_HAND_SCALE,
  };
}

function round(n: number) {
  return Math.round(n * 1e5) / 1e5;
}
