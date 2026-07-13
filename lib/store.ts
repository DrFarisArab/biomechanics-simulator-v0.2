import { create } from "zustand";
import { ARM_JOINT_DOFS } from "./armDofs";
import { TRUNK_JOINT_DOFS } from "./trunkDofs";
import { LEG_JOINT_DOFS } from "./legDofs";
import type { StanceLeg } from "./stanceMode";

export const JOINT_IDS = Object.keys(ARM_JOINT_DOFS);
export const TRUNK_IDS = Object.keys(TRUNK_JOINT_DOFS);
export const LEG_IDS = Object.keys(LEG_JOINT_DOFS);

const ALL_DOF_TABLES = [ARM_JOINT_DOFS, TRUNK_JOINT_DOFS, LEG_JOINT_DOFS];

function neutralAngles(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const dofs of ALL_DOF_TABLES) {
    for (const [jointId, jointDofs] of Object.entries(dofs)) {
      out[jointId] = {};
      for (const dofId of Object.keys(jointDofs)) out[jointId][dofId] = 0;
    }
  }
  return out;
}

export type Appearance = "skeleton" | "muscles";
export type Vec3 = [number, number, number];
export type Furniture = "none" | "chair" | "bed";

interface ArmSimState {
  appearance: Appearance;
  angles: Record<string, Record<string, number>>;
  selectedJoint: string | null;
  hoveredJoint: string | null;
  rootPosition: Vec3;
  rootRotation: Vec3;
  activePreset: string | null;
  stanceLeg: StanceLeg;
  furniture: Furniture;
  furnitureRotation: number;
  specialTestsOpen: boolean;
  showSkin: boolean;
  setAppearance: (a: Appearance) => void;
  setAngle: (jointId: string, dofId: string, value: number) => void;
  selectJoint: (jointId: string | null) => void;
  hoverJoint: (jointId: string | null) => void;
  setStanceLeg: (leg: StanceLeg) => void;
  setSpecialTestsOpen: (open: boolean) => void;
  setShowSkin: (show: boolean) => void;
  resetAll: () => void;
  applyPose: (
    angles: Record<string, Record<string, number>>,
    opts?: {
      rootPosition?: Vec3;
      rootRotation?: Vec3;
      presetId?: string;
      furniture?: Furniture;
      furnitureRotation?: number;
      stanceLeg?: StanceLeg;
    }
  ) => void;
}

export const useArmSimStore = create<ArmSimState>((set) => ({
  appearance: "skeleton",
  angles: neutralAngles(),
  selectedJoint: null,
  hoveredJoint: null,
  rootPosition: [0, 0, 0],
  rootRotation: [0, 0, 0],
  activePreset: null,
  stanceLeg: "none",
  furniture: "none",
  furnitureRotation: 0,
  specialTestsOpen: false,
  showSkin: false,
  setAppearance: (a) => set({ appearance: a }),
  setSpecialTestsOpen: (open) => set({ specialTestsOpen: open }),
  setShowSkin: (show) => set({ showSkin: show }),
  setAngle: (jointId, dofId, value) =>
    set((s) => ({
      angles: {
        ...s.angles,
        [jointId]: { ...s.angles[jointId], [dofId]: value },
      },
      activePreset: null,
    })),
  selectJoint: (jointId) => set({ selectedJoint: jointId }),
  hoverJoint: (jointId) => set({ hoveredJoint: jointId }),
  setStanceLeg: (leg) => set({ stanceLeg: leg }),
  resetAll: () =>
    set({
      angles: neutralAngles(),
      selectedJoint: null,
      rootPosition: [0, 0, 0],
      rootRotation: [0, 0, 0],
      activePreset: null,
      stanceLeg: "none",
      furniture: "none",
      furnitureRotation: 0,
    }),
  applyPose: (angles, opts) =>
    set((s) => ({
      angles: { ...neutralAngles(), ...angles },
      rootPosition: opts?.rootPosition ?? [0, 0, 0],
      rootRotation: opts?.rootRotation ?? [0, 0, 0],
      activePreset: opts?.presetId ?? null,
      furniture: opts?.furniture ?? "none",
      furnitureRotation: opts?.furnitureRotation ?? 0,
      stanceLeg: opts?.stanceLeg ?? "none",
      selectedJoint: s.selectedJoint,
    })),
}));

if (typeof window !== "undefined") {
  (window as unknown as { __armSim: typeof useArmSimStore }).__armSim = useArmSimStore;
}
