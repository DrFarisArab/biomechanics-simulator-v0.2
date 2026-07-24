import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Furniture, Vec3 } from "./store";
import type { StanceLeg } from "./stanceMode";

// A user-authored 3D position for a Special Test that ships with NO position.
// Captured from the live model (pose the model however you like via the Joints
// panel, then "Save current pose as this test's position"). Stores the full
// setup — joint angles plus root transform / furniture / stance — so applying
// it later restores the exact position. Persisted per device; exportable to be
// folded into the shipped library.
export interface AuthoredPose {
  testId: string;
  angles: Record<string, Record<string, number>>;
  rootPosition: Vec3;
  rootRotation: Vec3;
  furniture: Furniture;
  furnitureRotation: number;
  stanceLeg: StanceLeg;
  savedAt: string;
}

interface AuthoredPoseState {
  poses: Record<string, AuthoredPose>;
  savePose: (pose: Omit<AuthoredPose, "savedAt">) => void;
  clearPose: (testId: string) => void;
}

export const useAuthoredPoseStore = create<AuthoredPoseState>()(
  persist(
    (set) => ({
      poses: {},
      savePose: (pose) =>
        set((s) => ({
          poses: {
            ...s.poses,
            [pose.testId]: {
              ...JSON.parse(JSON.stringify(pose)),
              savedAt: new Date().toISOString(),
            },
          },
        })),
      clearPose: (testId) =>
        set((s) => {
          const next = { ...s.poses };
          delete next[testId];
          return { poses: next };
        }),
    }),
    {
      name: "authored-test-poses",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
