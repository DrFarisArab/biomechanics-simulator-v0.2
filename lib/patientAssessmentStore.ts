import { create } from "zustand";
import {
  blankAssessment,
  isBlankAssessment,
  type Assessment,
  type OnsetChip,
  type RedFlags,
  type Side,
  type TestResult,
} from "./assessment";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface PatientAssessmentState {
  panelOpen: boolean;
  step: WizardStep;
  draft: Assessment;

  setPanelOpen: (open: boolean) => void;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  // Resets the draft to a fresh blank Assessment AND opens the panel at
  // step 1. Called explicitly (Step 5's "Start New Assessment" button) when
  // the clinician is genuinely done and wants to discard the current draft.
  startNewAssessment: () => void;
  // What the toolbar's "New Patient" button actually calls: reopens an
  // in-progress draft as-is (never silently discards real patient data —
  // see isBlankAssessment) if one exists, otherwise behaves like
  // startNewAssessment since there's nothing to lose.
  openOrResumeAssessment: () => void;

  // Step 1
  setPatientField: <K extends keyof Assessment>(key: K, value: Assessment[K]) => void;

  // Step 2
  toggleOnsetChip: (chip: OnsetChip) => void;
  toggleRedFlag: (key: keyof RedFlags) => void;

  // Step 3 — toggling a category off removes it from selectedJoints
  // entirely (its Step 4 findings stay in testFindings, just no longer
  // shown, per the plan's "hidden not deleted" requirement). Toggling a
  // sided category on defaults side to null until setJointSide is called;
  // toggling an unsided category on sets side to null permanently.
  toggleJointCategory: (categoryId: string) => void;
  setJointSide: (categoryId: string, side: Side | "bilateral") => void;

  // Step 4
  setTestResult: (testId: string, result: TestResult) => void;
  setTestNotes: (testId: string, notes: string) => void;

  // Step 5
  setClinicalImpression: (text: string) => void;
}

export const usePatientAssessmentStore = create<PatientAssessmentState>((set) => ({
  panelOpen: false,
  step: 1,
  draft: blankAssessment(),

  setPanelOpen: (open) => set({ panelOpen: open }),

  goToStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(5, s.step + 1) as WizardStep })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) as WizardStep })),

  startNewAssessment: () => set({ draft: blankAssessment(), step: 1, panelOpen: true }),

  openOrResumeAssessment: () =>
    set((s) => (isBlankAssessment(s.draft) ? { draft: blankAssessment(), step: 1, panelOpen: true } : { panelOpen: true })),

  setPatientField: (key, value) => set((s) => ({ draft: { ...s.draft, [key]: value } })),

  toggleOnsetChip: (chip) =>
    set((s) => ({
      draft: {
        ...s.draft,
        onsetChips: s.draft.onsetChips.includes(chip)
          ? s.draft.onsetChips.filter((c) => c !== chip)
          : [...s.draft.onsetChips, chip],
      },
    })),

  toggleRedFlag: (key) =>
    set((s) => ({
      draft: { ...s.draft, redFlags: { ...s.draft.redFlags, [key]: !s.draft.redFlags[key] } },
    })),

  toggleJointCategory: (categoryId) =>
    set((s) => {
      const exists = s.draft.selectedJoints.some((j) => j.categoryId === categoryId);
      const selectedJoints = exists
        ? s.draft.selectedJoints.filter((j) => j.categoryId !== categoryId)
        : [...s.draft.selectedJoints, { categoryId, side: null }];
      return { draft: { ...s.draft, selectedJoints } };
    }),

  setJointSide: (categoryId, side) =>
    set((s) => ({
      draft: {
        ...s.draft,
        selectedJoints: s.draft.selectedJoints.map((j) => (j.categoryId === categoryId ? { ...j, side } : j)),
      },
    })),

  setTestResult: (testId, result) =>
    set((s) => ({
      draft: {
        ...s.draft,
        testFindings: {
          ...s.draft.testFindings,
          [testId]: { testId, result, notes: s.draft.testFindings[testId]?.notes ?? "" },
        },
      },
    })),

  setTestNotes: (testId, notes) =>
    set((s) => ({
      draft: {
        ...s.draft,
        testFindings: {
          ...s.draft.testFindings,
          [testId]: { testId, result: s.draft.testFindings[testId]?.result ?? "not_tested", notes },
        },
      },
    })),

  setClinicalImpression: (text) => set((s) => ({ draft: { ...s.draft, clinicalImpression: text } })),
}));
