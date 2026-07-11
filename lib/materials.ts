import * as THREE from "three";

const BONE_COLOR = new THREE.Color("#e8dcc4");
const CARTILAGE_COLOR = new THREE.Color("#cfe0e6");
const MUSCLE_COLOR = new THREE.Color("#ad584c");
const TENDON_COLOR = new THREE.Color("#e5ddc8");

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
export function recolorMaterials(scene: THREE.Object3D) {
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat.isMeshStandardMaterial) continue;
      mat.emissive.setRGB(0, 0, 0);
      if (mat.name.startsWith("Bone")) {
        mat.color.copy(BONE_COLOR);
      } else if (mat.name === "Cartilage") {
        mat.color.copy(CARTILAGE_COLOR);
      } else if (mat.name === "Tendon") {
        mat.color.copy(TENDON_COLOR);
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
