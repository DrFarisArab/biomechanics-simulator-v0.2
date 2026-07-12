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
import { applyScapularRhythm } from "@/lib/scapularRhythm";
import { computePelvisPivotOffset, stanceLegRotationCorrection } from "@/lib/stanceMode";
import { lumbopelvicTiltDeg } from "@/lib/lumbopelvicRhythm";
import { recolorMaterials, JOINT_MARKER_COLORS as COLORS } from "@/lib/materials";

// Joint id -> the bone whose own local origin (head) IS that joint's pivot.
// lumbar/thoracic/cervical are now per-vertebra CHAINS (see trunkDofs.ts) —
// the marker sits at the bottom of each chain (v0), i.e. where that region
// begins, same conceptual spot the old single region bone's marker sat.
const JOINT_MARKER_BONE: Record<string, string> = {
  pelvis: "pelvis",
  lumbar: "lumbar_v0",
  thoracic: "thoracic_v0",
  cervical: "cervical_v0",
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
  new Set([...ARM_BONE_NAMES, ...TRUNK_BONE_NAMES, ...LEG_BONE_NAMES, "head", "scapulaL", "scapulaR"])
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
  // Pelvis's own rest LOCAL position, plus the stance hips' rest local
  // offsets FROM pelvis (i.e. thighL/thighR's own .position, since they're
  // direct children of pelvis in the loaded scene graph) — the inputs
  // computePelvisPivotOffset needs for the ground-contact stance pivot.
  const pelvisRestPosRef = useRef<THREE.Vector3 | null>(null);
  const hipLocalOffsetsRef = useRef<{ left?: THREE.Vector3; right?: THREE.Vector3 }>({});
  const markerRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const groupRef = useRef<THREE.Group>(null);

  const selectJoint = useArmSimStore((s) => s.selectJoint);
  const hoverJoint = useArmSimStore((s) => s.hoverJoint);
  const selectedJoint = useArmSimStore((s) => s.selectedJoint);
  const hoveredJoint = useArmSimStore((s) => s.hoveredJoint);
  const angles = useArmSimStore((s) => s.angles);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);

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
    const pelvisBone = found.pelvis;
    pelvisRestPosRef.current = pelvisBone ? pelvisBone.position.clone() : null;
    hipLocalOffsetsRef.current = {
      left: found.thighL?.position.clone(),
      right: found.thighR?.position.clone(),
    };
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

    // Ground-contact stance leg rotation correction — must run AFTER
    // applyLegPose (needs the thigh bone's already-computed normal local
    // quaternion) and uses the SAME effective pelvis tilt (including the
    // lumbopelvic rhythm contribution) that applyTrunkPose used, so the
    // correction is computed from the pelvis's actual total delta, not just
    // the user-dialled tilt. See stanceMode.ts's stanceLegRotationCorrection
    // for why this can't be folded into applyLegPose as a simple DOF.
    if (stanceLeg !== "none") {
      const effectiveTilt = (angles.pelvis?.tilt ?? 0) + lumbopelvicTiltDeg(angles.lumbar?.flexExt ?? 0);
      const rotationDeg = angles.pelvis?.rotation ?? 0;
      const obliquityDeg = angles.pelvis?.obliquity ?? 0;
      for (const side of ["left", "right"] as const) {
        const boneName = side === "left" ? "thighL" : "thighR";
        const bone = bonesRef.current[boneName];
        if (!bone) continue;
        const correction = stanceLegRotationCorrection(side, stanceLeg, effectiveTilt, rotationDeg, obliquityDeg);
        bone.quaternion.premultiply(correction);
      }
    }

    applyScapularRhythm(bonesRef.current, restQuatsRef.current, angles);

    // Ground-contact stance pivot — must run AFTER applyTrunkPose (which
    // only touches rotation); this adjusts the pelvis bone's own POSITION
    // so the stance hip stays planted in world space while it hikes.
    const pelvisBone = bonesRef.current.pelvis;
    const restPos = pelvisRestPosRef.current;
    if (pelvisBone && restPos) {
      const offset = computePelvisPivotOffset(
        stanceLeg,
        restPos,
        hipLocalOffsetsRef.current,
        angles.pelvis?.obliquity ?? 0
      );
      pelvisBone.position.copy(offset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angles, stanceLeg]);

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
