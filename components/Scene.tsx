"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { ArmModel } from "./ArmModel";
import { ErrorBoundary } from "./ErrorBoundary";

export function Scene() {
  return (
    <ErrorBoundary>
      <Canvas
        camera={{ position: [1.1, 1.15, 1.5], fov: 40, near: 0.01, far: 20 }}
        className="!bg-neutral-950"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[1, 2, 1]} intensity={1.3} />
        <directionalLight position={[-1, 0.5, -1]} intensity={0.4} />
        <Suspense fallback={null}>
          <ArmModel />
        </Suspense>
        <Grid args={[4, 4]} position={[0, 0, 0]} cellColor="#26333f" sectionColor="#374151" fadeDistance={6} />
        <OrbitControls makeDefault target={[0, 1.0, 0]} />
      </Canvas>
    </ErrorBoundary>
  );
}
