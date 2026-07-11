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

interface ArmSimState {
  appearance: Appearance;
  angles: Record<string, Record<string, number>>;
  selectedJoint: string | null;
  hoveredJoint: string | null;
  rootPosition: Vec3;
  rootRotation: Vec3;
  activePreset: string | null;
  stanceLeg: StanceLeg;
  setAppearance: (a: Appearance) => void;
  setAngle: (jointId: string, dofId: string, value: number) => void;
  selectJoint: (jointId: string | null) => void;
  hoverJoint: (jointId: string | null) => void;
  setStanceLeg: (leg: StanceLeg) => void;
  resetAll: () => void;
  applyPose: (angles: Record<string, Record<string, number>>, opts?: { rootPosition?: Vec3; rootRotation?: Vec3; presetId?: string }) => void;
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
  setAppearance: (a) => set({ appearance: a }),
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
    }),
  applyPose: (angles, opts) =>
    set((s) => ({
      angles: { ...neutralAngles(), ...angles },
      rootPosition: opts?.rootPosition ?? [0, 0, 0],
      rootRotation: opts?.rootRotation ?? [0, 0, 0],
      activePreset: opts?.presetId ?? null,
      selectedJoint: s.selectedJoint,
    })),
}));

if (typeof window !== "undefined") {
  (window as unknown as { __armSim: typeof useArmSimStore }).__armSim = useArmSimStore;
}
