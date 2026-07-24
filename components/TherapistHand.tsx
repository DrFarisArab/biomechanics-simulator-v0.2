"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useArmSimStore } from "@/lib/store";
import { useHandPlacementStore } from "@/lib/handPlacementStore";
import { useHandEditorStore } from "@/lib/handEditorStore";
import {
  DEFAULT_HAND_SCALE,
  MAX_CONTACT_HANDS,
  TEST_HAND_CONTACTS,
  type HandContact,
} from "@/lib/handContacts";

// Generic examiner hands illustrating a Special Test's manual contact. Two
// render paths share one hand mesh (public/models/therapist-hand.glb):
//
//  • DISPLAY — bone-anchored hands for the active test, sourced (in priority)
//    from the user's saved placement, else the shipped registry. Each hand
//    copies its target bone's world transform every frame and applies a
//    bone-local calibration; a "left" hand is the mesh mirrored across X.
//
//  • EDIT — while the placement editor is open for a test, the hands become
//    free world-space objects driven by a drag gizmo (see HandEditor); the
//    display path is suppressed for that test to avoid duplicates.

const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();

const HAND_COLOR = "#c68863";

function buildHandMaterial() {
  return new THREE.MeshStandardMaterial({
    color: HAND_COLOR,
    roughness: 0.75,
    metalness: 0.0,
    // Mirrored (left) instances invert winding; DoubleSide avoids backface
    // culling. Cheap for one prop mesh.
    side: THREE.DoubleSide,
  });
}

function cloneHand(scene: THREE.Object3D) {
  const cloned = scene.clone(true);
  const mat = buildHandMaterial();
  cloned.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.material = mat;
  });
  return cloned;
}

// Pressure-direction arrow: shaft + head pointing +Y with the tail at the
// origin (so it pivots about the contact point and the head shows the force
// direction). Built at ~18 units so it shares the hand's scale convention
// (DEFAULT_HAND_SCALE ≈ a ~0.17 m arrow). Bright orange to read as a force
// vector, distinct from the skin-tone hands and the teal joint markers.
const ARROW_COLOR = "#f97316";

function buildArrow() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: ARROW_COLOR,
    emissive: ARROW_COLOR,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.0,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 13, 16), mat);
  shaft.position.y = 6.5;
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5, 20), mat);
  head.position.y = 15.5;
  group.add(shaft, head);
  return group;
}

// --- Display (bone-anchored) --------------------------------------------

function DisplaySlot({ gltf, slot }: { gltf: { scene: THREE.Object3D }; slot: number }) {
  const handScene = useMemo(() => cloneHand(gltf.scene), [gltf]);
  const arrowScene = useMemo(() => buildArrow(), []);
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const handRef = useRef<THREE.Group>(null);
  const arrowRef = useRef<THREE.Group>(null);
  const boneRef = useRef<THREE.Object3D | null>(null);
  const boneNameRef = useRef<string | null>(null);
  const sceneRef = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const st = useArmSimStore.getState();
    const testId = st.activeSpecialTestId;
    const editing = useHandEditorStore.getState().editingTestId;
    // Suppress the display path for the test currently being edited.
    const contacts: HandContact[] =
      !testId || editing === testId
        ? []
        : useHandPlacementStore.getState().placements[testId]?.hands ??
          TEST_HAND_CONTACTS[testId] ??
          [];
    const contact = contacts[slot];
    if (!contact) {
      if (outer.visible) outer.visible = false;
      return;
    }

    const bodyScene = (window as unknown as { __bodyScene?: THREE.Object3D }).__bodyScene ?? null;
    if (!boneRef.current || bodyScene !== sceneRef.current || boneNameRef.current !== contact.bone) {
      boneRef.current = bodyScene?.getObjectByName(contact.bone) ?? null;
      boneNameRef.current = contact.bone;
      sceneRef.current = bodyScene;
    }
    const bone = boneRef.current;
    if (!bone) {
      if (outer.visible) outer.visible = false;
      return;
    }

    bone.getWorldPosition(_worldPos);
    bone.getWorldQuaternion(_worldQuat);
    outer.position.copy(_worldPos);
    outer.quaternion.copy(_worldQuat);

    const scale = contact.scale ?? DEFAULT_HAND_SCALE;
    const isArrow = contact.kind === "arrow";
    inner.position.set(contact.offset[0], contact.offset[1], contact.offset[2]);
    inner.rotation.set(contact.euler[0], contact.euler[1], contact.euler[2]);
    // Arrows aren't handed, so never mirror them.
    inner.scale.set(!isArrow && contact.side === "left" ? -scale : scale, scale, scale);
    if (handRef.current) handRef.current.visible = !isArrow;
    if (arrowRef.current) arrowRef.current.visible = isArrow;

    if (!outer.visible) outer.visible = true;
  });

  return (
    <group ref={outerRef} visible={false}>
      <group ref={innerRef}>
        <group ref={handRef}>
          <primitive object={handScene} />
        </group>
        <group ref={arrowRef} visible={false}>
          <primitive object={arrowScene} />
        </group>
      </group>
    </group>
  );
}

