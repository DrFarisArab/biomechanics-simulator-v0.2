"use client";

import { furnitureFrameMaterial, furniturePanelMaterial } from "./materials";

/**
 * Semi-transparent treatment table, used for seated-on-table and (future)
 * recumbent presets. Table top sits at a normal clinical plinth height
 * (~0.55m) with a clear gap below the body so it reads as resting ON the
 * table, not sinking into it. Ported from the v1 app's identical table.
 */
export function Bed({ rotationY = 0 }: { rotationY?: number }) {
  const panel = furniturePanelMaterial();
  const frame = furnitureFrameMaterial();
  const topY = 0.53; // box centre; physical top surface ≈ 0.555
  const length = 2.15; // along Z (before any rotationY)
  const width = 0.72; // along X (before any rotationY)
  const legR = 0.02;
  const legH = topY - 0.02;

  const legXs = [-1, 1];
  const legZs = [-1, 1];

  return (
    <group rotation={[0, rotationY, 0]}>
      {/* Table top */}
      <mesh position={[0, topY, 0]} material={panel} receiveShadow>
        <boxGeometry args={[width, 0.05, length]} />
      </mesh>

      {/* Legs, inset from the corners */}
      {legXs.map((sx) =>
        legZs.map((sz) => (
          <mesh
            key={`${sx}-${sz}`}
            position={[
              sx * (width / 2 - 0.04),
              legH / 2,
              sz * (length / 2 - 0.12),
            ]}
            material={frame}
            castShadow
          >
            <cylinderGeometry args={[legR, legR, legH, 10]} />
          </mesh>
        ))
      )}
    </group>
  );
}
