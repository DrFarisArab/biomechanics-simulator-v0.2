"use client";

import { useArmSimStore } from "@/lib/store";
import { useAuthoredPoseStore } from "@/lib/authoredPoseStore";
import type { SpecialTest } from "@/lib/specialTests";

// Shown for tests that ship with NO 3D position. Lets the clinician pose the
// model freely (Joints panel) and capture that as the test's position, then
// re-apply it. Stored in authoredPoseStore and exportable to be folded into
// the shipped library later.
export function AuthorPoseButton({ test }: { test: SpecialTest }) {
  const applyPose = useArmSimStore((s) => s.applyPose);
  const saved = useAuthoredPoseStore((s) => s.poses[test.id]);
  const savePose = useAuthoredPoseStore((s) => s.savePose);
  const clearPose = useAuthoredPoseStore((s) => s.clearPose);

  const captureCurrent = () => {
    const s = useArmSimStore.getState();
    savePose({
      testId: test.id,
      angles: s.angles,
      rootPosition: s.rootPosition,
      rootRotation: s.rootRotation,
      furniture: s.furniture,
      furnitureRotation: s.furnitureRotation,
      stanceLeg: s.stanceLeg,
    });
    // Mark this test active so its examiner-hand/arrow markers show on it.
    s.setActiveSpecialTestId(test.id);
  };

  const applySaved = () => {
    if (!saved) return;
    applyPose(saved.angles, {
      specialTestId: test.id,
      rootPosition: saved.rootPosition,
      rootRotation: saved.rootRotation,
      furniture: saved.furniture,
      furnitureRotation: saved.furnitureRotation,
      stanceLeg: saved.stanceLeg,
    });
  };

  return (
    <div className="rounded-md border border-dashed border-ink-700 bg-ink-800/20 p-2.5">
      <div className="mb-1.5 text-[11px] leading-relaxed text-ink-400">
        No 3D position ships with this test yet. Pose the model with the Joints panel, then capture it here.
      </div>
      {saved && (
        <button
          onClick={applySaved}
          className="mb-1.5 w-full rounded-md border border-brand-700/50 bg-brand-900/20 px-3 py-2 text-[12px] font-semibold text-brand-400 transition hover:bg-brand-900/40"
        >
          Apply saved position
        </button>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={captureCurrent}
          className="rounded-md border border-ink-600 bg-ink-800/50 px-2.5 py-1.5 text-[12px] font-medium text-ink-200 transition hover:border-brand-600/60"
        >
          {saved ? "Update from current pose" : "Save current pose as test position"}
        </button>
        {saved && (
          <button
            onClick={() => clearPose(test.id)}
            className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[12px] text-ink-400 transition hover:border-rose-700/60 hover:text-rose-300"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
