import * as THREE from "three";
import { applyArmPose, ARM_BONE_NAMES } from "./armDofs";
import { applyTrunkPose, TRUNK_BONE_NAMES } from "./trunkDofs";
import { applyLegPose, LEG_BONE_NAMES } from "./legDofs";
import { applyMandiblePose, MANDIBLE_BONE_NAMES } from "./mandibleDofs";
import { applyScapularRhythm, type ScapularCouplingRefs } from "./scapularRhythm";
import { computePelvisPivotOffset, stanceLegRotationCorrection, type StanceLeg } from "./stanceMode";
import { lumbopelvicTiltDeg } from "./lumbopelvicRhythm";

export const ALL_RIG_BONE_NAMES = Array.from(
  new Set([...ARM_BONE_NAMES, ...TRUNK_BONE_NAMES, ...LEG_BONE_NAMES, ...MANDIBLE_BONE_NAMES, "head", "scapulaL", "scapulaR"])
);

export type RigPoseRefs = {
  bones: Record<string, THREE.Object3D | undefined>;
  restQuats: Record<string, THREE.Quaternion | undefined>;
  pelvisRestPosition: THREE.Vector3 | null;
  hipLocalOffsets: { left?: THREE.Vector3; right?: THREE.Vector3 };
  jawRestPosition: THREE.Vector3 | null;
  scapulaRestPositions?: { left?: THREE.Vector3; right?: THREE.Vector3 };
  scapularCouplingRefs?: ScapularCouplingRefs;
};

export function applyRigPose(
  pose: RigPoseRefs,
  angles: Record<string, Record<string, number>>,
  stanceLeg: StanceLeg
) {
  applyArmPose(pose.bones, pose.restQuats, angles);
  applyTrunkPose(pose.bones, pose.restQuats, angles);
  applyLegPose(pose.bones, pose.restQuats, angles);
  applyMandiblePose(pose.bones, pose.restQuats, { jaw: pose.jawRestPosition ?? undefined }, angles);

  if (stanceLeg !== "none") {
    const effectiveTilt = (angles.pelvis?.tilt ?? 0) + lumbopelvicTiltDeg(angles.lumbar?.flexExt ?? 0);
    const rotationDeg = angles.pelvis?.rotation ?? 0;
    const obliquityDeg = angles.pelvis?.obliquity ?? 0;
    for (const side of ["left", "right"] as const) {
      const bone = pose.bones[side === "left" ? "thighL" : "thighR"];
      if (!bone) continue;
      bone.quaternion.premultiply(
        stanceLegRotationCorrection(side, stanceLeg, effectiveTilt, rotationDeg, obliquityDeg)
      );
    }
  }

  applyScapularRhythm(
    pose.bones,
    pose.restQuats,
    angles,
    pose.scapulaRestPositions,
    pose.scapularCouplingRefs
  );

  const pelvis = pose.bones.pelvis;
  if (pelvis && pose.pelvisRestPosition) {
    pelvis.position.copy(
      computePelvisPivotOffset(
        stanceLeg,
        pose.pelvisRestPosition,
        pose.hipLocalOffsets,
        angles.pelvis?.obliquity ?? 0
      )
    );
  }
}
