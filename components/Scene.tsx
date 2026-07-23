"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, useProgress } from "@react-three/drei";
import { BodyModel } from "./BodyModel";
import { SkinOverlay } from "./SkinOverlay";
import { GravityConstraintLayer } from "./GravityConstraintLayer";
import { ClipPlaybackDriver } from "./ClipPlaybackDriver";
import { ErrorBoundary } from "./ErrorBoundary";
import { Chair } from "./furniture/Chair";
import { Bed } from "./furniture/Bed";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { useThemeStore } from "@/lib/themeStore";
import { getBrand500, getGridColors, getInk950 } from "@/lib/themeColors";

const MODEL_URLS = {
  skeleton: "/models/v2-body-skeleton.glb",
  // Bones + all muscles bound so far (arms + trunk) together, same unified
  // rig — exported combined so the skeleton is visible for reference under
  // the muscles, not muscles floating with nothing underneath.
  muscles: "/models/v2-body-musclelbone-combined.glb",
} as const;

// Rest-pose local point the camera should orbit around AND frame the view
// on (OrbitControls always points the camera at this, so it doubles as the
// screen-center point) — at the spine's own AP depth, NOT world Z=0.
// Verified via world-space bone coordinates: pelvis/thigh/upper-arm all sit
// at local Z ≈ -0.01 to -0.05 at rest, so a target fixed at Z=0 (the old
// value) was pinned slightly ANTERIOR of the actual spine — exactly the
// "feels like it's rotating around its front" complaint.
// Y is the body's true vertical midpoint (feet at 0, head top ≈1.8), NOT
// mid-torso (~1.2) — mid-torso pushed the framing center too high, leaving
// dead space above the head while the feet crowded the bottom edge.
// Transformed by the current root position/rotation so the pivot still
// tracks the body's real center for every preset (recumbent poses
// translate/rotate the whole root far from the origin; a fixed world-space
// target would be badly off-center for those).
const LOCAL_VIEW_CENTER = new THREE.Vector3(0, 0.9, -0.03);

// Mirrors the Canvas's initial `camera` prop below — that prop only sets the
// STARTING position, so restoring "home" after the user has orbited around
// requires re-applying it imperatively via useThree's camera ref.
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(2.51, 1.34, 3.08);

// Captures the MAIN scene camera/invalidate, rendered as a direct Canvas
// child (outside GizmoHelper's <Hud>). Hud renders its children through
// createPortal into a separate hud scene/camera pair, so a useThree() call
// from *inside* GizmoHelper resolves to the gizmo's own small orthographic
// camera, not the body's perspective camera — ViewCubeHome needs the real
// one, captured here and handed down via ref.
function MainCameraCapture({ target }: { target: React.MutableRefObject<MainCameraRef> }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  target.current = { camera, invalidate };
  return null;
}

interface MainCameraRef {
  camera: THREE.Camera | null;
  invalidate: (() => void) | null;
}

// Small hub at the center of the orientation gizmo — clicking it resets both
// the camera framing and the model's joint pose back to their defaults, the
// combined replacement for the old "Reset Pose" toolbar button. Axis-head
// clicks (handled by GizmoViewport itself) only reorient the camera, so this
// hub is the one control that also zeroes out the skeleton's angles.
function ViewCubeHome({ mainCameraRef }: { mainCameraRef: React.MutableRefObject<MainCameraRef> }) {
  const resetAll = useArmSimStore((s) => s.resetAll);
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const hubColor = getBrand500(theme, mode);

  const handleReset = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    resetAll();
    const { camera, invalidate } = mainCameraRef.current;
    if (camera) {
      camera.position.copy(DEFAULT_CAMERA_POSITION);
      camera.up.set(0, 1, 0);
    }
    invalidate?.();
  };

  return (
    <mesh onPointerDown={handleReset}>
      <sphereGeometry args={[9, 20, 20]} />
      <meshBasicMaterial color={hubColor} toneMapped={false} />
    </mesh>
  );
}

