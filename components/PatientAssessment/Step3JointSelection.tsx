"use client";

import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import { JOINT_CATEGORIES, type Side } from "@/lib/assessment";
import { ChipButton, SectionLabel, TextAreaField, TextField } from "./shared";

const SIDE_OPTIONS: { value: Side | "bilateral"; label: string }[] = [
  { value: "L", label: "Left" },
  { value: "R", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
];

export function Step3JointSelection() {
  const draft = usePatientAssessmentStore((s) => s.draft);
  const setPatientField = usePatientAssessmentStore((s) => s.setPatientField);
  const toggleJointCategory = usePatientAssessmentStore((s) => s.toggleJointCategory);
  const setJointSide = usePatientAssessmentStore((s) => s.setJointSide);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div className="text-[13px] font-semibold text-ink-100">Objective Assessment</div>

      <SectionLabel>Observation</SectionLabel>

      <TextAreaField
        label="Posture, Gait Analysis, Transfers, Balance"
        value={draft.observationGait}
        onChange={(v) => setPatientField("observationGait", v)}
        placeholder="e.g. Antalgic gait, guarded right shoulder, independent transfers, balance intact"
        rows={2}
      />
      <TextAreaField
        label="Swelling/Muscle Atrophy"
        value={draft.observationSwelling}
        onChange={(v) => setPatientField("observationSwelling", v)}
        placeholder="e.g. Mild swelling right knee; quadriceps atrophy noted"
        rows={2}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-ink-300">Vital Signs</span>
        <div className="grid grid-cols-3 gap-2">
          <TextField
            label="Blood Pressure"
            value={draft.vitalsBP}
            onChange={(v) => setPatientField("vitalsBP", v)}
            placeholder="120/80"
          />
          <TextField
            label="Heart Rate"
            value={draft.vitalsHR}
            onChange={(v) => setPatientField("vitalsHR", v)}
            placeholder="72 bpm"
          />
          <TextField
            label="Respiratory Rate"
            value={draft.vitalsRR}
            onChange={(v) => setPatientField("vitalsRR", v)}
            placeholder="16/min"
          />
        </div>
      </div>

      <TextAreaField
        label="Range of Motion (ROM)"
        value={draft.romNotes}
        onChange={(v) => setPatientField("romNotes", v)}
        placeholder="Active (AROM) and Passive (PROM), e.g. Shoulder flexion AROM 120°/PROM 150°"
        rows={3}
      />
      <TextAreaField
        label="Manual Muscle Testing (MMT)"
        value={draft.mmtNotes}
        onChange={(v) => setPatientField("mmtNotes", v)}
        placeholder="e.g. Shoulder abduction 4/5, external rotation 4-/5"
        rows={2}
      />
      <TextAreaField
        label="Deep/Superficial Sensation"
        value={draft.sensationNotes}
        onChange={(v) => setPatientField("sensationNotes", v)}
        placeholder="e.g. Intact to light touch C5-T1 dermatomes"
        rows={2}
      />
      <TextAreaField
        label="Reflex Testing"
        value={draft.reflexNotes}
        onChange={(v) => setPatientField("reflexNotes", v)}
        placeholder="e.g. Biceps 2+, triceps 2+, brachioradialis 2+"
        rows={2}
      />
      <TextAreaField
        label="Affected Activities of Daily Living (ADLs)"
        value={draft.adlNotes}
        onChange={(v) => setPatientField("adlNotes", v)}
        placeholder="e.g. Difficulty dressing, reaching overhead, lifting groceries"
        rows={2}
      />

      <SectionLabel>Special Tests</SectionLabel>
      <div className="text-[11px] leading-relaxed text-ink-300">
        Select every joint/region relevant to this visit. Step 4 will only show special tests for what you pick here.
      </div>

      <div className="flex flex-col gap-1.5">
        {JOINT_CATEGORIES.map((cat) => {
          const selected = draft.selectedJoints.find((j) => j.categoryId === cat.id);
          const checked = !!selected;
          return (
            <div key={cat.id} className="flex flex-col gap-1">
              <ChipButton checked={checked} onClick={() => toggleJointCategory(cat.id)}>
                {cat.label}
              </ChipButton>
              {checked && cat.sided && (
                <div className="ml-2 grid grid-cols-3 gap-1">
                  {SIDE_OPTIONS.map((opt) => (
                    <ChipButton
                      key={opt.value}
                      checked={selected!.side === opt.value}
                      onClick={() => setJointSide(cat.id, opt.value)}
                      showCheckbox={false}
                    >
                      {opt.label}
                    </ChipButton>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
