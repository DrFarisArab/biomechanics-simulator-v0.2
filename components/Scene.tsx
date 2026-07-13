"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { BodyModel } from "./BodyModel";
import { SkinOverlay } from "./SkinOverlay";
import { ErrorBoundary } from "./ErrorBoundary";
import { Chair } from "./furniture/Chair";
import { Bed } from "./furniture/Bed";
import { useArmSimStore } from "@/lib/store";

const MODEL_URLS = {
  skeleton: "/models/v2-body-skeleton.glb",
  // Bones + all muscles bound so far (arms + trunk) together, same unified
  // rig — exported combined so the skeleton is visible for reference under
  // the muscles, not muscles floating with nothing underneath.
  muscles: "/models/v2-body-full.glb",
} as const;

// Rest-pose local point the camera should orbit around — roughly mid-torso
// height (between pelvis ~0.86 and head ~1.7) at the spine's own AP depth,
// NOT world Z=0. Verified via world-space bone coordinates: pelvis/thigh/
// upper-arm all sit at local Z ≈ -0.01 to -0.05 at rest, so a target fixed
// at Z=0 (the old value) was pinned slightly ANTERIOR of the actual spine —
// exactly the "feels like it's rotating around its front" complaint.
// Transformed by the current root position/rotation so the pivot still
// tracks the body's real center for every preset (recumbent poses
// translate/rotate the whole root far from the origin; a fixed world-space
// target would be badly off-center for those).
const LOCAL_VIEW_CENTER = new THREE.Vector3(0, 1.2, -0.03);

export function Scene() {
  const appearance = useArmSimStore((s) => s.appearance);
  const showSkin = useArmSimStore((s) => s.showSkin);
  const furniture = useArmSimStore((s) => s.furniture);
  const furnitureRotation = useArmSimStore((s) => s.furnitureRotation);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);

  const target = useMemo<[number, number, number]>(() => {
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rootRotation[0], rootRotation[1], rootRotation[2], "XYZ")
    );
    const p = LOCAL_VIEW_CENTER.clone().applyQuaternion(quat).add(new THREE.Vector3(...rootPosition));
    return [p.x, p.y, p.z];
  }, [rootPosition, rootRotation]);

  return (
    <ErrorBoundary>
      <Canvas
        // Same viewing direction as before, just pulled back from ~2.87 to
        // ~4.0 units from the target — at fov 40 the old distance's vertical
        // frustum only covered y ≈ [0.16, 2.24] around the mid-torso target
        // (1.2), clipping the feet (y=0) at the bottom on any viewport
        // taller than the ~650px one this was originally tuned against.
        // ~4.0 covers y ≈ [-0.26, 2.66], fitting head-to-feet with margin.
        camera={{ position: [2.51, 1.34, 3.08], fov: 40, near: 0.01, far: 20 }}
        className="!bg-neutral-950"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 1]} intensity={1.3} />
        <directionalLight position={[-1, 0.5, -1]} intensity={0.4} />
        <Suspense fallback={null}>
          <BodyModel key={appearance} modelUrl={MODEL_URLS[appearance]} />
          {showSkin && <SkinOverlay />}
          {furniture === "chair" && <Chair />}
          {furniture === "bed" && <Bed rotationY={furnitureRotation} />}
        </Suspense>
        <Grid args={[4, 4]} position={[0, 0, 0]} cellColor="#26333f" sectionColor="#374151" fadeDistance={6} />
        <OrbitControls makeDefault target={target} />
      </Canvas>
    </ErrorBoundary>
  );
}
