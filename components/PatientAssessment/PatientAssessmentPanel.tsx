"use client";

import { usePatientAssessmentStore, type WizardStep } from "@/lib/patientAssessmentStore";
import { Step1PatientInfo } from "./Step1PatientInfo";
import { Step2ChiefComplaint } from "./Step2ChiefComplaint";
import { Step3JointSelection } from "./Step3JointSelection";
import { Step4SpecialTests } from "./Step4SpecialTests";
import { Step5Report } from "./Step5Report";

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Patient Info",
  2: "Subjective Assessment",
  3: "Objective Assessment",
  4: "Special Tests",
  5: "Report",
};

function StepIndicator() {
  const step = usePatientAssessmentStore((s) => s.step);
  const goToStep = usePatientAssessmentStore((s) => s.goToStep);

  return (
    <div className="flex items-center gap-1 border-b border-ink-800 px-4 py-2">
      {([1, 2, 3, 4, 5] as WizardStep[]).map((n, i) => (
        <div key={n} className="flex flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() => goToStep(n)}
            title={STEP_LABELS[n]}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition ${
              n === step
                ? "border-brand-500 bg-brand-600 text-ink-950"
                : n < step
                  ? "border-brand-700/60 bg-brand-900/30 text-brand-400"
                  : "border-ink-700 bg-ink-800/50 text-ink-500"
            }`}
          >
            {n}
          </button>
          {i < 4 && <div className={`h-px flex-1 ${n < step ? "bg-brand-700/60" : "bg-ink-800"}`} />}
        </div>
      ))}
    </div>
  );
}

function canAdvance(step: WizardStep, patientName: string, jointCount: number): boolean {
  if (step === 1) return patientName.trim().length > 0;
  if (step === 3) return jointCount > 0;
  return true;
}

export function PatientAssessmentPanel() {
  const step = usePatientAssessmentStore((s) => s.step);
  const setPanelOpen = usePatientAssessmentStore((s) => s.setPanelOpen);
  const nextStep = usePatientAssessmentStore((s) => s.nextStep);
  const prevStep = usePatientAssessmentStore((s) => s.prevStep);
  const patientName = usePatientAssessmentStore((s) => s.draft.patientName);
  const jointCount = usePatientAssessmentStore((s) => s.draft.selectedJoints.length);

  const nextEnabled = canAdvance(step, patientName, jointCount);

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-ink-800 bg-ink-900 sm:h-auto sm:w-80 sm:border-l">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold text-ink-100">New Patient Assessment</div>
          <div className="text-[10px] text-ink-400">Step {step} of 5 — {STEP_LABELS[step]}</div>
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          aria-label="Close new patient assessment panel"
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-400 transition hover:bg-ink-800 hover:text-ink-200"
        >
          ✕
        </button>
      </div>

      <StepIndicator />

      <div className="scroll-slim sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
        {step === 1 && <Step1PatientInfo />}
        {step === 2 && <Step2ChiefComplaint />}
        {step === 3 && <Step3JointSelection />}
        {step === 4 && <Step4SpecialTests />}
        {step === 5 && <Step5Report />}
      </div>

      {step < 5 && (
        <div className="mt-auto flex items-center justify-between border-t border-ink-800 px-4 py-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="w-fit text-[11px] font-medium text-ink-300 transition hover:text-ink-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={!nextEnabled}
            className="rounded-md border border-brand-700/50 bg-brand-900/20 px-3 py-2 text-[12px] font-semibold text-brand-400 transition hover:bg-brand-900/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 4 ? "Generate Report" : "Next"}
          </button>
        </div>
      )}
      {step === 5 && (
        <div className="flex items-center border-t border-ink-800 px-4 py-3">
          <button
            type="button"
            onClick={prevStep}
            className="w-fit text-[11px] font-medium text-ink-300 transition hover:text-ink-200"
          >
            ← Back
          </button>
        </div>
      )}
    </aside>
  );
}
