"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { ArmModel } from "./ArmModel";
import { TrunkModel } from "./TrunkModel";
import { ErrorBoundary } from "./ErrorBoundary";
import { useArmSimStore } from "@/lib/store";

const MODEL_URLS = {
  skeleton: "/models/v2-arm-skeleton.glb",
  // Bones + muscles together (same rig, exported combined) — clinician
  // asked to see the skeleton for anatomical reference while the muscles
  // are visible too, not muscles floating with nothing underneath.
  muscles: "/models/v2-arm-full.glb",
} as const;

export function Scene() {
  const appearance = useArmSimStore((s) => s.appearance);
  return (
    <ErrorBoundary>
      <Canvas
        camera={{ position: [1.8, 1.3, 2.2], fov: 40, near: 0.01, far: 20 }}
        className="!bg-neutral-950"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 1]} intensity={1.3} />
        <directionalLight position={[-1, 0.5, -1]} intensity={0.4} />
        <Suspense fallback={null}>
          <ArmModel key={appearance} modelUrl={MODEL_URLS[appearance]} />
          {/* No trunk muscles yet (arms-only muscle binding so far) — trunk
              stays skeleton-only in both appearance modes until that's built. */}
          <TrunkModel />
        </Suspense>
        <Grid args={[4, 4]} position={[0, 0, 0]} cellColor="#26333f" sectionColor="#374151" fadeDistance={6} />
        <OrbitControls makeDefault target={[0, 1.15, 0]} />
      </Canvas>
    </ErrorBoundary>
  );
}
