import { create } from "zustand";
import { useArmSimStore } from "./store";
import { applyClipAtTime } from "./clipInterpolation";
import { clipDuration, makeId, sortKeyframes, type Clip, type Easing } from "./clip";

interface RecordReplayState {
  panelOpen: boolean;
  clip: Clip | null;
  pendingJoints: string[]; // joint picker selection, before a clip exists
  currentTime: number;
  isPlaying: boolean;
  loop: boolean; // ping-pong: plays forward to the end, then backward to the start, repeating
  direction: 1 | -1;
  speed: number; // 0.25 - 2

  setPanelOpen: (open: boolean) => void;
  toggleJoint: (jointId: string) => void;
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
}

// Pushes the clip's interpolated pose (only its tracked joints) into the
// main store — the ONE place this module ever touches `angles`. Reuses
// setAngle's sibling `patchAngles`, so every OTHER joint (and the whole
// preset/DOF-editor/Special-Tests machinery reading `angles`) is completely
// unaffected — this really is just another writer into the same joint
// state those already use, not a parallel system.
function applyToScene(clip: Clip, time: number) {
  const patch = applyClipAtTime(clip, time);
  useArmSimStore.getState().patchAngles(patch);
}

export const useRecordReplayStore = create<RecordReplayState>((set, get) => ({
  panelOpen: false,
  clip: null,
  pendingJoints: [],
  currentTime: 0,
  isPlaying: false,
  loop: false,
  direction: 1,
  speed: 1,

  setPanelOpen: (open) => set({ panelOpen: open }),

  toggleJoint: (jointId) =>
    set((s) => ({
      pendingJoints: s.pendingJoints.includes(jointId)
        ? s.pendingJoints.filter((j) => j !== jointId)
        : [...s.pendingJoints, jointId],
    })),

  startClip: () =>
    set((s) => {
      if (s.pendingJoints.length === 0) return {};
      const clip: Clip = {
        id: makeId("clip"),
        name: "Untitled clip",
        trackedJoints: [...s.pendingJoints],
        keyframes: [],
        easing: "easeInOut",
      };
      return { clip, currentTime: 0, isPlaying: false, direction: 1 };
    }),

  discardClip: () => set({ clip: null, pendingJoints: [], currentTime: 0, isPlaying: false, direction: 1 }),

  setEasing: (easing) =>
    set((s) => (s.clip ? { clip: { ...s.clip, easing } } : {})),

  // Snapshots the CURRENT live angles (from the main store) for every
  // tracked joint's full DOF set, at the current scrub time. Moving the
  // scrubber first, then posing the joint(s), then clicking this is how a
  // multi-keyframe clip (not just start/end) gets built.
  addKeyframe: () =>
    set((s) => {
      if (!s.clip) return {};
      const liveAngles = useArmSimStore.getState().angles;
      const poses: Record<string, Record<string, number>> = {};
      for (const jointId of s.clip.trackedJoints) {
        poses[jointId] = { ...liveAngles[jointId] };
      }
      const withoutSameTime = s.clip.keyframes.filter((k) => k.time !== s.currentTime);
      const keyframes = sortKeyframes([
        ...withoutSameTime,
        { id: makeId("kf"), time: s.currentTime, poses },
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
        // Bounce off whichever end was overshot — reflect the overshoot
        // back in, same as a ball bouncing, so a big delta/high speed
        // doesn't visibly clip the very end of a leg.
        if (next >= duration) {
          next = duration - (next - duration);
          dir = -1;
        } else if (next <= 0) {
          next = -next;
          dir = 1;
        }
        next = Math.min(duration, Math.max(0, next));
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
}));
