import * as THREE from "three";

/**
 * Shared "clinical glass" look for scene furniture (chair, treatment table):
 * translucent so it never occludes the anatomy, tinted to match the app's
 * teal accent so it reads as part of the same visual system. Ported from
 * the v1 app's identical furniture treatment.
 */
let _panel: THREE.Material | null = null;
let _frame: THREE.Material | null = null;

/** Translucent panel material (seat, backrest, table top). */
export function furniturePanelMaterial(): THREE.Material {
  if (_panel) return _panel;
  _panel = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#2dd4bf"),
    transparent: true,
    opacity: 0.16,
    roughness: 0.15,
    metalness: 0,
    transmission: 0.5,
    thickness: 0.05,
    clearcoat: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return _panel;
}

/** Slightly more visible frame/leg material, so the structure still reads. */
export function furnitureFrameMaterial(): THREE.Material {
  if (_frame) return _frame;
  _frame = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#5eead4"),
    transparent: true,
    opacity: 0.3,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.3,
  });
  return _frame;
}
