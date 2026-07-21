"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore } from "@/lib/store";
import { getDracoLoader } from "@/lib/dracoLoader";
import { mergeGravityAngles } from "@/lib/gravityMode";
import { applyGravityMovement, gravityMovementStanceLeg } from "@/lib/gravityMovements";
import { ALL_RIG_BONE_NAMES, applyRigPose } from "@/lib/rigPose";

const RIG_MODEL_URL = "/models/v2-body-skeleton.glb";
const Y_AXIS = new THREE.Vector3(0, 1, 0);

type Anchor = {
  bone: string;
  local?: [number, number, number];
};

type SkinSegmentSpec = {
  id: string;
  from: Anchor;
  to: Anchor;
  radius: number;
  tone?: "core" | "limb";
  feature?: "head" | "hand" | "foot";
};

const SKIN_SEGMENTS: SkinSegmentSpec[] = [
  { id: "pelvis_lumbar", from: { bone: "pelvis" }, to: { bone: "lumbar_v0" }, radius: 0.085, tone: "core" },
  { id: "lumbar", from: { bone: "lumbar_v0" }, to: { bone: "thoracic_v0" }, radius: 0.09, tone: "core" },
  { id: "thorax", from: { bone: "thoracic_v0" }, to: { bone: "thoracic_v11" }, radius: 0.125, tone: "core" },
  { id: "shoulder_girdle", from: { bone: "upper_armL" }, to: { bone: "upper_armR" }, radius: 0.07, tone: "core" },
  { id: "neck", from: { bone: "cervical_v0" }, to: { bone: "head" }, radius: 0.045, tone: "core" },
  { id: "head", from: { bone: "head" }, to: { bone: "head", local: [0, 0.18, 0] }, radius: 0.075, feature: "head" },
  { id: "pelvis_width", from: { bone: "thighL" }, to: { bone: "thighR" }, radius: 0.085, tone: "core" },
  { id: "upper_arm_left", from: { bone: "upper_armL" }, to: { bone: "forearmL" }, radius: 0.045 },
  { id: "forearm_left", from: { bone: "forearmL" }, to: { bone: "handL" }, radius: 0.032 },
  { id: "hand_left", from: { bone: "handL" }, to: { bone: "handL", local: [0, 0.18, 0] }, radius: 0.029, feature: "hand" },
  { id: "upper_arm_right", from: { bone: "upper_armR" }, to: { bone: "forearmR" }, radius: 0.045 },
  { id: "forearm_right", from: { bone: "forearmR" }, to: { bone: "handR" }, radius: 0.032 },
  { id: "hand_right", from: { bone: "handR" }, to: { bone: "handR", local: [0, 0.18, 0] }, radius: 0.029, feature: "hand" },
  { id: "thigh_left", from: { bone: "thighL" }, to: { bone: "shinL" }, radius: 0.062 },
  { id: "shin_left", from: { bone: "shinL" }, to: { bone: "footL" }, radius: 0.043 },
  { id: "foot_left", from: { bone: "footL" }, to: { bone: "footL", local: [0, 0.23, 0] }, radius: 0.035, feature: "foot" },
  { id: "thigh_right", from: { bone: "thighR" }, to: { bone: "shinR" }, radius: 0.062 },
  { id: "shin_right", from: { bone: "shinR" }, to: { bone: "footR" }, radius: 0.043 },
  { id: "foot_right", from: { bone: "footR" }, to: { bone: "footR", local: [0, 0.23, 0] }, radius: 0.035, feature: "foot" },
];

function featureScale(feature: SkinSegmentSpec["feature"], radius: number, length: number) {
  switch (feature) {
    case "head":
      return [radius * 1.32, length * 0.78, radius * 1.12] as const;
    case "hand":
      return [radius * 1.45, length * 0.7, radius * 0.8] as const;
    case "foot":
      return [radius * 1.75, length * 0.58, radius * 0.92] as const;
    default:
      return null;
  }
}

