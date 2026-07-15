import * as THREE from "three";

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
 * pose the bones found via `scene.getObjectByName("forearmR")` (whichever
 * copy the loader's depth-first traversal hits first) — every OTHER
 * SkinnedMesh whose own `skeleton.bones` array holds the "_1"/"_2" DUPLICATE
 * Object3D instances never moves, because posing "forearmR" does nothing to
 * a completely separate "forearmR_1" object.
 *
 * Fix: after cloning, walk every SkinnedMesh and replace any duplicate bone
 * reference in its own `skeleton.bones` array with the single canonical
 * (un-suffixed) bone object from the same scene. `boneInverses` are left
 * untouched — every duplicate is a copy of the same original bone with the
 * same bind-pose rest transform, so the existing inverse bind matrices stay
 * numerically valid for the canonical bone.
 */
export function unifyDuplicateSkeletons(scene: THREE.Object3D, canonicalNames: string[]): void {
  const canonicalSet = new Set(canonicalNames);
  const canonicalBones: Record<string, THREE.Bone> = {};
  for (const name of canonicalNames) {
    const obj = scene.getObjectByName(name);
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
