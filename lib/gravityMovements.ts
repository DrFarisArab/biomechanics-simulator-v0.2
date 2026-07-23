import type { StanceLeg } from "./stanceMode";
import type { PoseSupport } from "./gravityMode";

export type GravityMovementId =
  | "squat"
  | "lunge"
  | "hip_hike"
  | "calf_raise"
  | "bow_forward"
  | "scap_elevation"
  | "scap_depression"
  | "scap_retraction"
  | "scap_protraction"
  | "scap_upward_rot"
  | "scap_downward_rot";
export type GravityMovementSide = "left" | "right";

// The scapular movements are upper-body demonstrations, not ground-contact
// closed-chain movements — they share the same panel/slider infrastructure
// but bypass the balance solver (moving the scapulae/arms shifts COM only
// trivially, and we don't want the whole body drifting to compensate). See
// gravityMovementIsScapular + GravityConstraintLayer's `enabled` gate.
export const SCAPULAR_MOVEMENT_IDS: GravityMovementId[] = [
  "scap_elevation",
  "scap_depression",
  "scap_retraction",
  "scap_protraction",
  "scap_upward_rot",
  "scap_downward_rot",
];

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
  // Slider unit — degrees for rotations (default), centimetres for the
  // translational scapular glides (elevation/depression), which are a
  // superior/inferior slide of the scapula on the thorax, not an angle.
  unit?: "deg" | "cm";
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
  // --- Scapulothoracic movements (bilateral) --------------------------------
  // ROM maxima are clinical scapular values: elevation/depression are the
  // superior/inferior glide of the scapula on the thorax (measured as
  // translation, ~5 cm up / ~2.5 cm down in a healthy shrug); protraction/
  // retraction are the horizontal swing around the rib cage; upward rotation
  // reaches ~60° through full arm elevation while downward rotation from rest
  // is comparatively limited (~20°). Both scapulae move together.
  {
    id: "scap_elevation",
    label: "Elevation",
    controlLabel: "Scapular elevation",
    max: 5,
    unit: "cm",
    summary: "Bilateral scapular elevation (shrug) — superior glide on the thorax",
  },
  {
    id: "scap_depression",
    label: "Depression",
    controlLabel: "Scapular depression",
    max: 2.5,
    unit: "cm",
    summary: "Bilateral scapular depression — inferior glide on the thorax",
  },
  {
    id: "scap_retraction",
    label: "Retraction",
    controlLabel: "Scapular retraction",
    max: 25,
    summary: "Bilateral retraction — scapulae drawn medially toward the spine",
  },
  {
    id: "scap_protraction",
    label: "Protraction",
    controlLabel: "Scapular protraction",
    max: 40,
    summary: "Bilateral protraction — scapulae drawn forward around the rib cage",
  },
  {
    id: "scap_upward_rot",
    label: "Upward Rotation",
    controlLabel: "Upward rotation",
    max: 60,
    summary: "Bilateral upward rotation — glenoid turns to face upward",
  },
  {
    id: "scap_downward_rot",
    label: "Downward Rotation",
    controlLabel: "Downward rotation",
    max: 20,
    summary: "Bilateral downward rotation — glenoid turns to face downward",
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

  // Scapular movements drive a single `scapula` pseudo-joint consumed by
  // applyScapularRhythm (scapularRhythm.ts). elevDep is a signed centimetre
  // glide (superior +), protRet a signed degree swing (protraction +),
  // upDownRot a signed degree rotation (upward +) — the slider is always a
  // positive 0→max amount, so the depression/retraction/downward buttons
  // negate it here to point their shared axis the other way.
  if (state.id === "scap_elevation") return { scapula: { elevDep: amount } };
  if (state.id === "scap_depression") return { scapula: { elevDep: -amount } };
  if (state.id === "scap_protraction") return { scapula: { protRet: amount } };
  if (state.id === "scap_retraction") return { scapula: { protRet: -amount } };
  if (state.id === "scap_upward_rot") return { scapula: { upDownRot: amount } };
  if (state.id === "scap_downward_rot") return { scapula: { upDownRot: -amount } };

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

// Scapulothoracic movements are upper-body only: they pose the scapulae (and
// the arms that ride on them) but must not trigger the whole-body balance
// solve — GravityConstraintLayer gates the solver's `enabled` on this so the
// body stays put while the shoulder girdle moves.
export function gravityMovementIsScapular(state: GravityMovementState) {
  return SCAPULAR_MOVEMENT_IDS.includes(state.id);
}
