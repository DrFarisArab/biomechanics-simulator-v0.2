import { PRESETS, type PosePreset } from "./presets";
import { makeId, type Clip } from "./clip";

// Duration of one leg of a Special Test's preview animation — the ping-pong
// loop (see recordReplayStore.ts's preview* actions) then plays start->test
// in this many seconds, and test->start in the same, repeating.
const PREVIEW_LEG_SECONDS = 1.6;

function anglesEqual(a: Record<string, number> | undefined, b: Record<string, number> | undefined): boolean {
  const ak = Object.keys(a ?? {});
  const bk = Object.keys(b ?? {});
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if ((a ?? {})[k] !== (b ?? {})[k]) return false;
  }
  return true;
}

/**
 * Builds a 2-keyframe preview clip for a Special Test's pose: start = the
 * test's own neutral base (whatever position the patient is already in
 * before the test-specific joints move — e.g. "Supine" or "Sitting", from
 * fromBase()'s `baseId`), end = the full test position. Root position/
 * rotation/furniture are NOT animated (this clip only drives joint angles,
 * same as every other Record & Replay clip) — the caller is expected to
 * apply the target preset's root/furniture once, up front, then let this
 * clip animate the joints on top of that fixed setup.
 *
 * Returns null when there's no meaningful joint motion to show (e.g. a test
 * that reuses a preset outright with no baseId — its own "starting" and
 * "test" angles are identical, nothing would visibly move).
 */
export function buildTestPreviewClip(preset: PosePreset): Clip | null {
  const base = preset.baseId ? PRESETS.find((p) => p.id === preset.baseId) : undefined;
  const baseAngles = base?.angles ?? {};

  const trackedJoints = Object.keys(preset.angles).filter(
    (jointId) => !anglesEqual(baseAngles[jointId], preset.angles[jointId])
  );
  if (trackedJoints.length === 0) return null;

  const startPoses: Record<string, Record<string, number>> = {};
  const endPoses: Record<string, Record<string, number>> = {};
  for (const jointId of trackedJoints) {
    startPoses[jointId] = { ...baseAngles[jointId] };
    endPoses[jointId] = { ...preset.angles[jointId] };
  }

  return {
    id: makeId("preview"),
    name: `Preview: ${preset.label}`,
    trackedJoints,
    easing: "easeInOut",
    keyframes: [
      { id: makeId("kf"), time: 0, poses: startPoses },
      { id: makeId("kf"), time: PREVIEW_LEG_SECONDS, poses: endPoses },
    ],
  };
}
