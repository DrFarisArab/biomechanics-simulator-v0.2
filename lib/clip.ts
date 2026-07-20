import type {
  GravityMovementId,
  GravityMovementSide,
} from "./gravityMovements";

// Record & Replay data model. A clip is a SPARSE animation: only the joints
// the user chose to animate are ever present in a keyframe's `poses` map —
// every other joint is left completely alone by playback (see
// clipInterpolation.ts's applyClipAtTime, which only ever returns entries
// for `clip.trackedJoints`).
export type Easing = "easeInOut" | "linear";

export interface Keyframe {
  id: string;
  time: number; // seconds, >= 0
  // jointId -> dofId -> degrees. Always covers EVERY dof of every tracked
  // joint (captured as a full per-joint snapshot each time a keyframe is
  // added) so a joint's own multi-DOF composition is always well-defined
  // for interpolation, never partially specified within one keyframe.
  poses: Record<string, Record<string, number>>;
  // Closed-chain clips capture the movement control itself so playback
  // continues to run through the existing ground-contact constraint layer.
  closedChain?: {
    amount: number;
    side: GravityMovementSide;
  };
}

export interface Clip {
  id: string;
  name: string;
  trackedJoints: string[];
  keyframes: Keyframe[]; // kept sorted ascending by time
  easing: Easing;
  closedChainMovement?: GravityMovementId;
}

let idCounter = 0;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

export function clipDuration(clip: Clip | null): number {
  if (!clip || clip.keyframes.length === 0) return 0;
  return clip.keyframes[clip.keyframes.length - 1].time;
}
