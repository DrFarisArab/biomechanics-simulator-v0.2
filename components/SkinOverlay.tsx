"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore, JOINT_IDS, TRUNK_IDS, LEG_IDS, MANDIBLE_IDS } from "@/lib/store";
import { applyArmPose, ARM_BONE_NAMES } from "@/lib/armDofs";
import { applyTrunkPose, TRUNK_BONE_NAMES } from "@/lib/trunkDofs";
import { applyLegPose, LEG_BONE_NAMES } from "@/lib/legDofs";
import { applyMandiblePose, MANDIBLE_BONE_NAMES } from "@/lib/mandibleDofs";
import { applyScapularRhythm } from "@/lib/scapularRhythm";
import { computePelvisPivotOffset, stanceLegRotationCorrection } from "@/lib/stanceMode";
import { lumbopelvicTiltDeg } from "@/lib/lumbopelvicRhythm";
import { prepareSkinOverlayMaterial } from "@/lib/materials";
import { getDracoLoader } from "@/lib/dracoLoader";

const ALL_BONE_NAMES = Array.from(
  new Set([...ARM_BONE_NAMES, ...TRUNK_BONE_NAMES, ...LEG_BONE_NAMES, ...MANDIBLE_BONE_NAMES, "head", "scapulaL", "scapulaR"])
);

const SKIN_MODEL_URL = "/models/v2-body-skin.glb";

/**
 * Translucent full-body reference shell, toggled independently of the
 * skeleton/muscles appearance — voxel-remeshed in Blender from the union of
 * every muscle+bone mesh (see v0.2.blend's "Reference Skin (generated)"
 * collection), auto-weighted to the same v2_body_rig armature.
 *
 * Mirrors BodyModel's bone-posing logic (same angles -> quaternion pipeline,
 * same stance/pelvis-pivot handling) but skips the joint markers/click
 * handlers entirely — this is a passive visual layer, not an interactive
 * one, and it's rendered as a SIBLING of BodyModel so both read the same
 * store state and stay in sync without any prop wiring between them.
 */
export function SkinOverlay() {
  const gltf = useLoader(GLTFLoader, SKIN_MODEL_URL, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });
  const scene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    prepareSkinOverlayMaterial(cloned);
    return cloned;
  }, [gltf]);

  const bonesRef = useRef<Record<string, THREE.Object3D | undefined>>({});
  const restQuatsRef = useRef<Record<string, THREE.Quaternion | undefined>>({});
  const pelvisRestPosRef = useRef<THREE.Vector3 | null>(null);
  const hipLocalOffsetsRef = useRef<{ left?: THREE.Vector3; right?: THREE.Vector3 }>({});
  const jawRestPosRef = useRef<THREE.Vector3 | null>(null);

  const angles = useArmSimStore((s) => s.angles);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);

  useMemo(() => {
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
    jawRestPosRef.current = found.jaw ? found.jaw.position.clone() : null;
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

    const mandibleSubset: Record<string, Record<string, number> | undefined> = {};
    for (const id of MANDIBLE_IDS) mandibleSubset[id] = angles[id];
    applyMandiblePose(bonesRef.current, restQuatsRef.current, { jaw: jawRestPosRef.current ?? undefined }, mandibleSubset);

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

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rootRotation[0], rootRotation[1], rootRotation[2], "XYZ")),
    [rootRotation]
  );

  return (
    <group position={rootPosition}>
      <group quaternion={quaternion}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
