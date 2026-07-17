"use client";

import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import type { DominantHand, Sex } from "@/lib/assessment";
import { ChipButton, NumberField, SectionLabel, TextField } from "./shared";

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];

const HAND_OPTIONS: { value: DominantHand; label: string }[] = [
  { value: "R", label: "Right" },
  { value: "L", label: "Left" },
  { value: "ambidextrous", label: "Ambidextrous" },
];

export function Step1PatientInfo() {
  const draft = usePatientAssessmentStore((s) => s.draft);
  const setPatientField = usePatientAssessmentStore((s) => s.setPatientField);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <SectionLabel>Patient Information</SectionLabel>

      <TextField label="Name" value={draft.patientName} onChange={(v) => setPatientField("patientName", v)} />

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Age" value={draft.age} onChange={(v) => setPatientField("age", v)} />
        <TextField label="Occupation" value={draft.occupation} onChange={(v) => setPatientField("occupation", v)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-neutral-300">Sex</span>
        <div className="grid grid-cols-2 gap-1">
          {SEX_OPTIONS.map((opt) => (
            <ChipButton
              key={opt.value}
              checked={draft.sex === opt.value}
              onClick={() => setPatientField("sex", opt.value)}
              showCheckbox={false}
            >
              {opt.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Height" suffix="cm" value={draft.heightCm} onChange={(v) => setPatientField("heightCm", v)} />
        <NumberField label="Weight" suffix="kg" value={draft.weightKg} onChange={(v) => setPatientField("weightKg", v)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-neutral-300">Dominant Hand</span>
        <div className="grid grid-cols-3 gap-1">
          {HAND_OPTIONS.map((opt) => (
            <ChipButton
              key={opt.value}
              checked={draft.dominantHand === opt.value}
              onClick={() => setPatientField("dominantHand", opt.value)}
              showCheckbox={false}
            >
              {opt.label}
            </ChipButton>
          ))}
        </div>
      </div>

      <TextField
        label="Assessment Date"
        type="date"
        value={draft.assessmentDate}
        onChange={(v) => setPatientField("assessmentDate", v)}
      />
    </div>
  );
}
