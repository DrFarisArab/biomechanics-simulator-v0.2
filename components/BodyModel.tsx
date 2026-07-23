"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { recolorMaterials, JOINT_MARKER_COLORS as COLORS } from "@/lib/materials";
import { CONDYLE_OFFSET_LEFT_LOCAL, CONDYLE_OFFSET_RIGHT_LOCAL } from "@/lib/mandibleDofs";
import { getDracoLoader } from "@/lib/dracoLoader";
import { mergeGravityAngles } from "@/lib/gravityMode";
import { applyGravityMovement, gravityMovementStanceLeg } from "@/lib/gravityMovements";
import { ALL_RIG_BONE_NAMES, applyRigPose } from "@/lib/rigPose";
import { captureScapularCouplingRefs, type ScapularCouplingRefs } from "@/lib/scapularRhythm";

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

// Joints with no single bone origin of their own — the marker sits at the
// midpoint of two OTHER joints' bones instead. Forearm pronation/supination
// has no discrete joint center (the radius rotates over the ulna along the
// whole segment), so its marker goes at the visual middle of the forearm:
// halfway between the elbow (forearm bone's own head) and wrist (hand
// bone's own head).
const JOINT_MARKER_MIDPOINT: Record<string, [string, string]> = {
  forearm_left: ["forearmL", "handL"],
  forearm_right: ["forearmR", "handR"],
};

// The combined full-body GLB exports the visible muscle meshes slightly
// posterior to the skeleton inside the same armature. Measured from the
// baked GLB bounds: muscle center z ~= 0.012, skeleton center z ~= 0.037.
const FULL_BODY_MUSCLE_ALIGNMENT_Z = 0.025;

function alignFullBodyMuscleLayer(scene: THREE.Object3D) {
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.name.toLowerCase().includes("muscle")) return;
    mesh.position.z += FULL_BODY_MUSCLE_ALIGNMENT_Z;
    mesh.updateMatrix();
  });
}

