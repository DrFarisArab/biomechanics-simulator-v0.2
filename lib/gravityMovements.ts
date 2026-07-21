import type { StanceLeg } from "./stanceMode";
import type { PoseSupport } from "./gravityMode";

export type GravityMovementId = "squat" | "lunge" | "hip_hike" | "calf_raise" | "bow_forward";
export type GravityMovementSide = "left" | "right";

export type GravityMovementState = {
  id: GravityMovementId;
  amount: number;
  side: GravityMovementSide;
};

export type GravityMovementDefinition = {
  id: GravityMovementId;
  label: string;
  controlLabel: string;
  max: number;
  summary: string;
  sideLabel?: string;
};

export const DEFAULT_GRAVITY_MOVEMENT: GravityMovementState = {
  id: "squat",
  amount: 0,
  side: "right",
};

export const GRAVITY_MOVEMENTS: GravityMovementDefinition[] = [
  {
    id: "squat",
    label: "Squat",
    controlLabel: "Knee depth",
    max: 120,
    summary: "Bilateral hip, knee and ankle flexion",
  },
  {
    id: "lunge",
    label: "Lunge",
    controlLabel: "Lead-knee depth",
    max: 100,
    summary: "Lead-leg loading with trailing-limb extension",
    sideLabel: "Lead leg",
  },
  {
    id: "hip_hike",
    label: "Hip Hike",
    controlLabel: "Pelvic hike",
    max: 15,
    summary: "Single-leg support with frontal-plane pelvic lift",
    sideLabel: "Hike side",
  },
  {
    id: "calf_raise",
    label: "Calf Raise",
    controlLabel: "Heel rise",
    max: 30,
    summary: "Bilateral closed-chain plantarflexion",
  },
  {
    id: "bow_forward",
    label: "Bowing Forward",
    controlLabel: "Forward bend",
    max: 100,
    summary: "Standing forward trunk flexion with feet fixed on the floor",
  },
];

const BOTH_FEET: PoseSupport[] = [
  { id: "foot_left", surface: "floor" },
  { id: "foot_right", surface: "floor" },
];

function movementTargets(state: GravityMovementState): Record<string, Record<string, number>> {
  const amount = Math.max(0, state.amount);
  if (amount < 0.5) return {};

  if (state.id === "squat") {
    return {
      hip_left: {
        flexExt: amount * 0.85,
        abdAdd: Math.min(12, amount * 0.2),
        rotation: Math.min(8, amount * 0.1),
      },
      hip_right: {
        flexExt: amount * 0.85,
        abdAdd: Math.min(12, amount * 0.2),
        rotation: Math.min(8, amount * 0.1),
      },
      knee_left: { flexExt: amount },
      knee_right: { flexExt: amount },
      ankle_left: { dorsiPlantar: Math.min(20, amount * 0.17) },
      ankle_right: { dorsiPlantar: Math.min(20, amount * 0.17) },
      pelvis: { tilt: Math.min(12, amount * 0.1) },
      lumbar: { flexExt: Math.min(12, amount * 0.1) },
    };
  }

  if (state.id === "lunge") {
    const lead = state.side;
    const trail = lead === "left" ? "right" : "left";
    return {
      [`hip_${lead}`]: {
        flexExt: Math.min(90, amount * 0.82),
        abdAdd: Math.min(10, amount * 0.12),
        rotation: Math.min(6, amount * 0.07),
      },
      [`knee_${lead}`]: { flexExt: amount },
      [`ankle_${lead}`]: { dorsiPlantar: Math.min(20, amount * 0.2) },
      [`hip_${trail}`]: {
        flexExt: -Math.min(18, amount * 0.18),
        abdAdd: Math.min(8, amount * 0.08),
        rotation: Math.min(5, amount * 0.05),
      },
      [`knee_${trail}`]: { flexExt: Math.min(45, amount * 0.45) },
      pelvis: { tilt: Math.min(10, amount * 0.08) },
      lumbar: { flexExt: Math.min(10, amount * 0.08) },
    };
  }

  if (state.id === "hip_hike") {
    return {
      pelvis: { obliquity: state.side === "right" ? amount : -amount },
      [`hip_${state.side}`]: { abdAdd: Math.min(20, amount * 1.2) },
    };
  }

  if (state.id === "bow_forward") {
    return {
      hip_left: { flexExt: Math.min(38, amount * 0.38) },
      hip_right: { flexExt: Math.min(38, amount * 0.38) },
      ankle_left: { dorsiPlantar: Math.min(16, amount * 0.16) },
      ankle_right: { dorsiPlantar: Math.min(16, amount * 0.16) },
      lumbar: { flexExt: Math.min(58, amount * 0.58) },
      thoracic: { flexExt: Math.min(42, amount * 0.42) },
      cervical: { flexExt: Math.min(22, amount * 0.22) },
      head: { flexExt: Math.min(18, amount * 0.18) },
      shoulder_left: { sagittalFlexExt: Math.min(100, amount) },
      shoulder_right: { sagittalFlexExt: Math.min(100, amount) },
    };
  }

  return {
    ankle_left: { dorsiPlantar: -amount },
    ankle_right: { dorsiPlantar: -amount },
  };
}

export function applyGravityMovement(
  base: Record<string, Record<string, number>>,
  state: GravityMovementState
) {
  const targets = movementTargets(state);
  if (Object.keys(targets).length === 0) return base;
  const next = { ...base };
  for (const [jointId, dofs] of Object.entries(targets)) {
    next[jointId] = { ...base[jointId], ...dofs };
  }
  return next;
}

export function gravityMovementLockedDofs(state: GravityMovementState) {
  const targetDofs = Object.entries(movementTargets(state)).flatMap(([jointId, dofs]) =>
    Object.keys(dofs).map((dofId) => `${jointId}:${dofId}`)
  );
  if (state.amount < 0.5 || state.id !== "lunge") return targetDofs;
  return [
    ...targetDofs,
    "pelvis:obliquity",
    "lumbar:lateral",
    "thoracic:lateral",
    "shoulder_left:sagittalFlexExt",
    "shoulder_right:sagittalFlexExt",
    "shoulder_left:abdAdd",
    "shoulder_right:abdAdd",
  ];
}

export function gravityMovementSupports(state: GravityMovementState): PoseSupport[] | null {
  if (state.amount < 0.5) return null;
  if (state.id === "hip_hike") {
    const stance = state.side === "left" ? "right" : "left";
    return [{ id: `foot_${stance}` as const, surface: "floor" }];
  }
  return BOTH_FEET;
}

export function gravityMovementSupportProfileId(state: GravityMovementState) {
  if (state.amount < 0.5) return null;
  return `gravity-movement:${state.id}:${state.id === "lunge" || state.id === "hip_hike" ? state.side : "bilateral"}`;
}

export function gravityMovementStanceLeg(state: GravityMovementState): StanceLeg | null {
  if (state.amount < 0.5 || state.id !== "hip_hike") return null;
  return state.side === "left" ? "right" : "left";
}

export function gravityMovementUsesVerticalOnlyCompensation(state: GravityMovementState) {
  return (
    state.amount >= 0.5 &&
    (state.id === "squat" ||
      state.id === "hip_hike" ||
      state.id === "calf_raise" ||
      state.id === "bow_forward")
  );
}

export function gravityMovementPinsSupportPositions(state: GravityMovementState) {
  return state.amount >= 0.5 && state.id === "bow_forward";
}
