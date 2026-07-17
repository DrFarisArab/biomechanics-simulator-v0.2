// Data model for the New Patient Assessment wizard — no React here, same
// separation as lib/specialTests.ts / lib/presets.ts being plain data
// modules that components/stores import from.

export type Sex = "M" | "F";
export type DominantHand = "R" | "L" | "ambidextrous";
export type PainDuration = "acute" | "subacute" | "chronic"; // <6wk / 6-12wk / >12wk
export type OnsetChip = "trauma" | "gradual" | "sports" | "post-op";
export type Side = "L" | "R";
export type TestResult = "not_tested" | "positive" | "negative" | "pain_only" | "weakness" | "pain_weakness";

export const ONSET_CHIP_LABELS: Record<OnsetChip, string> = {
  trauma: "Trauma",
  gradual: "Gradual onset",
  sports: "Sports injury",
  "post-op": "Post-operative",
};

export const DURATION_LABELS: Record<PainDuration, string> = {
  acute: "Acute (<6wk)",
  subacute: "Subacute (6–12wk)",
  chronic: "Chronic (>12wk)",
};

export const TEST_RESULT_LABELS: Record<TestResult, string> = {
  not_tested: "Not Tested",
  positive: "Positive",
  negative: "Negative",
  pain_only: "Pain Only",
  weakness: "Weakness",
  pain_weakness: "Pain + Weakness",
};

// Results that flag a row as clinically notable — used for both the Step 4
// list highlighting and the Step 5 report's red badges.
export const NOTABLE_RESULTS: TestResult[] = ["positive", "weakness", "pain_weakness"];

/**
 * Maps the wizard's 9 clinician-facing joint categories onto lib/
 * specialTests.ts's existing 13 region ids (`SpecialTest.r` / `Region.id`)
 * — reused directly rather than adding a new field to ~200 existing test
 * entries. Regions aren't left/right-aware (one "sh" region covers both
 * shoulders), so `sided` only controls whether Step 3 asks for a side —
 * Step 4's test filter always works by regionIds regardless of side.
 * `tmj` has no category here (not one of the spec's 9) and is simply
 * unreachable via this wizard.
 */
export interface JointCategory {
  id: string;
  label: string;
  regionIds: string[];
  sided: boolean;
}

export const JOINT_CATEGORIES: JointCategory[] = [
  { id: "cervical_spine", label: "Cervical Spine", regionIds: ["cx"], sided: false },
  { id: "shoulder", label: "Shoulder", regionIds: ["sh"], sided: true },
  { id: "elbow", label: "Elbow", regionIds: ["el"], sided: true },
  { id: "wrist_hand", label: "Wrist/Hand", regionIds: ["wr", "hn"], sided: true },
  { id: "thoracic_lumbar_spine", label: "Thoracic/Lumbar Spine", regionIds: ["tx", "lx"], sided: false },
  { id: "sij", label: "SIJ", regionIds: ["si"], sided: false },
  { id: "hip", label: "Hip", regionIds: ["hip"], sided: true },
  { id: "knee", label: "Knee", regionIds: ["kn"], sided: true },
  { id: "ankle_foot", label: "Ankle/Foot", regionIds: ["an", "ft"], sided: true },
];

export interface RedFlags {
  weightLoss: boolean;
  nightPainUnrelieved: boolean;
  feverSystemic: boolean;
  saddleAnesthesiaBowelBladder: boolean;
  progressiveNeuroDeficit: boolean;
  cancerHistory: boolean;
}

export const RED_FLAG_LABELS: Record<keyof RedFlags, string> = {
  weightLoss: "Unexplained weight loss",
  nightPainUnrelieved: "Night pain unrelieved by position change",
  feverSystemic: "Fever / systemic illness",
  saddleAnesthesiaBowelBladder: "Saddle anesthesia or bowel/bladder changes",
  progressiveNeuroDeficit: "Progressive neurological deficit",
  cancerHistory: "History of cancer",
};

function blankRedFlags(): RedFlags {
  return {
    weightLoss: false,
    nightPainUnrelieved: false,
    feverSystemic: false,
    saddleAnesthesiaBowelBladder: false,
    progressiveNeuroDeficit: false,
    cancerHistory: false,
  };
}

export function hasRedFlag(flags: RedFlags): boolean {
  return Object.values(flags).some(Boolean);
}

// Heuristic "has the clinician actually started entering anything" check —
// used to decide whether the toolbar's "New Patient" button is safe to
// silently reset (nothing to lose) or must instead just reopen the
// existing in-progress draft (never silently discard a real draft).
export function isBlankAssessment(a: Assessment): boolean {
  return (
    a.patientName.trim() === "" &&
    a.chiefComplaint.trim() === "" &&
    a.selectedJoints.length === 0 &&
    Object.keys(a.testFindings).length === 0
  );
}

// null side = category isn't `sided` (spine/SIJ); "bilateral" is a third
// option alongside L/R for sided categories, not a fallback/default.
export interface SelectedJoint {
  categoryId: string;
  side: Side | "bilateral" | null;
}

export interface TestFinding {
  testId: string;
  result: TestResult;
  notes: string;
}

export interface Assessment {
  id: string;
  createdAt: string; // ISO timestamp

  // Step 1 — Patient Information
  patientName: string;
  age: number | null;
  sex: Sex | null;
  occupation: string;
  heightCm: number | null;
  weightKg: number | null;
  dominantHand: DominantHand | null;
  assessmentDate: string; // yyyy-mm-dd

  // Step 2 — Chief Complaint
  chiefComplaint: string;
  mechanismOfInjury: string;
  onsetChips: OnsetChip[];
  duration: PainDuration | null;
  painAtRest: number; // 0-10
  painAtWorst: number; // 0-10
  painWithMovement: number; // 0-10
  aggravatingFactors: string;
  relievingFactors: string;
  nightPain: boolean;
  redFlags: RedFlags;

  // Step 3 — Joint/Region Selection
  selectedJoints: SelectedJoint[];

  // Step 4 — Special Tests
  testFindings: Record<string, TestFinding>;

  // Step 5 — Report
  clinicalImpression: string;

  // Reserved for Phase 2/3 — no UI/logic built against these yet.
  differentialDiagnosis: string[];
  treatmentPlan: string | null;
  followUpVisits: unknown[];
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function blankAssessment(): Assessment {
  return {
    id: `assessment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),

    patientName: "",
    age: null,
    sex: null,
    occupation: "",
    heightCm: null,
    weightKg: null,
    dominantHand: null,
    assessmentDate: todayISODate(),

    chiefComplaint: "",
    mechanismOfInjury: "",
    onsetChips: [],
    duration: null,
    painAtRest: 0,
    painAtWorst: 0,
    painWithMovement: 0,
    aggravatingFactors: "",
    relievingFactors: "",
    nightPain: false,
    redFlags: blankRedFlags(),

    selectedJoints: [],

    testFindings: {},

    clinicalImpression: "",

    differentialDiagnosis: [],
    treatmentPlan: null,
    followUpVisits: [],
  };
}
