"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore } from "@/lib/store";
import { getGravitySupports } from "@/lib/presets";
import { gravitySolutionChanged, solveGravityConstraints } from "@/lib/gravityMode";
import {
  applyGravityMovement,
  gravityMovementLockedDofs,
  gravityMovementPinsSupportPositions,
  gravityMovementStanceLeg,
  gravityMovementSupportProfileId,
  gravityMovementSupports,
  gravityMovementUsesVerticalOnlyCompensation,
  gravityMovementIsScapular,
} from "@/lib/gravityMovements";
import { ALL_RIG_BONE_NAMES, applyRigPose, type RigPoseRefs } from "@/lib/rigPose";
import { getDracoLoader } from "@/lib/dracoLoader";

const RIG_MODEL_URL = "/models/v2-body-skeleton.glb";

/**
 * Invisible solver rig used only while Gravity is enabled. It receives the
 * same pose pipeline as the visible model, derives temporary compensation,
 * and publishes that layer without ever writing to the user's joint angles.
 */
export function GravityConstraintLayer() {
  const gltf = useLoader(GLTFLoader, RIG_MODEL_URL, (loader) => loader.setDRACOLoader(getDracoLoader()));
  const scene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) child.visible = false;
    });
    return cloned;
  }, [gltf]);
  const rigRootRef = useRef<THREE.Group>(null);
  const comMarkerRef = useRef<THREE.Mesh>(null);
  const comMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const poseRef = useRef<RigPoseRefs>({
    bones: {},
    restQuats: {},
    pelvisRestPosition: null,
    hipLocalOffsets: {},
    jawRestPosition: null,
  });
  const solverCalibrationRef = useRef<{
    key: string;
    targetY: number[];
    targetPositions: THREE.Vector3[];
    balanceAllowance: number;
  } | null>(null);
  const solutionRef = useRef<ReturnType<typeof solveGravityConstraints> | null>(null);

  const angles = useArmSimStore((s) => s.angles);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const gravitySupportProfileId = useArmSimStore((s) => s.gravitySupportProfileId);
  const lastEdited = useArmSimStore((s) => s.lastEdited);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);
  const gravityMovement = useArmSimStore((s) => s.gravityMovement);
  const setGravitySolution = useArmSimStore((s) => s.setGravitySolution);
  const invalidate = useThree((s) => s.invalidate);
  const movementSupports = useMemo(() => gravityMovementSupports(gravityMovement), [gravityMovement]);
  const supports = useMemo(
    () => movementSupports ?? getGravitySupports(gravitySupportProfileId),
    [gravitySupportProfileId, movementSupports]
  );
  const supportProfileId = gravityMovementSupportProfileId(gravityMovement) ?? gravitySupportProfileId;
  const movementAngles = useMemo(
    () => applyGravityMovement(angles, gravityMovement),
    [angles, gravityMovement]
  );
  const lockedDofs = useMemo(() => gravityMovementLockedDofs(gravityMovement), [gravityMovement]);
  const verticalOnly = gravityMovementUsesVerticalOnlyCompensation(gravityMovement);
  const pinSupportPositions = gravityMovementPinsSupportPositions(gravityMovement);
  const effectiveStanceLeg = gravityMovementStanceLeg(gravityMovement) ?? stanceLeg;
  // Scapular movements pose the shoulder girdle but must not trigger a
  // whole-body balance solve — disabling the solver here still lets the pose
  // render (solveGravityConstraints applies the pose regardless) while
  // returning a zero compensation/offset, so the body stays planted.
  const scapularMovement = gravityMovementIsScapular(gravityMovement);

  useMemo(() => {
    const bones: RigPoseRefs["bones"] = {};
    for (const name of ALL_RIG_BONE_NAMES) bones[name] = scene.getObjectByName(name) ?? undefined;
    const restQuats: RigPoseRefs["restQuats"] = {};
    for (const [name, bone] of Object.entries(bones)) restQuats[name] = bone?.quaternion.clone();
    poseRef.current = {
      bones,
      restQuats,
      pelvisRestPosition: bones.pelvis?.position.clone() ?? null,
      hipLocalOffsets: { left: bones.thighL?.position.clone(), right: bones.thighR?.position.clone() },
      jawRestPosition: bones.jaw?.position.clone() ?? null,
      scapulaRestPositions: {
        left: bones.scapulaL?.position.clone(),
        right: bones.scapulaR?.position.clone(),
      },
    };
  }, [scene]);

  useEffect(() => {
    solverCalibrationRef.current = null;
  }, [gravityEnabled, rootPosition, rootRotation, supportProfileId]);

  useEffect(() => {
    const rigRoot = rigRootRef.current;
    if (!rigRoot) return;
    const applyPose = (workingAngles: Record<string, Record<string, number>>) =>
      applyRigPose(poseRef.current, workingAngles, effectiveStanceLeg);
    const next = solveGravityConstraints({
      enabled: gravityEnabled && !scapularMovement,
      supportProfileId,
      supports,
      angles: movementAngles,
      lastEdited,
      lockedDofs,
      verticalOnly,
      pinSupportPositions,
      pose: poseRef.current,
      rigRoot,
      applyPose,
      calibration: solverCalibrationRef,
    });
    solutionRef.current = next;
    const current = useArmSimStore.getState();
    if (
      gravitySolutionChanged(
        {
          compensation: current.gravityCompensation,
          rootOffsetY: current.gravityRootOffsetY,
          rootOffset: current.gravityRootOffset,
        },
        next
      )
    ) {
      setGravitySolution(next);
    }
    invalidate(2);
  }, [effectiveStanceLeg, gravityEnabled, invalidate, lastEdited, lockedDofs, movementAngles, pinSupportPositions, rootPosition, rootRotation, scapularMovement, setGravitySolution, supportProfileId, supports, verticalOnly]);

  useFrame(() => {
    const root = rigRootRef.current;
    const marker = comMarkerRef.current;
    const material = comMaterialRef.current;
    const solution = solutionRef.current;
    if (!root || !marker || !material || !gravityEnabled || !solution || solution.supportPositions.length === 0) {
      if (marker) marker.visible = false;
      return;
    }
    const projection = solution.com.clone();
    projection.y = solution.projectionSurfaceY + 0.026;
    root.worldToLocal(projection);
    marker.visible = true;
    marker.position.copy(projection);
    material.color.set(solution.stable ? "#34d399" : "#fb7185");
    material.emissive.set(solution.stable ? "#065f46" : "#9f1239");
  });

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rootRotation[0], rootRotation[1], rootRotation[2], "XYZ")),
    [rootRotation]
  );

  return (
    <group position={rootPosition}>
      <group ref={rigRootRef} quaternion={quaternion}>
        <primitive object={scene} />
        <mesh ref={comMarkerRef} visible={false} renderOrder={2}>
          <sphereGeometry args={[0.026, 18, 14]} />
          <meshStandardMaterial ref={comMaterialRef} transparent opacity={0.92} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}
