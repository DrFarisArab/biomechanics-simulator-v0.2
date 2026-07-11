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
 * purely by material name so the SAME function works whether a given GLB
 * has only bones, only muscles, or (v2-arm-full.glb) both together.
 */
function recolorMaterials(scene: THREE.Object3D) {
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
  const scene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    recolorMaterials(cloned);
    return cloned;
  }, [gltf]);
  const bonesRef = useRef<Record<string, THREE.Object3D | undefined>>({});
  // Rest-pose quaternion per bone, captured once right after load/clone —
  // see armDofs.ts's applyArmPose doc comment for why this is required.
  const restQuatsRef = useRef<Record<string, THREE.Quaternion | undefined>>({});
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
    const restQuats: Record<string, THREE.Quaternion | undefined> = {};
    for (const [name, bone] of Object.entries(found)) {
      restQuats[name] = bone?.quaternion.clone();
    }
    restQuatsRef.current = restQuats;
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
    applyArmPose(bonesRef.current, restQuatsRef.current, subset);
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
