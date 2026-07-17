"use client";

import { useMemo } from "react";
import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import {
  DURATION_LABELS,
  hasRedFlag,
  JOINT_CATEGORIES,
  NOTABLE_RESULTS,
  ONSET_CHIP_LABELS,
  RED_FLAG_LABELS,
  suggestImpressions,
  TEST_RESULT_LABELS,
  type RedFlags,
} from "@/lib/assessment";
import { TESTS } from "@/lib/specialTests";
import { SectionLabel, TextAreaField } from "./shared";

export function Step5Report() {
  const draft = usePatientAssessmentStore((s) => s.draft);
  const setClinicalImpression = usePatientAssessmentStore((s) => s.setClinicalImpression);
  const startNewAssessment = usePatientAssessmentStore((s) => s.startNewAssessment);

  const redFlagsTriggered = hasRedFlag(draft.redFlags);
  const checkedRedFlags = (Object.keys(draft.redFlags) as (keyof RedFlags)[]).filter((k) => draft.redFlags[k]);
  const suggestions = useMemo(() => suggestImpressions(draft.testFindings), [draft.testFindings]);

  const insertSuggestion = (text: string) => {
    setClinicalImpression(draft.clinicalImpression ? `${draft.clinicalImpression}\n${text}` : text);
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <SectionLabel>Report</SectionLabel>

      <div className="print-report flex flex-col gap-4 rounded-md border border-neutral-700 bg-neutral-950 p-3 text-[11px] text-neutral-200 print:text-neutral-900">
        {/* Header — colors below are dark-theme-on-screen, print:-overridden
            to dark-on-light since the print stylesheet swaps this panel's
            dark card background for the clinic letterhead. */}
        <div className="border-b border-neutral-800 pb-2 print:border-neutral-300">
          <div className="text-[14px] font-semibold text-neutral-100 print:text-neutral-900">{draft.patientName || "Unnamed Patient"}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[10px] text-neutral-400 print:text-neutral-500">
            {draft.age != null && <span>Age {draft.age}</span>}
            {draft.sex && <span>{draft.sex === "M" ? "Male" : "Female"}</span>}
            {draft.occupation && <span>{draft.occupation}</span>}
            {draft.dominantHand && <span>{draft.dominantHand === "R" ? "Right" : draft.dominantHand === "L" ? "Left" : "Ambidextrous"}-handed</span>}
            <span>Assessed {draft.assessmentDate}</span>
          </div>
        </div>

        {/* Red flag banner */}
        {redFlagsTriggered && (
          <div className="rounded-md border border-red-600/60 bg-red-950/40 px-3 py-2 print:border-red-600 print:bg-red-50">
            <div className="text-[11px] font-semibold text-red-400 print:text-red-700">⚠ Red Flags Present</div>
            <ul className="mt-1 list-inside list-disc text-[10px] text-red-300 print:text-red-600">
              {checkedRedFlags.map((k) => (
                <li key={k}>{RED_FLAG_LABELS[k]}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Subjective summary */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 print:text-neutral-600">Subjective</div>
          {draft.chiefComplaint && (
            <div>
              <span className="font-medium text-neutral-300 print:text-neutral-800">Chief complaint: </span>
              {draft.chiefComplaint}
            </div>
          )}
          {draft.mechanismOfInjury && (
            <div>
              <span className="font-medium text-neutral-300 print:text-neutral-800">Mechanism of injury: </span>
              {draft.mechanismOfInjury}
            </div>
          )}
          {draft.duration && (
            <div>
              <span className="font-medium text-neutral-300 print:text-neutral-800">Duration: </span>
              {DURATION_LABELS[draft.duration]}
            </div>
          )}
          {draft.onsetChips.length > 0 && (
            <div>
              <span className="font-medium text-neutral-300 print:text-neutral-800">Onset: </span>
              {draft.onsetChips.map((c) => ONSET_CHIP_LABELS[c]).join(", ")}
            </div>
          )}
          <div>
            <span className="font-medium text-neutral-300 print:text-neutral-800">Pain (0–10): </span>
            rest {draft.painAtRest}, worst {draft.painAtWorst}, on movement {draft.painWithMovement}
          </div>
          {draft.aggravatingFactors && (
            <div>
              <span className="font-medium text-neutral-300 print:text-neutral-800">Aggravating factors: </span>
              {draft.aggravatingFactors}
            </div>
          )}
          {draft.relievingFactors && (
            <div>
              <span className="font-medium text-neutral-300 print:text-neutral-800">Relieving factors: </span>
              {draft.relievingFactors}
            </div>
          )}
          <div>
            <span className="font-medium text-neutral-300 print:text-neutral-800">Night pain: </span>
            {draft.nightPain ? "Yes" : "No"}
          </div>
        </div>

        {/* Joints assessed */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 print:text-neutral-600">Joints Assessed</div>
          {draft.selectedJoints.length === 0 ? (
            <div className="text-neutral-500">None selected.</div>
          ) : (
            <div>
              {draft.selectedJoints
                .map((j) => {
                  const cat = JOINT_CATEGORIES.find((c) => c.id === j.categoryId);
                  const label = cat?.label ?? j.categoryId;
                  const side = j.side === "L" ? "Left" : j.side === "R" ? "Right" : j.side === "bilateral" ? "Bilateral" : null;
                  return side ? `${label} (${side})` : label;
                })
                .join(", ")}
            </div>
          )}
        </div>

        {/* Special test results, grouped by joint, excluding Not Tested */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 print:text-neutral-600">Special Test Results</div>
          {draft.selectedJoints.map((joint) => {
            const cat = JOINT_CATEGORIES.find((c) => c.id === joint.categoryId);
            if (!cat) return null;
            const tested = Object.values(draft.testFindings).filter(
              (f) => f.result !== "not_tested" && TESTS.find((t) => t.id === f.testId && cat.regionIds.includes(t.r))
            );
            if (tested.length === 0) return null;
            return (
              <div key={joint.categoryId} className="flex flex-col gap-1">
                <div className="text-[11px] font-medium text-neutral-300 print:text-neutral-800">{cat.label}</div>
                <table className="w-full border-collapse text-[10px]">
                  <tbody>
                    {tested.map((f) => {
                      const test = TESTS.find((t) => t.id === f.testId);
                      const notable = NOTABLE_RESULTS.includes(f.result);
                      return (
                        <tr key={f.testId} className="border-b border-neutral-800/60 print:border-neutral-300">
                          <td className="py-1 pr-2 text-neutral-300 print:text-neutral-800">{test?.n ?? f.testId}</td>
                          <td className="py-1 pr-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                                notable
                                  ? "bg-red-900/50 text-red-300 print:bg-red-100 print:text-red-700"
                                  : "bg-neutral-800 text-neutral-300 print:bg-neutral-100 print:text-neutral-700"
                              }`}
                            >
                              {TEST_RESULT_LABELS[f.result]}
                            </span>
                          </td>
                          <td className="py-1 text-neutral-500">{f.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {Object.values(draft.testFindings).every((f) => f.result === "not_tested") && (
            <div className="text-neutral-500">No tests recorded.</div>
          )}
        </div>

        {/* Clinical impression — visible textarea on screen, static mirror at print time */}
        <div className="flex flex-col gap-1">
          {suggestions.length > 0 && (
            <div className="print:hidden mb-1 flex flex-col gap-1.5 rounded-md border border-teal-700/40 bg-teal-900/10 px-2.5 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-500">
                Suggested impression — from positive tests, insert &amp; edit as needed
              </div>
              <div className="flex flex-col gap-1">
                {suggestions.map((s) => {
                  const text = `${s.regionName} — ${s.cat} (positive: ${s.testNames.join(", ")})`;
                  return (
                    <button
                      key={`${s.regionName}::${s.cat}`}
                      type="button"
                      onClick={() => insertSuggestion(text)}
                      className="rounded border border-neutral-700 bg-neutral-800/40 px-2 py-1.5 text-left text-[11px] text-neutral-200 transition hover:border-teal-600/60 hover:bg-teal-900/20"
                    >
                      + {text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="print:hidden">
            <TextAreaField
              label="Clinical Impression"
              value={draft.clinicalImpression}
              onChange={setClinicalImpression}
              placeholder="Clinician-authored impression — this tool does not auto-generate a diagnosis."
              rows={4}
            />
          </div>
          <div className="hidden print:block">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 print:text-neutral-600">Clinical Impression</div>
            <div className="whitespace-pre-wrap text-neutral-200 print:text-neutral-900">{draft.clinicalImpression || "—"}</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="print:hidden w-full rounded-md border border-teal-700/50 bg-teal-900/20 px-3 py-2 text-[12px] font-semibold text-teal-400 transition hover:bg-teal-900/40"
      >
        Print / Export PDF
      </button>

      <button
        type="button"
        onClick={() => {
          if (window.confirm("Start a new assessment? This discards the current draft.")) startNewAssessment();
        }}
        className="print:hidden w-full rounded-md border border-neutral-700 px-3 py-2 text-[11px] font-medium text-neutral-400 transition hover:border-red-700/60 hover:text-red-400"
      >
        Start New Assessment
      </button>
    </div>
  );
}
