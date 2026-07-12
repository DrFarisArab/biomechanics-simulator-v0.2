import * as THREE from "three";

const BONE_COLOR = new THREE.Color("#e8dcc4");
const MUSCLE_COLOR = new THREE.Color("#ad584c");
const TOOTH_COLOR = new THREE.Color("#f5f0e2");
const CARTILAGE_COLOR = new THREE.Color("#cfe0e6");
const TENDON_COLOR = new THREE.Color("#e5ddc8");

const TOOTH_MATERIAL_NAMES = new Set(["Teeth", "Teeth-roots", "Dentine"]);

/**
 * The atlas's exported materials carry NO usable color: every one has
 * `baseColorFactor` unset (defaults to white) AND `emissiveFactor: [1,1,1]`
 * (full white self-illumination, washing out all shading regardless of
 * lighting) — confirmed by reading the raw glTF JSON, not guessed. The
 * material NAMES ("Bone-5", "Abductor", "Flexion", "Cartilage"...) are the
 * atlas's own functional/movement-type labels, not color data, so there's
 * nothing to recover from the file — colors are assigned here instead,
 * purely by material name so the SAME function works for any model (arm,
 * trunk, bones-only, muscles-only, or combined).
 */
/**
 * TRUE root cause of the "renders solid black" bug (tendons, joint-cap
 * cartilage, cranial sutures) finally found — it was never geometry.
 * Blender's glTF export attaches KHR_materials_anisotropy/clearcoat/
 * specular/ior extensions per-material based on whatever the source
 * Principled BSDF sliders happened to hold (leftover/incidental non-zero
 * values in the atlas file, never meaningful — same story as the base
 * color being unusable). GLTFLoader responds to those extensions by
 * constructing a THREE.MeshPhysicalMaterial instead of a plain
 * MeshStandardMaterial. `isMeshStandardMaterial` reads true for BOTH
 * (MeshPhysicalMaterial extends it), so the old per-material loop below
 * never noticed the difference — but MeshPhysicalMaterial's extra
 * `anisotropy` term needs real per-vertex tangent data to shade correctly,
 * and these small hand-authored atlas meshes don't have any usable
 * tangents, so the anisotropic BRDF term degenerates to solid black.
 * Confirmed directly: one affected material measured `anisotropy: 0.625`;
 * zeroing anisotropy/clearcoat/sheen/transmission/iridescence on every
 * MeshPhysicalMaterial made the black patches vanish completely (verified
 * full-body, every joint, tendons AND sutures). The earlier Blender-side
 * sharp-edge/normal fix for tendons was real, well-verified, and worth
 * keeping (it's a genuine geometry improvement, harmless either way), but
 * it was NOT what actually fixed the black rendering — this was.
 */
export function recolorMaterials(scene: THREE.Object3D) {
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat.isMeshStandardMaterial) continue;
      const physical = m as THREE.MeshPhysicalMaterial;
      if (physical.isMeshPhysicalMaterial) {
        physical.anisotropy = 0;
        physical.clearcoat = 0;
        physical.sheen = 0;
        physical.transmission = 0;
        physical.iridescence = 0;
      }
      mat.emissive.setRGB(0, 0, 0);
      if (mat.name.startsWith("Bone")) {
        mat.color.copy(BONE_COLOR);
      } else if (mat.name === "Cartilage") {
        mat.color.copy(CARTILAGE_COLOR);
      } else if (mat.name === "Tendon") {
        mat.color.copy(TENDON_COLOR);
      } else if (TOOTH_MATERIAL_NAMES.has(mat.name)) {
        mat.color.copy(TOOTH_COLOR);
      } else {
        mat.color.copy(MUSCLE_COLOR);
      }
      mat.roughness = 0.6;
      mat.metalness = 0.05;
    }
  });
}

export const JOINT_MARKER_COLORS = {
  joint: "#1f6f6a",
  jointHover: "#5eead4",
  jointSelected: "#2dd4bf",
};
