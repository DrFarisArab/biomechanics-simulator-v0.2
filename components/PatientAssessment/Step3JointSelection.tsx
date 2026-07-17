"use client";

import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import { JOINT_CATEGORIES, type Side } from "@/lib/assessment";
import { ChipButton, SectionLabel } from "./shared";

const SIDE_OPTIONS: { value: Side | "bilateral"; label: string }[] = [
  { value: "L", label: "Left" },
  { value: "R", label: "Right" },
  { value: "bilateral", label: "Bilateral" },
];

export function Step3JointSelection() {
  const draft = usePatientAssessmentStore((s) => s.draft);
  const toggleJointCategory = usePatientAssessmentStore((s) => s.toggleJointCategory);
  const setJointSide = usePatientAssessmentStore((s) => s.setJointSide);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <SectionLabel>Joint / Region Selection</SectionLabel>
      <div className="text-[11px] leading-relaxed text-neutral-300">
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
