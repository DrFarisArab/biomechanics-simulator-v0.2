import { create } from "zustand";

// Transient state for an in-progress hand-placement editing session (NOT
// persisted — the committed result lands in handPlacementStore on Save).
//
// While editing, each draft hand is a free WORLD-SPACE object the drag gizmo
// controls directly (position/rotation/scale in world coordinates). This
// sidesteps the bone-anchored render path entirely during editing; on Save the
// editor converts each draft's world transform to a nearest-bone-local
// HandContact for storage.

export type GizmoMode = "translate" | "rotate" | "scale";

export interface DraftHand {
  id: string;
  kind: "hand" | "arrow";
  side: "left" | "right"; // meaningful for hands; ignored for arrows
  pos: [number, number, number]; // world metres
  euler: [number, number, number]; // world radians, XYZ
  scale: number;
}

interface HandEditorState {
  editingTestId: string | null;
  draft: DraftHand[];
  selectedId: string | null;
  mode: GizmoMode;
  start: (testId: string, seed: DraftHand[]) => void;
  cancel: () => void;
  addHand: (hand: DraftHand) => void;
  removeHand: (id: string) => void;
  select: (id: string | null) => void;
  setMode: (mode: GizmoMode) => void;
  updateHand: (id: string, patch: Partial<Omit<DraftHand, "id">>) => void;
}

let handSeq = 0;
export function nextHandId() {
  handSeq += 1;
  return `hand-${Date.now()}-${handSeq}`;
}

export const useHandEditorStore = create<HandEditorState>((set) => ({
  editingTestId: null,
  draft: [],
  selectedId: null,
  mode: "translate",
  start: (testId, seed) =>
    set({ editingTestId: testId, draft: seed, selectedId: seed[0]?.id ?? null, mode: "translate" }),
  cancel: () => set({ editingTestId: null, draft: [], selectedId: null }),
  addHand: (hand) => set((s) => ({ draft: [...s.draft, hand], selectedId: hand.id })),
  removeHand: (id) =>
    set((s) => {
      const draft = s.draft.filter((h) => h.id !== id);
      return { draft, selectedId: s.selectedId === id ? (draft[draft.length - 1]?.id ?? null) : s.selectedId };
    }),
  select: (id) => set({ selectedId: id }),
  setMode: (mode) => set({ mode }),
  updateHand: (id, patch) =>
    set((s) => ({ draft: s.draft.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),
}));
