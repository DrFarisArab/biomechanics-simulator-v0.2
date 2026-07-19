"use client";

import type { ReactNode } from "react";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";

function PatientIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="6.5" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 13.5c0-2.49 2.01-4 4.5-4s4.5 1.51 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 4.5v4M10.5 6.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TestsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <rect x="3" y="2.5" width="10" height="11.5" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 2.2h4a.6.6 0 01.6.6v.6a.6.6 0 01-.6.6H6a.6.6 0 01-.6-.6v-.6a.6.6 0 01.6-.6z" fill="currentColor" />
      <path d="M5.3 8.3l1.3 1.3 2.6-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.3 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function RecordIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
      <circle cx="8" cy="8" r="5.7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2.4" fill="currentColor" />
    </svg>
  );
}

function DockButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition ${
        active ? "bg-teal-600 text-white shadow-sm" : "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Floating pill dock over the bottom-center of the viewport — replaces the
// three panel-toggle buttons that used to live in the top header. Order and
// short labels per the redesign: New Patient, Special Tests, Record, each
// toggling one of the three mutually-exclusive right-side panels (closing
// the other two, same three-way exclusion the header buttons already did).
export function ViewportTabsDock() {
  const specialTestsOpen = useArmSimStore((s) => s.specialTestsOpen);
  const setSpecialTestsOpen = useArmSimStore((s) => s.setSpecialTestsOpen);
  const recordReplayOpen = useRecordReplayStore((s) => s.panelOpen);
  const setRecordReplayOpen = useRecordReplayStore((s) => s.setPanelOpen);
  const patientAssessmentOpen = usePatientAssessmentStore((s) => s.panelOpen);
  const setPatientAssessmentOpen = usePatientAssessmentStore((s) => s.setPanelOpen);
  const openOrResumeAssessment = usePatientAssessmentStore((s) => s.openOrResumeAssessment);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/90 p-1 shadow-lg backdrop-blur">
        <DockButton
          active={patientAssessmentOpen}
          icon={<PatientIcon />}
          label="Patient"
          onClick={() => {
            if (patientAssessmentOpen) {
              setPatientAssessmentOpen(false);
              return;
            }
            setSpecialTestsOpen(false);
            setRecordReplayOpen(false);
            openOrResumeAssessment();
          }}
        />
        <DockButton
          active={specialTestsOpen}
          icon={<TestsIcon />}
          label="Tests"
          onClick={() => {
            setSpecialTestsOpen(!specialTestsOpen);
            if (!specialTestsOpen) {
              setRecordReplayOpen(false);
              setPatientAssessmentOpen(false);
            }
          }}
        />
        <DockButton
          active={recordReplayOpen}
          icon={<RecordIcon />}
          label="Record"
          onClick={() => {
            setRecordReplayOpen(!recordReplayOpen);
            if (!recordReplayOpen) {
              setSpecialTestsOpen(false);
              setPatientAssessmentOpen(false);
            }
          }}
        />
      </div>
    </div>
  );
}
