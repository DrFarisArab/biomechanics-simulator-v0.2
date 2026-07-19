"use client";

import { useMemo, useState, type ReactNode } from "react";
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

// A boxed field, deliberately styled to echo the wizard's own TextField/
// TextAreaField boxes (small uppercase label above, bordered rounded box
// below) — the report reads as a filled-in rendering of the same boxes the
// clinician typed into, rather than a different, unfamiliar layout.
function Box({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 print:border-neutral-300 print:bg-neutral-50">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500 print:text-neutral-500">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-neutral-200 print:text-neutral-900">
        {children}
      </div>
    </div>
  );
}

// Top-level section divider — a colored accent bar + bold uppercase title,
// one visual step more prominent than Box's own field labels, so the report
// reads in a clear hierarchy: section > box > value.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center border-l-2 border-teal-600 pl-2 print:border-teal-700">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 print:text-teal-700">{title}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function Step5Report() {
  const draft = usePatientAssessmentStore((s) => s.draft);
  const setClinicalImpression = usePatientAssessmentStore((s) => s.setClinicalImpression);
  const startNewAssessment = usePatientAssessmentStore((s) => s.startNewAssessment);
  const [docxState, setDocxState] = useState<"idle" | "generating" | "error">("idle");

  const redFlagsTriggered = hasRedFlag(draft.redFlags);
  const checkedRedFlags = (Object.keys(draft.redFlags) as (keyof RedFlags)[]).filter((k) => draft.redFlags[k]);
  const suggestions = useMemo(() => suggestImpressions(draft.testFindings), [draft.testFindings]);

  const insertSuggestion = (text: string) => {
    setClinicalImpression(draft.clinicalImpression ? `${draft.clinicalImpression}\n${text}` : text);
  };

  const hasVitals = !!(draft.vitalsBP || draft.vitalsHR || draft.vitalsRR);
  const hasObjectiveData =
    !!draft.observationGait ||
    !!draft.observationSwelling ||
    hasVitals ||
    !!draft.romNotes ||
    !!draft.mmtNotes ||
    !!draft.sensationNotes ||
    !!draft.reflexNotes ||
    !!draft.adlNotes;

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
            {(draft.heightCm != null || draft.weightKg != null) && (
              <span>
                {draft.heightCm != null ? `${draft.heightCm}cm` : ""}
                {draft.heightCm != null && draft.weightKg != null ? " / " : ""}
                {draft.weightKg != null ? `${draft.weightKg}kg` : ""}
              </span>
            )}
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

        {/* Subjective Assessment */}
        <Section title="Subjective Assessment">
          {draft.chiefComplaint && <Box label="Chief Complaint">{draft.chiefComplaint}</Box>}
          {draft.mechanismOfInjury && <Box label="Mechanism of Injury">{draft.mechanismOfInjury}</Box>}

          {(draft.duration || draft.onsetChips.length > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {draft.duration && <Box label="Duration">{DURATION_LABELS[draft.duration]}</Box>}
              {draft.onsetChips.length > 0 && (
                <Box label="Onset">{draft.onsetChips.map((c) => ONSET_CHIP_LABELS[c]).join(", ")}</Box>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Box label="Pain at Rest">{draft.painAtRest}/10</Box>
            <Box label="Pain at Worst">{draft.painAtWorst}/10</Box>
            <Box label="Pain on Movement">{draft.painWithMovement}/10</Box>
          </div>

          <Box label="Night Pain">{draft.nightPain ? "Yes" : "No"}</Box>

          {draft.aggravatingFactors && <Box label="Aggravating Factors">{draft.aggravatingFactors}</Box>}
          {draft.relievingFactors && <Box label="Relieving Factors">{draft.relievingFactors}</Box>}
          {draft.pastMedicalHistory && <Box label="Past Medical/Surgical History">{draft.pastMedicalHistory}</Box>}
          {draft.currentMedications && <Box label="Current Medications">{draft.currentMedications}</Box>}
          {draft.socialOccupationalHistory && (
            <Box label="Social/Occupational History">{draft.socialOccupationalHistory}</Box>
          )}
        </Section>

        {/* Objective Assessment */}
        {hasObjectiveData && (
          <Section title="Objective Assessment">
            {draft.observationGait && (
              <Box label="Posture, Gait Analysis, Transfers, Balance">{draft.observationGait}</Box>
            )}
            {draft.observationSwelling && <Box label="Swelling/Muscle Atrophy">{draft.observationSwelling}</Box>}

            {hasVitals && (
              <div className="grid grid-cols-3 gap-2">
                <Box label="Blood Pressure">{draft.vitalsBP || "—"}</Box>
                <Box label="Heart Rate">{draft.vitalsHR || "—"}</Box>
                <Box label="Respiratory Rate">{draft.vitalsRR || "—"}</Box>
              </div>
            )}

            {draft.romNotes && <Box label="Range of Motion (ROM)">{draft.romNotes}</Box>}
            {draft.mmtNotes && <Box label="Manual Muscle Testing (MMT)">{draft.mmtNotes}</Box>}
            {draft.sensationNotes && <Box label="Deep/Superficial Sensation">{draft.sensationNotes}</Box>}
            {draft.reflexNotes && <Box label="Reflex Testing">{draft.reflexNotes}</Box>}
            {draft.adlNotes && <Box label="Affected Activities of Daily Living (ADLs)">{draft.adlNotes}</Box>}
          </Section>
        )}

        {/* Joints & Special Tests */}
        <Section title="Special Tests">
          <Box label="Joints Assessed">
            {draft.selectedJoints.length === 0 ? (
              <span className="text-neutral-500">None selected.</span>
            ) : (
              draft.selectedJoints
                .map((j) => {
                  const cat = JOINT_CATEGORIES.find((c) => c.id === j.categoryId);
                  const label = cat?.label ?? j.categoryId;
                  const side = j.side === "L" ? "Left" : j.side === "R" ? "Right" : j.side === "bilateral" ? "Bilateral" : null;
                  return side ? `${label} (${side})` : label;
                })
                .join(", ")
            )}
          </Box>

          {draft.selectedJoints.map((joint) => {
            const cat = JOINT_CATEGORIES.find((c) => c.id === joint.categoryId);
            if (!cat) return null;
            const tested = Object.values(draft.testFindings).filter(
              (f) => f.result !== "not_tested" && TESTS.find((t) => t.id === f.testId && cat.regionIds.includes(t.r))
            );
            if (tested.length === 0) return null;
            return (
              <div
                key={joint.categoryId}
                className="rounded-md border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 print:border-neutral-300 print:bg-neutral-50"
              >
                <div className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500 print:text-neutral-500">
                  {cat.label} — Test Results
                </div>
                <table className="mt-1 w-full border-collapse text-[10px]">
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
        </Section>

        {/* Clinical impression — visible textarea on screen, static box at print time */}
        <Section title="Clinical Impression">
          {suggestions.length > 0 && (
            <div className="print:hidden flex flex-col gap-1.5 rounded-md border border-teal-700/40 bg-teal-900/10 px-2.5 py-2">
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
            <Box label="Clinical Impression">{draft.clinicalImpression || "—"}</Box>
          </div>
        </Section>
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
        disabled={docxState === "generating"}
        onClick={async () => {
          setDocxState("generating");
          try {
            // Dynamically imported (not a top-level import) so the ~100KB
            // `docx` library only downloads when someone actually clicks this
            // — it would otherwise inflate the app's initial bundle for every
            // visitor, most of whom never touch this button.
            const { generateReportDocx, downloadDocxBlob } = await import("@/lib/generateReportDocx");
            const blob = await generateReportDocx(draft);
            const fileName = `${(draft.patientName || "assessment").replace(/[^a-z0-9]+/gi, "_")}_${draft.assessmentDate}.docx`;
            downloadDocxBlob(blob, fileName);
            setDocxState("idle");
          } catch {
            setDocxState("error");
          }
        }}
        className="print:hidden w-full rounded-md border border-teal-700/50 bg-teal-900/20 px-3 py-2 text-[12px] font-semibold text-teal-400 transition hover:bg-teal-900/40 disabled:cursor-wait disabled:opacity-60"
      >
        {docxState === "generating" ? "Generating…" : "Generate DOCX (with letterhead)"}
      </button>
      {docxState === "error" && (
        <div className="print:hidden -mt-1 text-[10px] text-red-400">
          Couldn&apos;t generate the DOCX — check your connection and try again.
        </div>
      )}

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
