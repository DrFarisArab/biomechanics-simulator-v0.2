import * as THREE from "three";

/**
 * This export's Scene root has multiple sibling armatures: the real
 * "v2_body_rig" (what every mesh actually deforms with — see the
 * Blender-side "all armature targets used by any mesh" check) and at
 * least one leftover, unused armature ("v2_arm_rig") that still got swept
 * into the "Skeletal system" collection despite no mesh depending on it.
 * The leftover's bones share NAMES with v2_body_rig's (its own
 * "upper_armR", etc.) but not hierarchy — e.g. its "upper_armR" is
 * parented directly to the armature root, not to "scapulaR" the way the
 * real one is. A plain, unscoped `scene.getObjectByName("upper_armR")`
 * can resolve to THIS decoy instead of the real bone, purely depending on
 * which armature the loader happened to traverse first — silently posing
 * (or rebinding) nothing anatomically connected. Every bone lookup in
 * this app needs to be scoped to descend only from the real "v2_body_rig"
 * to rule this out.
 */
export function findBodyRigRoot(scene: THREE.Object3D): THREE.Object3D | null {
  return scene.getObjectByName("v2_body_rig") ?? null;
}

/**
 * Even WITHIN the real "v2_body_rig", some bones ALSO collide by name with
 * a bone in one of the other leftover armatures (e.g. a "v2_trunk_rig"
 * apparently also has something named "pelvis") — the exporter's own
 * disambiguation then suffixes v2_body_rig's OWN bone too (its real
 * "upper_armR" comes out as "upper_armR_1", not the plain name), even
 * though it's still the single correct bone within this rig's subtree.
 * So a lookup scoped to v2_body_rig ALSO needs to be suffix-tolerant:
 * exact name first, then fall back to `${name}_<digits>`.
 */
export function findBoneInRig(root: THREE.Object3D, canonicalName: string): THREE.Object3D | undefined {
  const exact = root.getObjectByName(canonicalName);
  if (exact) return exact;
  let found: THREE.Object3D | undefined;
  root.traverse((obj) => {
    if (found) return;
    if (obj.name.replace(/_\d+$/, "") === canonicalName) found = obj;
  });
  return found;
}

/**
 * Blender's glTF exporter splits a single armature into MULTIPLE `skins`
 * when exporting a very large, diverse set of meshes bound to it (this rig
 * has 700+ individual anatomy meshes) — each extra skin gets its own
 * DUPLICATE copy of the bone hierarchy, with names disambiguated by a
 * "_N" suffix (e.g. "forearmR" / "forearmR_1" / "forearmR_2"). The
 * original hand-built production files (single skin, no suffixes) didn't
 * hit this; a from-scratch re-export of the same large collection set did.
 *
 * This is invisible in the loaded scene graph's bone COUNT or names at a
 * glance, but it's a real correctness bug: BodyModel/SkinOverlay only ever
 * pose the ONE bone found via a name lookup — every OTHER SkinnedMesh
 * whose own `skeleton.bones` array holds a DUPLICATE Object3D instance
 * (from a different skin, or from a colliding leftover armature — see
 * findBodyRigRoot/findBoneInRig above) never moves, because posing the
 * canonical bone does nothing to a completely separate duplicate object.
 *
 * Fix: after cloning, walk every SkinnedMesh and replace any duplicate
 * bone reference in its own `skeleton.bones` array with the single
 * canonical bone object resolved from the real "v2_body_rig" subtree.
 * `boneInverses` are left untouched — every duplicate is a copy of the
 * same original bone with the same bind-pose rest transform, so the
 * existing inverse bind matrices stay numerically valid for the
 * canonical bone.
 */
export function unifyDuplicateSkeletons(scene: THREE.Object3D, canonicalNames: string[]): void {
  const root = findBodyRigRoot(scene) ?? scene;

  const canonicalSet = new Set(canonicalNames);
  const canonicalBones: Record<string, THREE.Bone> = {};
  for (const name of canonicalNames) {
    const obj = findBoneInRig(root, name);
    if (obj && (obj as THREE.Bone).isBone) canonicalBones[name] = obj as THREE.Bone;
  }

  function resolveCanonicalName(name: string): string | null {
    if (canonicalSet.has(name)) return name;
    const stripped = name.replace(/_\d+$/, "");
    if (stripped !== name && canonicalSet.has(stripped)) return stripped;
    return null;
  }

  scene.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const bones = mesh.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const canonicalName = resolveCanonicalName(bones[i].name);
      if (!canonicalName) continue;
      const canonicalBone = canonicalBones[canonicalName];
      if (canonicalBone && canonicalBone !== bones[i]) {
        bones[i] = canonicalBone;
      }
    }
  });
}