// --- Edit (free world-space + gizmo) ------------------------------------

function DraftItemMesh({
  gltf,
  kind,
  side,
}: {
  gltf: { scene: THREE.Object3D };
  kind: "hand" | "arrow";
  side: "left" | "right";
}) {
  const handScene = useMemo(() => cloneHand(gltf.scene), [gltf]);
  const arrowScene = useMemo(() => buildArrow(), []);
  if (kind === "arrow") {
    return <primitive object={arrowScene} />;
  }
  return (
    <group scale={side === "left" ? [-1, 1, 1] : [1, 1, 1]}>
      <primitive object={handScene} />
    </group>
  );
}

function HandEditor({ gltf }: { gltf: { scene: THREE.Object3D } }) {
  const draft = useHandEditorStore((s) => s.draft);
  const selectedId = useHandEditorStore((s) => s.selectedId);
  const mode = useHandEditorStore((s) => s.mode);
  const select = useHandEditorStore((s) => s.select);
  const updateHand = useHandEditorStore((s) => s.updateHand);
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});
  // The gizmo target is resolved in an effect (not during render) so the group
  // ref is populated by the time TransformControls tries to attach — otherwise
  // it reads null on the render that adds a hand and never mounts.
  const [selectedObj, setSelectedObj] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    setSelectedObj(selectedId ? groupRefs.current[selectedId] ?? null : null);
  }, [selectedId, draft]);

  const commitSelected = () => {
    if (!selectedId) return;
    const g = groupRefs.current[selectedId];
    if (!g) return;
    updateHand(selectedId, {
      pos: [g.position.x, g.position.y, g.position.z],
      euler: [g.rotation.x, g.rotation.y, g.rotation.z],
      scale: g.scale.x,
    });
  };

  return (
    <>
      {draft.map((h) => (
        <group
          key={h.id}
          ref={(el) => {
            groupRefs.current[h.id] = el;
          }}
          position={h.pos}
          rotation={h.euler}
          scale={h.scale}
          onClick={(e) => {
            e.stopPropagation();
            select(h.id);
          }}
        >
          <DraftItemMesh gltf={gltf} kind={h.kind} side={h.side} />
        </group>
      ))}
      {selectedObj && (
        <TransformControls object={selectedObj} mode={mode} onMouseUp={commitSelected} />
      )}
    </>
  );
}

export function TherapistHand() {
  const gltf = useLoader(GLTFLoader, "/models/therapist-hand.glb");
  const editingTestId = useHandEditorStore((s) => s.editingTestId);

  return (
    <>
      {Array.from({ length: MAX_CONTACT_HANDS }).map((_, i) => (
        <DisplaySlot key={i} gltf={gltf} slot={i} />
      ))}
      {editingTestId && <HandEditor gltf={gltf} />}
    </>
  );
}
