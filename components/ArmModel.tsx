"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore, JOINT_IDS } from "@/lib/store";
import { applyArmPose, ARM_BONE_NAMES } from "@/lib/armDofs";

const COLORS = {
  joint: "#1f6f6a",
  jointHover: "#5eead4",
  jointSelected: "#2dd4bf",
};

// Joint id -> the bone whose own local origin (head) IS that joint's pivot.
const JOINT_MARKER_BONE: Record<string, string> = {
  shoulder_left: "upper_armL",
  shoulder_right: "upper_armR",
  elbow_left: "forearmL",
  elbow_right: "forearmR",
  wrist_left: "handL",
  wrist_right: "handR",
};

/**
 * v0.2 arm model — loads the fresh v2-arms.glb (see lib/armDofs.ts for the
 * rig/binding background) and drives it live from the store.
 *
 * Two lessons carried over from the v1 attempt's post-mortem, applied here
 * from the START instead of discovered by a bug report:
 *  1. SkeletonUtils.clone (NOT Object3D.clone(true)) — plain clone breaks
 *     SkinnedMesh->skeleton binding, silently freezing the mesh at rest pose.
 *  2. Joint markers are independent sibling <mesh> elements whose position
 *     is resynced every frame from the driving bone's world transform, NOT
 *     reparented into the bone hierarchy (which would tear the skeleton).
 *
 * Takes a `modelUrl` so the SAME component drives both the skeleton-only
 * and muscles-only GLBs (both exported from the same Blender armature, so
 * they share identical bone names/DOF mapping — see armDofs.ts).
 */
export function ArmModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const scene = useMemo(() => cloneSkinned(gltf.scene) as THREE.Object3D, [gltf]);
  const bonesRef = useRef<Record<string, THREE.Object3D | undefined>>({});
  const markerRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const groupRef = useRef<THREE.Group>(null);

  const selectJoint = useArmSimStore((s) => s.selectJoint);
  const hoverJoint = useArmSimStore((s) => s.hoverJoint);
  const selectedJoint = useArmSimStore((s) => s.selectedJoint);
  const hoveredJoint = useArmSimStore((s) => s.hoveredJoint);
  const angles = useArmSimStore((s) => s.angles);

  const markerJoints = useMemo(() => {
    const found: Record<string, THREE.Object3D | undefined> = {};
    for (const name of ARM_BONE_NAMES) {
      found[name] = scene.getObjectByName(name) ?? undefined;
    }
    bonesRef.current = found;
    if (typeof window !== "undefined") {
      (window as unknown as { __armScene: THREE.Object3D }).__armScene = scene;
    }
    return Object.entries(JOINT_MARKER_BONE)
      .map(([jointId, boneName]) => ({ jointId, bone: found[boneName] }))
      .filter((m): m is { jointId: string; bone: THREE.Object3D } => !!m.bone);
  }, [scene]);

  useEffect(() => {
    const subset: Record<string, Record<string, number> | undefined> = {};
    for (const id of JOINT_IDS) subset[id] = angles[id];
    applyArmPose(bonesRef.current, subset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angles]);

  const tmpWorld = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    for (const { jointId, bone } of markerJoints) {
      const marker = markerRefs.current[jointId];
      if (!marker) continue;
      bone.getWorldPosition(tmpWorld);
      group.worldToLocal(tmpWorld);
      marker.position.copy(tmpWorld);
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {markerJoints.map(({ jointId }) => {
        const isSelected = selectedJoint === jointId;
        const isHovered = hoveredJoint === jointId;
        const color = isSelected ? COLORS.jointSelected : isHovered ? COLORS.jointHover : COLORS.joint;
        return (
          <mesh
            key={jointId}
            ref={(el) => {
              markerRefs.current[jointId] = el;
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectJoint(jointId);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              hoverJoint(jointId);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              hoverJoint(null);
              document.body.style.cursor = "default";
            }}
          >
            <sphereGeometry args={[isSelected || isHovered ? 0.022 : 0.017, 16, 14]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.35 : 0.12}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}
