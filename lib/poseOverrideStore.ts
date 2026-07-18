import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// A user-saved correction to a special test's 3D END POSE. Only the joint
// angles are stored — the base position (supine/sitting/etc.), root transform,
// and furniture are NOT editable and always come from the shipped pose, so a
// correction can never move the setup, only refine the final joint angles.
// `angles` is the full corrected angle set captured live at Save time (same
// shape as the store's `angles`: jointId -> dofId -> degrees).
export interface PoseCorrection {
  testId: string;
  angles: Record<string, Record<string, number>>;
  savedAt: string; // ISO timestamp
}

interface PoseOverrideState {
  // Keyed by test id. Persisted to localStorage so a correction stays the
  // default across reloads on this device (the "immediately becomes default"
  // requirement); the exported JSON file is the separate hand-off that gets
  // folded back into lib/specialTests.ts to become everyone's default.
  corrections: Record<string, PoseCorrection>;
  saveCorrection: (testId: string, angles: Record<string, Record<string, number>>) => void;
  clearCorrection: (testId: string) => void;
}

export const usePoseOverrideStore = create<PoseOverrideState>()(
  persist(
    (set) => ({
      corrections: {},
      saveCorrection: (testId, angles) =>
        set((s) => ({
          corrections: {
            ...s.corrections,
            // Deep-copy the angle snapshot so later live edits to the store
            // don't mutate the saved correction by reference.
            [testId]: {
              testId,
              angles: JSON.parse(JSON.stringify(angles)),
              savedAt: new Date().toISOString(),
            },
          },
        })),
      clearCorrection: (testId) =>
        set((s) => {
          const next = { ...s.corrections };
          delete next[testId];
          return { corrections: next };
        }),
    }),
    {
      name: "corrected-special-tests",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
