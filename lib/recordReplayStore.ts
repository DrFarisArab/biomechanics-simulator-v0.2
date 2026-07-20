import { create } from "zustand";
import { useArmSimStore } from "./store";
import { applyClipAtTime, easingFn } from "./clipInterpolation";
import { clipDuration, makeId, sortKeyframes, type Clip, type Easing } from "./clip";
import {
  GRAVITY_MOVEMENTS,
  type GravityMovementId,
  type GravityMovementSide,
} from "./gravityMovements";

interface RecordReplayState {
  panelOpen: boolean;
  clip: Clip | null;
  pendingJoints: string[]; // joint picker selection, before a clip exists
  pendingClosedChainMovement: GravityMovementId | null;
  currentTime: number;
  isPlaying: boolean;
  loop: boolean; // ping-pong: plays forward to the end, then backward to the start, repeating
  direction: 1 | -1;
  speed: number; // 0.25 - 2

  // Special Tests' "Play" preview — a SEPARATE clip/time/direction slot from
  // the one above, so previewing a test's animation never touches (or gets
  // clobbered by) whatever clip the user is actually building in the
  // Record & Replay panel. Reuses the exact same interpolation engine
  // (applyClipAtTime) and store write (patchAngles) though — see
  // tickPreview/applyToScene below — this is not a second animation system,
  // just a second independently-playing clip slot. Always ping-pong, no
  // speed control — it's a fixed demo loop, not an authoring timeline.
  previewClip: Clip | null;
  previewTime: number;
  previewPlaying: boolean;
  previewDirection: 1 | -1;

  setPanelOpen: (open: boolean) => void;
  toggleJoint: (jointId: string) => void;
  selectClosedChainMovement: (movementId: GravityMovementId) => void;
  startClip: () => void;
  discardClip: () => void;
  setEasing: (easing: Easing) => void;
  addKeyframe: () => void;
  deleteKeyframe: (id: string) => void;
  play: () => void;
  pause: () => void;
  setLoop: (loop: boolean) => void;
  setSpeed: (speed: number) => void;
  seek: (time: number) => void;
  tick: (deltaSeconds: number) => void;
  playPreview: (clip: Clip) => void;
  stopPreview: () => void;
  tickPreview: (deltaSeconds: number) => void;
}

// Reflects an overshoot back in off whichever end it crossed — same
// "bounce" used by both the main clip's loop and the Special Tests preview,
// factored out once rather than duplicated.
function bounce(next: number, duration: number, dir: 1 | -1): { time: number; dir: 1 | -1 } {
  let t = next;
  let d = dir;
  if (t >= duration) {
    t = duration - (t - duration);
    d = -1;
  } else if (t <= 0) {
    t = -t;
    d = 1;
  }
  return { time: Math.min(duration, Math.max(0, t)), dir: d };
}

function closedChainAtTime(
  clip: Clip,
  time: number
): { amount: number; side: GravityMovementSide } | null {
  const keyed = clip.keyframes.filter((keyframe) => keyframe.closedChain);
  if (keyed.length === 0) return null;

  const first = keyed[0];
  if (keyed.length === 1 || time <= first.time) return first.closedChain!;
  const last = keyed[keyed.length - 1];
  if (time >= last.time) return last.closedChain!;

  let index = 0;
  while (index < keyed.length - 1 && keyed[index + 1].time <= time) index++;
  const from = keyed[index];
  const to = keyed[index + 1];
  const span = to.time - from.time;
  const rawAlpha = span > 0 ? (time - from.time) / span : 1;
  const alpha = easingFn(clip.easing)(Math.min(1, Math.max(0, rawAlpha)));
  const fromState = from.closedChain!;
  const toState = to.closedChain!;

  return {
    amount: fromState.amount + (toState.amount - fromState.amount) * alpha,
    side: alpha < 0.5 ? fromState.side : toState.side,
  };
}