export function Scene() {
  const appearance = useArmSimStore((s) => s.appearance);
  const showSkin = useArmSimStore((s) => s.showSkin);
  const furniture = useArmSimStore((s) => s.furniture);
  const furnitureRotation = useArmSimStore((s) => s.furnitureRotation);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);

  // On-demand rendering: the scene is static the vast majority of the time
  // (a posed model the user occasionally orbits), so re-rendering every frame
  // pegged the GPU (~120fps of a 597-draw-call / 607k-triangle scene while
  // idle). frameloop="demand" renders only when something changes —
  // OrbitControls invalidates on its own 'change' event (drei, makeDefault),
  // React-prop changes to the scene graph auto-invalidate, and BodyModel
  // calls invalidate() after its imperative bone-rotation updates.
  // Clip/preview playback is the one case that needs a continuous loop, so
  // flip back to "always" only while a clip is actually playing.
  const isAnimating = useRecordReplayStore((s) => s.isPlaying || s.previewPlaying);

  // Startup warm-up: render continuously until the async GLBs have finished
  // loading (drei's useProgress tracks the three loading manager), then a
  // short buffer, then fall back to the on-demand loop for idle perf. This
  // guarantees the model actually paints on first load — frameloop="demand"
  // alone could leave a fresh load blank because the single mount-time frame
  // races the model load, and a post-load invalidate doesn't re-run the
  // measure/size setup the first paint needs. A hard cap makes sure we never
  // render forever if progress never reports complete.
  const { active: loadingActive, progress } = useProgress();
  const [warmupDone, setWarmupDone] = useState(false);
  useEffect(() => {
    if (!loadingActive && progress >= 100) {
      const id = window.setTimeout(() => setWarmupDone(true), 800);
      return () => window.clearTimeout(id);
    }
  }, [loadingActive, progress]);
  useEffect(() => {
    const id = window.setTimeout(() => setWarmupDone(true), 10000);
    return () => window.clearTimeout(id);
  }, []);

  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const grid = useMemo(() => getGridColors(theme, mode), [theme, mode]);
  const background = useMemo(() => getInk950(theme, mode), [theme, mode]);

  const mainCameraRef = useRef<MainCameraRef>({ camera: null, invalidate: null });

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
        camera={{ position: DEFAULT_CAMERA_POSITION.toArray(), fov: 40, near: 0.01, far: 20 }}
        // The export path captures the WebGL canvas directly. Keeping the
        // final rendered frame lets MediaRecorder encode the actual model
        // pixels instead of a cleared WebGL buffer.
        gl={{ alpha: false, preserveDrawingBuffer: true }}
        frameloop={isAnimating || !warmupDone ? "always" : "demand"}
        className="!bg-ink-950"
      >
        <color attach="background" args={[background]} />
        <ambientLight intensity={0.82} />
        <directionalLight position={[1, 2, 1]} intensity={1.55} />
        <directionalLight position={[-1, 0.5, -1]} intensity={0.62} />
        <Suspense fallback={null}>
          <GravityConstraintLayer />
          <BodyModel key={appearance} modelUrl={MODEL_URLS[appearance]} />
          {showSkin && <SkinOverlay />}
          {furniture === "chair" && <Chair />}
          {furniture === "bed" && <Bed rotationY={furnitureRotation} />}
        </Suspense>
        <Grid args={[4, 4]} position={[0, 0, 0]} cellColor={grid.cell} sectionColor={grid.section} fadeDistance={6} />
        <OrbitControls makeDefault target={target} />
        <ClipPlaybackDriver />
        <MainCameraCapture target={mainCameraRef} />
        <GizmoHelper alignment="top-right" margin={[64, 64]}>
          <GizmoViewport axisColors={["#F43F5E", "#22C55E", "#3B82F6"]} labelColor="#0a0a0a" />
          <ViewCubeHome mainCameraRef={mainCameraRef} />
        </GizmoHelper>
      </Canvas>
    </ErrorBoundary>
  );
}