function resolveAnchor(
  anchor: Anchor,
  bones: Record<string, THREE.Object3D | undefined>,
  target: THREE.Vector3
) {
  const bone = bones[anchor.bone];
  if (!bone) return false;
  if (anchor.local) {
    target.set(anchor.local[0], anchor.local[1], anchor.local[2]);
    bone.localToWorld(target);
  } else {
    bone.getWorldPosition(target);
  }
  return true;
}

/**
 * Procedural translucent "tight skin" for the skeleton view.
 *
 * The previous skin toggle loaded a separate skinned shell GLB. Even though
 * it used the same pose functions, the exported shell geometry did not line
 * up well with the visible skeleton. This overlay instead reads the live
 * posed rig and draws simple capsule-like bands between anatomical joint
 * anchors, so the reference cover always follows the moving skeleton.
 */
export function SkinOverlay() {
  const gltf = useLoader(GLTFLoader, RIG_MODEL_URL, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });
  const scene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.visible = false;
    });
    return cloned;
  }, [gltf]);

  const groupRef = useRef<THREE.Group>(null);
  const cylinderRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const outlineRefs = useRef<Record<string, THREE.LineSegments | null>>({});
  const startCapRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const endCapRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const featureRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const bonesRef = useRef<Record<string, THREE.Object3D | undefined>>({});
  const restQuatsRef = useRef<Record<string, THREE.Quaternion | undefined>>({});
  const pelvisRestPosRef = useRef<THREE.Vector3 | null>(null);
  const hipLocalOffsetsRef = useRef<{ left?: THREE.Vector3; right?: THREE.Vector3 }>({});
  const jawRestPosRef = useRef<THREE.Vector3 | null>(null);

  const angles = useArmSimStore((s) => s.angles);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const gravityCompensation = useArmSimStore((s) => s.gravityCompensation);
  const gravityRootOffset = useArmSimStore((s) => s.gravityRootOffset);
  const gravityMovement = useArmSimStore((s) => s.gravityMovement);
  const movementAngles = useMemo(
    () => (gravityEnabled ? applyGravityMovement(angles, gravityMovement) : angles),
    [angles, gravityEnabled, gravityMovement]
  );
  const effectiveAngles = useMemo(
    () => (gravityEnabled ? mergeGravityAngles(movementAngles, gravityCompensation) : angles),
    [angles, gravityCompensation, gravityEnabled, movementAngles]
  );
  const effectiveStanceLeg = gravityEnabled ? gravityMovementStanceLeg(gravityMovement) ?? stanceLeg : stanceLeg;
  const invalidate = useThree((s) => s.invalidate);

  useMemo(() => {
    const found: Record<string, THREE.Object3D | undefined> = {};
    for (const name of ALL_RIG_BONE_NAMES) {
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
    applyRigPose(
      {
        bones: bonesRef.current,
        restQuats: restQuatsRef.current,
        pelvisRestPosition: pelvisRestPosRef.current,
        hipLocalOffsets: hipLocalOffsetsRef.current,
        jawRestPosition: jawRestPosRef.current,
      },
      effectiveAngles,
      effectiveStanceLeg
    );

    invalidate(2);
  }, [effectiveAngles, effectiveStanceLeg, invalidate]);

  const startWorld = useMemo(() => new THREE.Vector3(), []);
  const endWorld = useMemo(() => new THREE.Vector3(), []);
  const startLocal = useMemo(() => new THREE.Vector3(), []);
  const endLocal = useMemo(() => new THREE.Vector3(), []);
  const midLocal = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    scene.updateMatrixWorld(true);
    group.updateMatrixWorld(true);

    for (const segment of SKIN_SEGMENTS) {
      const cylinder = cylinderRefs.current[segment.id];
      const outline = outlineRefs.current[segment.id];
      const startCap = startCapRefs.current[segment.id];
      const endCap = endCapRefs.current[segment.id];
      const feature = featureRefs.current[segment.id];
      if (!cylinder || !outline || !startCap || !endCap) continue;
      const hasStart = resolveAnchor(segment.from, bonesRef.current, startWorld);
      const hasEnd = resolveAnchor(segment.to, bonesRef.current, endWorld);
      if (!hasStart || !hasEnd) {
        cylinder.visible = false;
        outline.visible = false;
        startCap.visible = false;
        endCap.visible = false;
        if (feature) feature.visible = false;
        continue;
      }

      startLocal.copy(startWorld);
      endLocal.copy(endWorld);
      group.worldToLocal(startLocal);
      group.worldToLocal(endLocal);
      direction.copy(endLocal).sub(startLocal);
      const length = direction.length();
      if (length < 0.001) continue;

      midLocal.copy(startLocal).add(endLocal).multiplyScalar(0.5);
      quat.setFromUnitVectors(Y_AXIS, direction.normalize());
      cylinder.visible = true;
      outline.visible = true;
      startCap.visible = true;
      endCap.visible = true;
      cylinder.position.copy(midLocal);
      cylinder.quaternion.copy(quat);
      cylinder.scale.set(segment.radius, length, segment.radius);
      outline.position.copy(midLocal);
      outline.quaternion.copy(quat);
      outline.scale.set(segment.radius * 1.01, length * 1.01, segment.radius * 1.01);
      startCap.position.copy(startLocal);
      endCap.position.copy(endLocal);
      startCap.scale.setScalar(segment.radius);
      endCap.scale.setScalar(segment.radius);

      const scale = featureScale(segment.feature, segment.radius, length);
      if (feature && scale) {
        feature.visible = true;
        feature.position.copy(midLocal);
        feature.quaternion.copy(quat);
        feature.scale.set(...scale);
      }
    }
  });

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rootRotation[0], rootRotation[1], rootRotation[2], "XYZ")),
    [rootRotation]
  );

  const coreMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8b7a2",
        transparent: true,
        opacity: 0.12,
        roughness: 0.82,
        metalness: 0,
        depthWrite: false,
      }),
    []
  );

  const limbMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8b7a2",
        transparent: true,
        opacity: 0.22,
        roughness: 0.78,
        metalness: 0,
        depthWrite: false,
      }),
    []
  );

  const featureMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#dfc4b1",
        transparent: true,
        opacity: 0.34,
        roughness: 0.74,
        metalness: 0,
        depthWrite: false,
      }),
    []
  );

  const outlineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: "#a8ced5", transparent: true, opacity: 0.46, depthWrite: false }),
    []
  );

  return (
    <group position={rootPosition}>
      <group ref={groupRef} quaternion={quaternion} position={gravityEnabled ? gravityRootOffset : [0, 0, 0]}>
        <primitive object={scene} />
        {SKIN_SEGMENTS.map((segment) => {
          const fillMaterial = segment.feature ? featureMaterial : segment.tone === "core" ? coreMaterial : limbMaterial;
          return (
            <group key={segment.id}>
            <mesh
              ref={(el) => {
                cylinderRefs.current[segment.id] = el;
              }}
              material={fillMaterial}
              renderOrder={-1}
            >
              <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
            </mesh>
            <lineSegments
              ref={(el) => {
                outlineRefs.current[segment.id] = el;
              }}
              material={outlineMaterial}
              renderOrder={0}
            >
              <edgesGeometry args={[new THREE.CylinderGeometry(1, 1, 1, 8, 1, true)]} />
            </lineSegments>
            <mesh
              ref={(el) => {
                startCapRefs.current[segment.id] = el;
              }}
              material={fillMaterial}
              renderOrder={-1}
            >
              <sphereGeometry args={[1, 18, 12]} />
            </mesh>
            <mesh
              ref={(el) => {
                endCapRefs.current[segment.id] = el;
              }}
              material={fillMaterial}
              renderOrder={-1}
            >
              <sphereGeometry args={[1, 18, 12]} />
            </mesh>
            {segment.feature && (
              <mesh
                ref={(el) => {
                  featureRefs.current[segment.id] = el;
                }}
                material={featureMaterial}
                renderOrder={-1}
              >
                <sphereGeometry args={[1, 20, 14]} />
              </mesh>
            )}
          </group>
          );
        })}
      </group>
    </group>
  );
}