// Pushes the clip's interpolated pose (only its tracked joints) into the
// main store — the ONE place this module ever touches `angles`. Reuses
// setAngle's sibling `patchAngles`, so every OTHER joint (and the whole
// preset/DOF-editor/Special-Tests machinery reading `angles`) is completely
// unaffected — this really is just another writer into the same joint
// state those already use, not a parallel system.
function applyToScene(clip: Clip, time: number) {
  if (clip.closedChainMovement) {
    const movement = closedChainAtTime(clip, time);
    if (!movement) return;

    let armState = useArmSimStore.getState();
    if (!armState.gravityEnabled) {
      armState.setGravityEnabled(true);
      armState = useArmSimStore.getState();
    }
    if (armState.gravityMovement.id !== clip.closedChainMovement) {
      armState.setGravityMovement(clip.closedChainMovement);
      armState = useArmSimStore.getState();
    }
    if (armState.gravityMovement.side !== movement.side) {
      armState.setGravityMovementSide(movement.side);
      armState = useArmSimStore.getState();
    }
    armState.setGravityMovementAmount(movement.amount);
    return;
  }

  const patch = applyClipAtTime(clip, time);
  useArmSimStore.getState().patchAngles(patch);
}

export const useRecordReplayStore = create<RecordReplayState>((set, get) => ({
  panelOpen: false,
  clip: null,
  pendingJoints: [],
  pendingClosedChainMovement: null,
  currentTime: 0,
  isPlaying: false,
  loop: false,
  direction: 1,
  speed: 1,

  previewClip: null,
  previewTime: 0,
  previewPlaying: false,
  previewDirection: 1,

  setPanelOpen: (open) => set({ panelOpen: open }),

  toggleJoint: (jointId) => {
    useArmSimStore.getState().setGravityEnabled(false);
    set((s) => ({
      pendingJoints: s.pendingJoints.includes(jointId)
        ? s.pendingJoints.filter((j) => j !== jointId)
        : [...s.pendingJoints, jointId],
      pendingClosedChainMovement: null,
    }));
  },

  selectClosedChainMovement: (movementId) => {
    const armState = useArmSimStore.getState();
    if (!armState.gravityEnabled) armState.setGravityEnabled(true);
    useArmSimStore.getState().setGravityMovement(movementId);
    set({
      pendingClosedChainMovement: movementId,
      pendingJoints: [],
    });
  },

  startClip: () =>
    set((s) => {
      if (!s.pendingClosedChainMovement && s.pendingJoints.length === 0) return {};
      const movementDefinition = s.pendingClosedChainMovement
        ? GRAVITY_MOVEMENTS.find((movement) => movement.id === s.pendingClosedChainMovement)
        : null;
      const clip: Clip = {
        id: makeId("clip"),
        name: movementDefinition?.label ?? "Untitled clip",
        trackedJoints: s.pendingClosedChainMovement ? [] : [...s.pendingJoints],
        keyframes: [],
        easing: "easeInOut",
        closedChainMovement: s.pendingClosedChainMovement ?? undefined,
      };
      return { clip, currentTime: 0, isPlaying: false, direction: 1 };
    }),

  discardClip: () =>
    set({
      clip: null,
      pendingJoints: [],
      pendingClosedChainMovement: null,
      currentTime: 0,
      isPlaying: false,
      direction: 1,
    }),

  setEasing: (easing) =>
    set((s) => (s.clip ? { clip: { ...s.clip, easing } } : {})),

  // Snapshots the CURRENT live angles (from the main store) for every
  // tracked joint's full DOF set, at the current scrub time. Moving the
  // scrubber first, then posing the joint(s), then clicking this is how a
  // multi-keyframe clip (not just start/end) gets built.
  addKeyframe: () =>
    set((s) => {
      if (!s.clip) return {};
      const armState = useArmSimStore.getState();
      const liveAngles = armState.angles;
      const poses: Record<string, Record<string, number>> = {};
      for (const jointId of s.clip.trackedJoints) {
        poses[jointId] = { ...liveAngles[jointId] };
      }
      const withoutSameTime = s.clip.keyframes.filter((k) => k.time !== s.currentTime);
      const keyframes = sortKeyframes([
        ...withoutSameTime,
        {
          id: makeId("kf"),
          time: s.currentTime,
          poses,
          closedChain: s.clip.closedChainMovement
            ? {
                amount: armState.gravityMovement.amount,
                side: armState.gravityMovement.side,
              }
            : undefined,
        },
      ]);
      return { clip: { ...s.clip, keyframes } };
    }),

  deleteKeyframe: (id) =>
    set((s) => (s.clip ? { clip: { ...s.clip, keyframes: s.clip.keyframes.filter((k) => k.id !== id) } } : {})),

  play: () => {
    const { clip, currentTime } = get();
    if (!clip || clip.keyframes.length < 2) return;
    // Restart from the top (forward) if already sitting at or past the end.
    const duration = clipDuration(clip);
    const atEnd = currentTime >= duration;
    set({ isPlaying: true, currentTime: atEnd ? 0 : currentTime, direction: atEnd ? 1 : get().direction });
  },

  pause: () => set({ isPlaying: false }),

  // Turning loop off mid-bounce forces direction back to forward — without
  // this, a clip caught mid-backward-leg would otherwise run to t=0 and
  // stop there (tick's non-loop branch only knows how to stop at the END),
  // which reads as "playback got stuck going backward" rather than a clean
  // off switch.
  setLoop: (loop) => set({ loop, direction: loop ? get().direction : 1 }),

  setSpeed: (speed) => set({ speed }),

  // Deliberately NOT clamped to the clip's current duration — the timeline
  // cursor doubles as the "where will the next Add Keyframe land" pointer,
  // so scrubbing past the last existing keyframe must work (that's how you
  // place a new, later one). Only clamped to a sane non-negative range.
  seek: (time) =>
    set((s) => {
      const clamped = Math.min(600, Math.max(0, time));
      if (s.clip && s.clip.keyframes.length > 0) applyToScene(s.clip, clamped);
      return { currentTime: clamped };
    }),

  // Called every frame by the R3F playback driver while isPlaying. With
  // loop on, this is a PING-PONG (boomerang) loop — plays forward to the
  // last keyframe, reverses and plays backward to the first, reverses
  // again, repeating — not a wrap/restart-from-0 loop. Without loop, it's
  // unchanged: forward-only, stopping (and staying) at the last keyframe.
  tick: (deltaSeconds) =>
    set((s) => {
      if (!s.isPlaying || !s.clip) return {};
      const duration = clipDuration(s.clip);
      if (duration <= 0) return { isPlaying: false };

      let dir = s.direction;
      let next = s.currentTime + dir * deltaSeconds * s.speed;
      let playing = true;

      if (s.loop) {
        const bounced = bounce(next, duration, dir);
        next = bounced.time;
        dir = bounced.dir;
      } else if (next >= duration) {
        next = duration;
        playing = false;
      } else if (next <= 0) {
        next = 0;
        playing = false;
      }

      applyToScene(s.clip, next);
      return { currentTime: next, isPlaying: playing, direction: dir };
    }),

  // Starts (or restarts) a Special Test's Play preview from t=0, forward.
  // Swapping previewClip mid-playback (e.g. user clicks Play on a different
  // test) just resets time/direction cleanly — there's no scrub UI for
  // previews, so no state needs preserving across the switch.
  playPreview: (clip) => set({ previewClip: clip, previewTime: 0, previewDirection: 1, previewPlaying: true }),

  stopPreview: () => set({ previewPlaying: false }),

  // Same bounce logic as tick(), but always ping-pong (no loop toggle) and
  // writes to previewTime/previewDirection instead of currentTime/direction
  // — kept fully separate from the user's own clip/currentTime so a running
  // preview never fights with (or gets reset by) Record & Replay authoring.
  tickPreview: (deltaSeconds) =>
    set((s) => {
      if (!s.previewPlaying || !s.previewClip) return {};
      const duration = clipDuration(s.previewClip);
      if (duration <= 0) return { previewPlaying: false };

      const next = s.previewTime + s.previewDirection * deltaSeconds;
      const { time, dir } = bounce(next, duration, s.previewDirection);

      applyToScene(s.previewClip, time);
      return { previewTime: time, previewDirection: dir };
    }),
}));