function anatomyLabelFromMesh(object: THREE.Object3D) {
  const raw = object.name || object.parent?.name || "";
  const label = raw
    .trim()
    .replace(/\.\d+$/, "")
    .replace(/([A-Za-z])0+\d+$/, "$1")
    .replace(/\.([lr])$/i, (_, side: string) => ` (${side.toUpperCase()})`)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b([CTL])(\d{1,2})\s+\d+$/i, "$1$2")
    .trim();
  return label || null;
}

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
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setDRACOLoader(getDracoLoader());
  });
  const scene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene) as THREE.Object3D;
    if (modelUrl.includes("v2-body-full")) {
      alignFullBodyMuscleLayer(cloned);
    }
    recolorMaterials(cloned);
    return cloned;
  }, [gltf, modelUrl]);
  const bonesRef = useRef<Record<string, THREE.Object3D | undefined>>({});
  const restQuatsRef = useRef<Record<string, THREE.Quaternion | undefined>>({});
  // Pelvis's own rest LOCAL position, plus the stance hips' rest local
  // offsets FROM pelvis (i.e. thighL/thighR's own .position, since they're
  // direct children of pelvis in the loaded scene graph) — the inputs
  // computePelvisPivotOffset needs for the ground-contact stance pivot.
  const pelvisRestPosRef = useRef<THREE.Vector3 | null>(null);
  const hipLocalOffsetsRef = useRef<{ left?: THREE.Vector3; right?: THREE.Vector3 }>({});
  // Jaw's own rest LOCAL position (relative to its parent, `head`) — needed
  // because, unlike every other joint here, the TMJ's pivot itself
  // translates (see mandibleDofs.ts's applyMandiblePose), not just rotates.
  const jawRestPosRef = useRef<THREE.Vector3 | null>(null);
  const scapulaRestPosRef = useRef<{ left?: THREE.Vector3; right?: THREE.Vector3 }>({});
  const scapularCouplingRefsRef = useRef<ScapularCouplingRefs>({});
  const markerRefs = useRef<Record<string, THREE.Mesh | null>>({});
  const condyleMarkerRefs = useRef<{ left: THREE.Mesh | null; right: THREE.Mesh | null }>({ left: null, right: null });
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredBoneLabel, setHoveredBoneLabel] = useState<{ name: string; position: [number, number, number]; fontSize: number } | null>(null);

  const selectJoint = useArmSimStore((s) => s.selectJoint);
  const hoverJoint = useArmSimStore((s) => s.hoverJoint);
  const selectedJoint = useArmSimStore((s) => s.selectedJoint);
  const hoveredJoint = useArmSimStore((s) => s.hoveredJoint);
  const angles = useArmSimStore((s) => s.angles);
  const rootPosition = useArmSimStore((s) => s.rootPosition);
  const rootRotation = useArmSimStore((s) => s.rootRotation);
  const stanceLeg = useArmSimStore((s) => s.stanceLeg);
  const showJointMarkers = useArmSimStore((s) => s.showJointMarkers);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const gravityCompensation = useArmSimStore((s) => s.gravityCompensation);
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
  const showBoneHoverLabels = modelUrl.includes("v2-body-skeleton");

  const markerJoints = useMemo(() => {
    // Single clean skin (v2_body_rig, 41 joints, no name collisions) — every
    // bone name is unique, so a plain scene-wide lookup resolves correctly.
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
    scapulaRestPosRef.current = {
      left: found.scapulaL?.position.clone(),
      right: found.scapulaR?.position.clone(),
    };
    scapularCouplingRefsRef.current = captureScapularCouplingRefs(scene);
    if (typeof window !== "undefined") {
      (window as unknown as { __bodyScene: THREE.Object3D }).__bodyScene = scene;
    }
    const direct = Object.entries(JOINT_MARKER_BONE).map(([jointId, boneName]) => ({
      jointId,
      bone: found[boneName],
      bone2: undefined as THREE.Object3D | undefined,
    }));
    const midpoints = Object.entries(JOINT_MARKER_MIDPOINT)
      .map(([jointId, [boneA, boneB]]) => ({
        jointId,
        bone: found[boneA],
        bone2: found[boneB] as THREE.Object3D | undefined,
      }))
      .filter((m) => !!m.bone2);
    return [...direct, ...midpoints].filter(
      (m): m is { jointId: string; bone: THREE.Object3D; bone2: THREE.Object3D | undefined } => !!m.bone
    );
  }, [scene]);

  // Older/not-yet-re-exported GLBs may not have the `jaw` bone yet — guard
  // the condyle markers on its presence so this degrades gracefully rather
  // than rendering markers with nothing to follow.
  const hasJawBone = useMemo(() => !!scene.getObjectByName("jaw"), [scene]);

  // Under frameloop="demand" (see Scene.tsx) R3F only re-renders when it's
  // told to. Prop changes to the scene graph auto-invalidate, but the pose
  // below is applied by mutating bone quaternions IMPERATIVELY, which R3F
  // can't detect — so we invalidate() a couple of frames after each pose
  // change to actually paint it (and let the marker-tracking useFrame run).
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    applyRigPose(
      {
        bones: bonesRef.current,
        restQuats: restQuatsRef.current,
        pelvisRestPosition: pelvisRestPosRef.current,
        hipLocalOffsets: hipLocalOffsetsRef.current,
        jawRestPosition: jawRestPosRef.current,
        scapulaRestPositions: scapulaRestPosRef.current,
        scapularCouplingRefs: scapularCouplingRefsRef.current,
      },
      effectiveAngles,
      effectiveStanceLeg
    );

    // Paint the freshly-applied pose. Two frames: one for the bone update
    // above, and one so the marker-tracking useFrame (which reads the
    // resulting world positions) repaints the markers on top of it.
    invalidate(2);
  }, [effectiveAngles, effectiveStanceLeg, invalidate]);

  const tmpWorld = useMemo(() => new THREE.Vector3(), []);
  const tmpWorld2 = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    if (typeof window !== "undefined") (window as unknown as { __three?: unknown }).__three = state;
    const group = groupRef.current;
    if (!group) return;

    // Apply the gravity-solver's compensating root offset imperatively, read
    // fresh from the store every painted frame — NOT as a declarative JSX
    // `position` prop bound to the reactive `gravityRootOffset` hook value.
    // GravityConstraintLayer computes that offset in its OWN effect, which
    // fires one render after this component's own pose-applying effect (the
    // one above that calls applyRigPose): the reactive prop would render one
    // tick behind, i.e. it'd briefly show the new bend angle still paired
    // with the PREVIOUS tick's offset before snapping to the correct one.
    // During a continuous slider drag that shows up as visible jitter/shake,
    // most noticeably for "Bowing Forward" (gravityMovements.ts), whose
    // pinned-support offset is large (the whole trunk shifts back to keep
    // the feet planted). Reading getState() here instead means whatever
    // actually gets drawn is always the current solve result — same pattern
    // GravityConstraintLayer already uses for its own COM marker.
    const gravityState = useArmSimStore.getState();
    if (gravityState.gravityEnabled) {
      group.position.set(...gravityState.gravityRootOffset);
    } else if (group.position.x !== 0 || group.position.y !== 0 || group.position.z !== 0) {
      group.position.set(0, 0, 0);
    }

    for (const { jointId, bone, bone2 } of markerJoints) {
      const marker = markerRefs.current[jointId];
      if (!marker) continue;
      bone.getWorldPosition(tmpWorld);
      if (bone2) {
        bone2.getWorldPosition(tmpWorld2);
        tmpWorld.add(tmpWorld2).multiplyScalar(0.5);
      }
      group.worldToLocal(tmpWorld);
      marker.position.copy(tmpWorld);
    }

    // TMJ condyle markers — brief §9 wants "one marker per side," but both
    // sides drive the SAME single `mandible` control (§2), unlike every
    // other joint here where one marker maps to one bone. That doesn't fit
    // the generic jointId->single-marker map above, so these two are their
    // own small bespoke block instead of forcing a shared-architecture
    // refactor for one joint.
    const jawBone = bonesRef.current.jaw;
    if (jawBone) {
      for (const side of ["left", "right"] as const) {
        const marker = condyleMarkerRefs.current[side];
        if (!marker) continue;
        const offset = (side === "left" ? CONDYLE_OFFSET_LEFT_LOCAL : CONDYLE_OFFSET_RIGHT_LOCAL).clone();
        jawBone.localToWorld(offset);
        group.worldToLocal(offset);
        marker.position.copy(offset);
      }
    }
  });

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rootRotation[0], rootRotation[1], rootRotation[2], "XYZ")),
    [rootRotation]
  );

  const handleSkeletonPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!showBoneHoverLabels) return;
    const name = anatomyLabelFromMesh(event.object);
    if (!name) return;
    const localPoint = event.point.clone();
    groupRef.current?.worldToLocal(localPoint);
    setHoveredBoneLabel({
      name,
      position: [localPoint.x, localPoint.y + 0.035, localPoint.z],
      fontSize: Math.round(THREE.MathUtils.clamp(event.point.distanceTo(camera.position) * 2.4 + 4, 8, 11)),
    });
  };

  const handleSkeletonPointerOut = () => {
    if (!showBoneHoverLabels) return;
    setHoveredBoneLabel(null);
    document.body.style.cursor = "default";
  };

  return (
    <group position={rootPosition}>
      <group
        ref={groupRef}
        quaternion={quaternion}
        onPointerMove={handleSkeletonPointerMove}
        onPointerOut={handleSkeletonPointerOut}
      >
        <primitive object={scene} />
        {hoveredBoneLabel && (
          <Html position={hoveredBoneLabel.position} center occlude={false}>
            <div
              className="pointer-events-none whitespace-nowrap font-semibold text-ink-50 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              style={{ fontSize: `${hoveredBoneLabel.fontSize}px` }}
            >
              {hoveredBoneLabel.name}
            </div>
          </Html>
        )}
        {showJointMarkers && markerJoints.map(({ jointId }) => {
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
                // While the Record & Replay panel is open and still on its
                // joint-picker step (no clip started yet), clicking a
                // marker in the viewport is a second way to pick that joint
                // — same toggle the checkbox itself uses, so clicking twice
                // un-picks it. Read via getState() (not a hook) so this
                // component doesn't re-render on every record/replay
                // state change it has no other reason to care about.
                const rr = useRecordReplayStore.getState();
                if (rr.panelOpen && !rr.clip) rr.toggleJoint(jointId);
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
        {showJointMarkers && hasJawBone && (["left", "right"] as const).map((side) => {
          const jointId = "mandible";
          const isSelected = selectedJoint === jointId;
          const isHovered = hoveredJoint === jointId;
          const color = isSelected ? COLORS.jointSelected : isHovered ? COLORS.jointHover : COLORS.joint;
          return (
            <mesh
              key={`mandible_${side}`}
              ref={(el) => {
                condyleMarkerRefs.current[side] = el;
              }}
              onClick={(e) => {
                e.stopPropagation();
                selectJoint(jointId);
                const rr = useRecordReplayStore.getState();
                if (rr.panelOpen && !rr.clip) rr.toggleJoint(jointId);
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
