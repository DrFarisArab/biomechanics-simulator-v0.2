import { create } from "zustand";
import { ARM_JOINT_DOFS } from "./armDofs";
import { TRUNK_JOINT_DOFS } from "./trunkDofs";
import { LEG_JOINT_DOFS } from "./legDofs";
import { MANDIBLE_JOINT_DOFS } from "./mandibleDofs";
import type { StanceLeg } from "./stanceMode";
import {
  DEFAULT_GRAVITY_MOVEMENT,
  type GravityMovementId,
  type GravityMovementSide,
  type GravityMovementState,
} from "./gravityMovements";

export const JOINT_IDS = Object.keys(ARM_JOINT_DOFS);
export const TRUNK_IDS = Object.keys(TRUNK_JOINT_DOFS);
export const LEG_IDS = Object.keys(LEG_JOINT_DOFS);
export const MANDIBLE_IDS = Object.keys(MANDIBLE_JOINT_DOFS);

const ALL_DOF_TABLES = [ARM_JOINT_DOFS, TRUNK_JOINT_DOFS, LEG_JOINT_DOFS, MANDIBLE_JOINT_DOFS];

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
  gravitySupportProfileId: string;
  stanceLeg: StanceLeg;
  furniture: Furniture;
  furnitureRotation: number;
  specialTestsOpen: boolean;
  showSkin: boolean;
  showJointMarkers: boolean;
  showCommandBox: boolean;
  gravityEnabled: boolean;
  gravityCompensation: Record<string, Record<string, number>>;
  gravityRootOffsetY: number;
  gravityRootOffset: Vec3;
  gravityMovement: GravityMovementState;
  lastEdited: { jointId: string; dofId: string } | null;
  setAppearance: (a: Appearance) => void;
  setAngle: (jointId: string, dofId: string, value: number) => void;
  patchAngles: (partial: Record<string, Record<string, number>>) => void;
  selectJoint: (jointId: string | null) => void;
  hoverJoint: (jointId: string | null) => void;
  setStanceLeg: (leg: StanceLeg) => void;
  setSpecialTestsOpen: (open: boolean) => void;
  setShowSkin: (show: boolean) => void;
  setShowJointMarkers: (show: boolean) => void;
  setShowCommandBox: (show: boolean) => void;
  setGravityEnabled: (enabled: boolean) => void;
  setGravityMovement: (id: GravityMovementId) => void;
  setGravityMovementAmount: (amount: number) => void;
  setGravityMovementSide: (side: GravityMovementSide) => void;
  resetGravityMovement: () => void;
  setGravitySolution: (solution: { compensation: Record<string, Record<string, number>>; rootOffsetY: number; rootOffset?: Vec3 }) => void;
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
      supportProfileId?: string;
    }
  ) => void;
}

// Dragging the "movement knob" slider for a gravity-enabled closed-chain
// movement (Sidebar.tsx, RecordReplayPanel.tsx) fires a native <input
// type="range"> change event per pixel of pointer movement — a fast drag
// easily produces far more of these than the display can paint. Each one
// drives a genuinely expensive pipeline (GravityConstraintLayer's balance
// solve on an invisible clone skeleton, THEN BodyModel re-posing the entire
// visible rig — every bone, not just the ones bending), so applying every
// single raw event caused real dropped/backed-up frames during a drag,
// which read as jitter/shake — independent of (and in addition to) the
// render-order staleness BodyModel.tsx's group-offset fix addressed.
// Coalescing to one store update per animation frame (always the LATEST
// value — nothing is lost except intermediate values a fast drag was never
// going to let the user see anyway) caps the expensive work at the
// display's own paint cadence.
let pendingGravityAmount: number | null = null;
let gravityAmountRafId: number | null = null;

// Cancels any in-flight coalesced amount update — needed wherever `amount`
// gets reset to 0 through a DIFFERENT `set()` call (enabling/switching/
// resetting a movement) so a drag's last queued frame can't fire moments
// later and silently re-apply the pre-reset value.
function cancelPendingGravityAmount() {
  pendingGravityAmount = null;
  if (gravityAmountRafId !== null) {
    cancelAnimationFrame(gravityAmountRafId);
    gravityAmountRafId = null;
  }
}

