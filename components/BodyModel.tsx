"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore, JOINT_IDS, TRUNK_IDS } from "@/lib/store";
import { applyArmPose, ARM_BONE_NAMES } from "@/lib/armDofs";
import { applyTrunkPose, TRUNK_BONE_NAMES } from "@/lib/trunkDofs";
import { recolorMaterials, JOINT_MARKER_COLORS as COLORS } from "@/lib/materials";

// Joint id -> the bone whose own local origin (head) IS that joint's pivot.
const JOINT_MARKER_BONE: Record<string, string> = {
  pelvis: "pelvis",
  lumbar: "lumbar",
  thoracic: "thoracic",
  cervical: "cervical",
  shoulder_left: "upper_armL",
  shoulder_right: "upper_armR",
  elbow_left: "forearmL",
  elbow_right: "forearmR",
  wrist_left: "handL",
  wrist_right: "handR",
};

const ALL_BONE_NAMES = Array.from(new Set([...ARM_BONE_NAMES, ...TRUNK_BONE_NAMES]));

/**
 * v0.2 unified body model — ONE armature (v2_body_rig) covering trunk
 * (pelvis/lumbar/thoracic/cervical) and both arms (shoulder->elbow->wrist),
 * with the arms parented to the thoracic bone so trunk motion correctly
 * carries the arms (verified live in Blender before export: flexing the
 * thoracic bone moved the shoulder's world position with it). Replaces the
 * earlier ArmModel+TrunkModel pair, which were two independent armatures
 * that only LOOKED connected because they shared the same source
 * coordinates — moving one didn't move the other.
 *
 * Same two lessons from the original ArmModel.tsx post-mortem, still
 * applied: SkeletonUtils.clone (not Object3D.clone(true)), and frame-
 * synced sibling joint markers (not reparented into the bone hierarchy).
 * Same rest+delta quaternion composition as armDofs.ts/trunkDofs.ts's
 * apply*Pose — see armDofs.ts's doc comment for why an absolute
 * rotation.set() is wrong for this rig.
 */
export function BodyModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useLoader(GLTFLoader, modelUrl);
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
    for (const name of ALL_BONE_NAMES) {
      found[name] = scene.getObjectByName(name) ?? undefined;
    }
    bonesRef.current = found;
    const restQuats: Record<string, THREE.Quaternion | undefined> = {};
    for (const [name, bone] of Object.entries(found)) {
      restQuats[name] = bone?.quaternion.clone();
    }
    restQuatsRef.current = restQuats;
    if (typeof window !== "undefined") {
      (window as unknown as { __bodyScene: THREE.Object3D }).__bodyScene = scene;
    }
    return Object.entries(JOINT_MARKER_BONE)
      .map(([jointId, boneName]) => ({ jointId, bone: found[boneName] }))
      .filter((m): m is { jointId: string; bone: THREE.Object3D } => !!m.bone);
  }, [scene]);

  useEffect(() => {
    const armSubset: Record<string, Record<string, number> | undefined> = {};
    for (const id of JOINT_IDS) armSubset[id] = angles[id];
    applyArmPose(bonesRef.current, restQuatsRef.current, armSubset);

    const trunkSubset: Record<string, Record<string, number> | undefined> = {};
    for (const id of TRUNK_IDS) trunkSubset[id] = angles[id];
    applyTrunkPose(bonesRef.current, restQuatsRef.current, trunkSubset);
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
