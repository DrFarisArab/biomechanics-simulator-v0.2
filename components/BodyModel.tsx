"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore, JOINT_IDS, TRUNK_IDS, LEG_IDS } from "@/lib/store";
import { applyArmPose, ARM_BONE_NAMES } from "@/lib/armDofs";
import { applyTrunkPose, TRUNK_BONE_NAMES } from "@/lib/trunkDofs";
import { applyLegPose, LEG_BONE_NAMES } from "@/lib/legDofs";
import { recolorMaterials, JOINT_MARKER_COLORS as COLORS } from "@/lib/materials";

// Joint id -> the bone whose own local origin (head) IS that joint's pivot.
const JOINT_MARKER_BONE: Record<string, string> = {
  pelvis: "pelvis",
  lumbar: "lumbar",
  thoracic: "thoracic",
  cervical: "cervical",
  head: "head",
  shoulder_left: "upper_armL",
  shoulder_right: "upper_armR",
  elbow_left: "forearmL",
  elbow_right: "forearmR",
  wrist_left: "handL",
  wrist_right: "handR",
  hip_left: "thighL",
  hip_right: "thighR",
  knee_left: "shinL",
  knee_right: "shinR",
  ankle_left: "footL",
  ankle_right: "footR",
};

const ALL_BONE_NAMES = Array.from(
  new Set([...ARM_BONE_NAMES, ...TRUNK_BONE_NAMES, ...LEG_BONE_NAMES, "head"])
);

/**
 * v0.2 unified body model — ONE armature (v2_body_rig) covering the full
 * body: pelvis/lumbar/thoracic/cervical/head, both arms (shoulder->elbow->
 * wrist), and both legs (hip->knee->ankle), all as one connected skeleton
 * (arms parented to thoracic, legs parented to pelvis — verified live that
 * trunk motion carries the arms with it before this was extended to legs).
 *
 * Same two lessons from the original ArmModel.tsx post-mortem, still
 * applied: SkeletonUtils.clone (not Object3D.clone(true)), and frame-
 * synced sibling joint markers (not reparented into the bone hierarchy).
 * Same rest+delta quaternion composition as every apply*Pose function —
 * see armDofs.ts's doc comment for why an absolute rotation.set() is wrong
 * for this rig (bones don't have identity rotation at rest).
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
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);

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

    const legSubset: Record<string, Record<string, number> | undefined> = {};
    for (const id of LEG_IDS) legSubset[id] = angles[id];
    applyLegPose(bonesRef.current, restQuatsRef.current, legSubset);
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

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rootRotation[0], rootRotation[1], rootRotation[2], "XYZ")),
    [rootRotation]
  );

  return (
    <group position={rootPosition}>
      <group ref={groupRef} quaternion={quaternion}>
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
    </group>
  );
}