export const useArmSimStore = create<ArmSimState>((set) => ({
  appearance: "skeleton",
  angles: neutralAngles(),
  selectedJoint: null,
  hoveredJoint: null,
  rootPosition: [0, 0, 0],
  rootRotation: [0, 0, 0],
  activePreset: null,
  gravitySupportProfileId: "standing",
  stanceLeg: "none",
  furniture: "none",
  furnitureRotation: 0,
  specialTestsOpen: false,
  showSkin: false,
  showJointMarkers: true,
  // Collapsed by default on app start for maximum viewport — see app/page.tsx.
  showCommandBox: false,
  gravityEnabled: false,
  gravityCompensation: {},
  gravityRootOffsetY: 0,
  gravityRootOffset: [0, 0, 0],
  gravityMovement: DEFAULT_GRAVITY_MOVEMENT,
  lastEdited: null,
  // Skin overlay is a translucent reference layer meant to sit over the bare
  // skeleton — over the muscles model it just looks wrong (fights with the
  // muscle geometry it's supposed to be layered outside of), so switching to
  // muscles forces it off rather than leaving a stale, mismatched overlay on.
  setAppearance: (a) => set((s) => ({ appearance: a, showSkin: a === "muscles" ? false : s.showSkin })),
  setSpecialTestsOpen: (open) => set({ specialTestsOpen: open }),
  setShowSkin: (show) => set({ showSkin: show }),
  setShowJointMarkers: (show) => set({ showJointMarkers: show }),
  setShowCommandBox: (show) => set({ showCommandBox: show }),
  setGravityEnabled: (enabled) => {
    cancelPendingGravityAmount();
    set({
      gravityEnabled: enabled,
      gravityCompensation: {},
      gravityRootOffsetY: 0,
      gravityRootOffset: [0, 0, 0],
      gravityMovement: DEFAULT_GRAVITY_MOVEMENT,
    });
  },
  setGravityMovement: (id) => {
    cancelPendingGravityAmount();
    set((s) => ({
      gravityMovement: { ...s.gravityMovement, id, amount: 0 },
      gravityCompensation: {},
      gravityRootOffsetY: 0,
      gravityRootOffset: [0, 0, 0],
    }));
  },
  setGravityMovementAmount: (amount) => {
    pendingGravityAmount = amount;
    if (gravityAmountRafId !== null) return;
    gravityAmountRafId = requestAnimationFrame(() => {
      gravityAmountRafId = null;
      if (pendingGravityAmount === null) return;
      const next = pendingGravityAmount;
      pendingGravityAmount = null;
      set((s) => ({ gravityMovement: { ...s.gravityMovement, amount: next } }));
    });
  },
  setGravityMovementSide: (side) =>
    set((s) => ({
      gravityMovement: { ...s.gravityMovement, side },
      gravityCompensation: {},
      gravityRootOffsetY: 0,
      gravityRootOffset: [0, 0, 0],
    })),
  resetGravityMovement: () => {
    cancelPendingGravityAmount();
    set({
      gravityMovement: DEFAULT_GRAVITY_MOVEMENT,
      gravityCompensation: {},
      gravityRootOffsetY: 0,
      gravityRootOffset: [0, 0, 0],
    });
  },
  setGravitySolution: (solution) =>
    set({
      gravityCompensation: solution.compensation,
      gravityRootOffsetY: solution.rootOffsetY,
      gravityRootOffset: solution.rootOffset ?? [0, solution.rootOffsetY, 0],
    }),
  setAngle: (jointId, dofId, value) =>
    set((s) => ({
      angles: {
        ...s.angles,
        [jointId]: { ...s.angles[jointId], [dofId]: value },
      },
      activePreset: null,
      lastEdited: { jointId, dofId },
    })),
  // Per-joint merge patch — unlike applyPose (which resets every joint to
  // neutral first), this touches ONLY the joints present in `partial` and
  // leaves every other joint's current angles exactly as they were. Built
  // for Record & Replay playback: a clip only ever supplies its own tracked
  // joints, so untracked joints must never be reset or overwritten.
  patchAngles: (partial) =>
    set((s) => {
      const next = { ...s.angles };
      for (const [jointId, dofs] of Object.entries(partial)) {
        next[jointId] = { ...next[jointId], ...dofs };
      }
      return { angles: next, lastEdited: null };
    }),
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
      gravitySupportProfileId: "standing",
      stanceLeg: "none",
      furniture: "none",
      furnitureRotation: 0,
      gravityCompensation: {},
      gravityRootOffsetY: 0,
      gravityRootOffset: [0, 0, 0],
      gravityMovement: DEFAULT_GRAVITY_MOVEMENT,
      lastEdited: null,
    }),
  applyPose: (angles, opts) =>
    set((s) => ({
      angles: { ...neutralAngles(), ...angles },
      rootPosition: opts?.rootPosition ?? [0, 0, 0],
      rootRotation: opts?.rootRotation ?? [0, 0, 0],
      activePreset: opts?.presetId ?? null,
      gravitySupportProfileId: opts?.supportProfileId ?? opts?.presetId ?? "standing",
      furniture: opts?.furniture ?? "none",
      furnitureRotation: opts?.furnitureRotation ?? 0,
      stanceLeg: opts?.stanceLeg ?? "none",
      selectedJoint: s.selectedJoint,
      gravityCompensation: {},
      gravityRootOffsetY: 0,
      gravityRootOffset: [0, 0, 0],
      gravityMovement: DEFAULT_GRAVITY_MOVEMENT,
      lastEdited: null,
    })),
}));

if (typeof window !== "undefined") {
  (window as unknown as { __armSim: typeof useArmSimStore }).__armSim = useArmSimStore;
}
