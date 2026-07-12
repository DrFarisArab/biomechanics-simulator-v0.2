"use client";

import { furnitureFrameMaterial, furniturePanelMaterial } from "./materials";

/**
 * Semi-transparent examination chair, sized for the "Sitting (90/90)" preset:
 * pelvis/hip pivot sits at world y≈0.86, thighs horizontal, shanks vertical
 * to the floor. Seat top sits just below the hips so the pelvis reads as
 * resting on it without clipping through the (translucent) panel. Ported
 * from the v1 app's identical chair (same real-world body scale, so the
 * same tuned dimensions transfer directly).
 */
export function Chair() {
  const panel = furniturePanelMaterial();
  const frame = furnitureFrameMaterial();
  const seatY = 0.82;
  const seatDepth = 0.42;
  const seatWidth = 0.46;
  const legR = 0.018;

  const legXs = [-1, 1];
  const legZs = [-1, 1];

  return (
    <group>
      {/* Seat */}
      <mesh position={[0, seatY, 0.06]} material={panel} receiveShadow>
        <boxGeometry args={[seatWidth, 0.04, seatDepth]} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, seatY + 0.32, -0.15]} rotation={[-0.08, 0, 0]} material={panel}>
        <boxGeometry args={[seatWidth, 0.6, 0.035]} />
      </mesh>

      {/* Legs */}
      {legXs.map((sx) =>
        legZs.map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[
              sx * (seatWidth / 2 - 0.03),
              seatY / 2,
              0.06 + sz * (seatDepth / 2 - 0.03),
            ]}
            material={frame}
            castShadow
          >
            <cylinderGeometry args={[legR, legR, seatY, 10]} />
          </mesh>
        ))
      )}
    </group>
  );
}
