import { create } from "zustand";
import { ARM_JOINT_DOFS } from "./armDofs";

export const JOINT_IDS = Object.keys(ARM_JOINT_DOFS);

function neutralAngles(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [jointId, dofs] of Object.entries(ARM_JOINT_DOFS)) {
    out[jointId] = {};
    for (const dofId of Object.keys(dofs)) out[jointId][dofId] = 0;
  }
  return out;
}

interface ArmSimState {
  angles: Record<string, Record<string, number>>;
  selectedJoint: string | null;
  hoveredJoint: string | null;
  setAngle: (jointId: string, dofId: string, value: number) => void;
  selectJoint: (jointId: string | null) => void;
  hoverJoint: (jointId: string | null) => void;
  resetAll: () => void;
}

export const useArmSimStore = create<ArmSimState>((set) => ({
  angles: neutralAngles(),
  selectedJoint: null,
  hoveredJoint: null,
  setAngle: (jointId, dofId, value) =>
    set((s) => ({
      angles: {
        ...s.angles,
        [jointId]: { ...s.angles[jointId], [dofId]: value },
      },
    })),
  selectJoint: (jointId) => set({ selectedJoint: jointId }),
  hoverJoint: (jointId) => set({ hoveredJoint: jointId }),
  resetAll: () => set({ angles: neutralAngles(), selectedJoint: null }),
}));

if (typeof window !== "undefined") {
  (window as unknown as { __armSim: typeof useArmSimStore }).__armSim = useArmSimStore;
}
