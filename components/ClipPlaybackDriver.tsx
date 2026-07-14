"use client";

import { useFrame } from "@react-three/fiber";
import { useRecordReplayStore } from "@/lib/recordReplayStore";

/**
 * Headless — renders nothing. Lives inside <Canvas> purely to get a
 * useFrame tick (R3F's per-frame hook only fires inside the Canvas tree),
 * which it uses to advance clip playback time each frame. All it does is
 * forward real elapsed time to the record/replay store's `tick` action;
 * the store owns play/pause/loop/speed state and does the actual
 * interpolation + store write (see recordReplayStore.ts's `tick`/
 * `applyToScene`) so this component has no logic of its own to keep in
 * sync with anything.
 */
export function ClipPlaybackDriver() {
  useFrame((_, delta) => {
    const { isPlaying, tick } = useRecordReplayStore.getState();
    if (!isPlaying) return;
    tick(delta);
  });
  return null;
}
