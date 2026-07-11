"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore, TRUNK_IDS } from "@/lib/store";
import { applyTrunkPose, TRUNK_BONE_NAMES } from "@/lib/trunkDofs";
import { recolorMaterials, JOINT_MARKER_COLORS as COLORS } from "@/lib/materials";

const MODEL_URL = "/models/v2-trunk-skeleton.glb";

// Joint id === bone name here (one bone per region, no L/R pairing).
const JOINT_MARKER_BONE: Record<string, string> = {
  pelvis: "pelvis",
  lumbar: "lumbar",
  thoracic: "thoracic",
  cervical: "cervical",
};

/**
 * v0.2 trunk/spine model — same pattern as ArmModel.tsx (see that file's
 * doc comment for the two lessons baked in from the start: SkeletonUtils
 * clone, and frame-synced sibling joint markers instead of reparenting).
 * Rendered as a SEPARATE sibling object in the same scene as ArmModel —
 * not spatially attached/parented to it — but both were built from the
 * SAME atlas's real-world coordinates, so they land in a consistent
 * position/scale without any extra alignment step (verified live).
 */
export function TrunkModel() {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const scene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    recolorMaterials(cloned);
    return cloned;
  }, [gltf]);
  const bonesRef = useRef<Record<string, THREE.Object3D | undefined>>({});
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
    for (const name of TRUNK_BONE_NAMES) {
      found[name] = scene.getObjectByName(name) ?? undefined;
    }
    bonesRef.current = found;
    const restQuats: Record<string, THREE.Quaternion | undefined> = {};
    for (const [name, bone] of Object.entries(found)) {
      restQuats[name] = bone?.quaternion.clone();
    }
    restQuatsRef.current = restQuats;
    if (typeof window !== "undefined") {
      (window as unknown as { __trunkScene: THREE.Object3D }).__trunkScene = scene;
    }
    return Object.entries(JOINT_MARKER_BONE)
      .map(([jointId, boneName]) => ({ jointId, bone: found[boneName] }))
      .filter((m): m is { jointId: string; bone: THREE.Object3D } => !!m.bone);
  }, [scene]);

  useEffect(() => {
    const subset: Record<string, Record<string, number> | undefined> = {};
    for (const id of TRUNK_IDS) subset[id] = angles[id];
    applyTrunkPose(bonesRef.current, restQuatsRef.current, subset);
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
            <sphereGeometry args={[isSelected || isHovered ? 0.024 : 0.019, 16, 14]} />
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
