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
  loop: boolean;
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
      return { clip, currentTime: 0, isPlaying: false };
    }),

  discardClip: () => set({ clip: null, pendingJoints: [], currentTime: 0, isPlaying: false }),

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
    // Restart from the top if already sitting at (or past) the end.
    const duration = clipDuration(clip);
    set({ isPlaying: true, currentTime: currentTime >= duration ? 0 : currentTime });
  },

  pause: () => set({ isPlaying: false }),

  setLoop: (loop) => set({ loop }),

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

  // Called every frame by the R3F playback driver while isPlaying.
  tick: (deltaSeconds) =>
    set((s) => {
      if (!s.isPlaying || !s.clip) return {};
      const duration = clipDuration(s.clip);
      let next = s.currentTime + deltaSeconds * s.speed;
      let playing = true;
      if (next >= duration) {
        if (s.loop) {
          next = duration > 0 ? next % duration : 0;
        } else {
          next = duration;
          playing = false;
        }
      }
      applyToScene(s.clip, next);
      return { currentTime: next, isPlaying: playing };
    }),
}));
