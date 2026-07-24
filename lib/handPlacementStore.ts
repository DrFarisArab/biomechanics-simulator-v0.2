import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HandContact } from "./handContacts";

// User-authored examiner-hand placements for a Special Test, made with the
// in-app placement editor. Each hand is stored the same way the shipped
// registry (lib/handContacts.ts) stores contacts — bone-anchored with a
// bone-local offset/rotation/scale — so a saved placement can be folded back
// into source verbatim. These OVERRIDE the shipped registry at render time.
export interface HandPlacement {
  testId: string;
  hands: HandContact[];
  savedAt: string; // ISO timestamp
}

interface HandPlacementState {
  // Keyed by test id. Persisted to localStorage so a placement stays the
  // default across reloads on this device; the exported JSON is the separate
  // hand-off folded back into lib/handContacts.ts to become everyone's default.
  placements: Record<string, HandPlacement>;
  setPlacement: (testId: string, hands: HandContact[]) => void;
  clearPlacement: (testId: string) => void;
}

export const useHandPlacementStore = create<HandPlacementState>()(
  persist(
    (set) => ({
      placements: {},
      setPlacement: (testId, hands) =>
        set((s) => ({
          placements: {
            ...s.placements,
            [testId]: {
              testId,
              // Deep-copy so later live edits can't mutate the saved snapshot.
              hands: JSON.parse(JSON.stringify(hands)),
              savedAt: new Date().toISOString(),
            },
          },
        })),
      clearPlacement: (testId) =>
        set((s) => {
          const next = { ...s.placements };
          delete next[testId];
          return { placements: next };
        }),
    }),
    {
      name: "special-test-hand-placements",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
