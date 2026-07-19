"use client";

import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import {
  DURATION_LABELS,
  ONSET_CHIP_LABELS,
  RED_FLAG_LABELS,
  type OnsetChip,
  type PainDuration,
  type RedFlags,
} from "@/lib/assessment";
import { DegreeSlider } from "@/components/DegreeSlider";
import { ChipButton, SectionLabel, TextAreaField } from "./shared";

const DURATION_OPTIONS = Object.keys(DURATION_LABELS) as PainDuration[];
const ONSET_OPTIONS = Object.keys(ONSET_CHIP_LABELS) as OnsetChip[];
const RED_FLAG_KEYS = Object.keys(RED_FLAG_LABELS) as (keyof RedFlags)[];

function PainSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-800/50 p-2">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-[11px] font-medium text-neutral-200">{label}</div>
        <div className="font-mono text-[11px] tabular-nums text-teal-400">{value}/10</div>
      </div>
      <DegreeSlider value={value} min={0} max={10} onChange={onChange} />
    </div>
  );
}

export function Step2ChiefComplaint() {
  const draft = usePatientAssessmentStore((s) => s.draft);
  const setPatientField = usePatientAssessmentStore((s) => s.setPatientField);
  const toggleOnsetChip = usePatientAssessmentStore((s) => s.toggleOnsetChip);
  const toggleRedFlag = usePatientAssessmentStore((s) => s.toggleRedFlag);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <SectionLabel>Subjective Assessment</SectionLabel>

      <TextAreaField
        label="Chief Complaint"
        value={draft.chiefComplaint}
        onChange={(v) => setPatientField("chiefComplaint", v)}
        placeholder="e.g. Right shoulder pain when reaching overhead, 6/10 at worst"
      />
      <TextAreaField
        label="Mechanism of Injury"
        value={draft.mechanismOfInjury}
        onChange={(v) => setPatientField("mechanismOfInjury", v)}
        placeholder="e.g. Fell onto outstretched hand 3 weeks ago; or gradual onset, no trauma"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-neutral-300">Onset (optional)</span>
        <div className="grid grid-cols-2 gap-1">
          {ONSET_OPTIONS.map((chip) => (
            <ChipButton key={chip} checked={draft.onsetChips.includes(chip)} onClick={() => toggleOnsetChip(chip)}>
              {ONSET_CHIP_LABELS[chip]}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-neutral-300">Duration</span>
        <div className="grid grid-cols-1 gap-1">
          {DURATION_OPTIONS.map((d) => (
            <ChipButton
              key={d}
              checked={draft.duration === d}
              onClick={() => setPatientField("duration", d)}
              showCheckbox={false}
            >
              {DURATION_LABELS[d]}
            </ChipButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-neutral-300">Pain Score (0–10)</span>
        <PainSlider label="At rest" value={draft.painAtRest} onChange={(v) => setPatientField("painAtRest", v)} />
        <PainSlider label="At worst" value={draft.painAtWorst} onChange={(v) => setPatientField("painAtWorst", v)} />
        <PainSlider
          label="On movement"
          value={draft.painWithMovement}
          onChange={(v) => setPatientField("painWithMovement", v)}
        />
      </div>

      <TextAreaField
        label="Aggravating Factors"
        value={draft.aggravatingFactors}
        onChange={(v) => setPatientField("aggravatingFactors", v)}
        placeholder="e.g. Overhead reaching, lifting, lying on affected side"
        rows={2}
      />
      <TextAreaField
        label="Relieving Factors"
        value={draft.relievingFactors}
        onChange={(v) => setPatientField("relievingFactors", v)}
        placeholder="e.g. Rest, ice, avoiding overhead activity"
        rows={2}
      />

      <TextAreaField
        label="Past Medical/Surgical History"
        value={draft.pastMedicalHistory}
        onChange={(v) => setPatientField("pastMedicalHistory", v)}
        placeholder="e.g. Type 2 diabetes; right rotator cuff repair (2019)"
        rows={2}
      />
      <TextAreaField
        label="Current Medications"
        value={draft.currentMedications}
        onChange={(v) => setPatientField("currentMedications", v)}
        placeholder="e.g. Metformin 500mg BID; Ibuprofen PRN"
        rows={2}
      />
      <TextAreaField
        label="Social/Occupational History"
        value={draft.socialOccupationalHistory}
        onChange={(v) => setPatientField("socialOccupationalHistory", v)}
        placeholder="e.g. Office worker, right-hand dominant, recreational tennis"
        rows={2}
      />

      <div className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800/40 px-2.5 py-1.5">
        <span className="text-[11px] font-medium text-neutral-300">Night Pain</span>
        <button
          type="button"
          role="switch"
          aria-checked={draft.nightPain}
          aria-label="Toggle night pain"
          onClick={() => setPatientField("nightPain", !draft.nightPain)}
          data-on={draft.nightPain}
          className="flex h-6 w-11 shrink-0 items-center rounded-full border border-neutral-700 bg-neutral-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 data-[on=true]:justify-end data-[on=true]:border-teal-600 data-[on=true]:bg-teal-600"
        >
          <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-red-400">Red Flag Screening</span>
        <div className="grid grid-cols-1 gap-1">
          {RED_FLAG_KEYS.map((key) => (
            <ChipButton key={key} checked={draft.redFlags[key]} onClick={() => toggleRedFlag(key)}>
              {RED_FLAG_LABELS[key]}
            </ChipButton>
          ))}
        </div>
      </div>
    </div>
  );
}
