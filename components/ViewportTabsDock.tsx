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

function JointsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="4" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="4" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="m5.7 7.2 4.6-2.3M5.7 8.8l4.6 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
        active ? "bg-brand-600 text-brand-50 shadow-sm" : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Floating pill dock over the bottom-center of the viewport. The Joints tab
// is also the explicit phone entry point for the otherwise hidden Sidebar.
export function ViewportTabsDock({
  jointsActive,
  onOpenJoints,
  onCloseJoints,
}: {
  jointsActive: boolean;
  onOpenJoints: () => void;
  onCloseJoints: () => void;
}) {
  const specialTestsOpen = useArmSimStore((s) => s.specialTestsOpen);
  const setSpecialTestsOpen = useArmSimStore((s) => s.setSpecialTestsOpen);
  const recordReplayOpen = useRecordReplayStore((s) => s.panelOpen);
  const setRecordReplayOpen = useRecordReplayStore((s) => s.setPanelOpen);
  const patientAssessmentOpen = usePatientAssessmentStore((s) => s.panelOpen);
  const setPatientAssessmentOpen = usePatientAssessmentStore((s) => s.setPanelOpen);
  const openOrResumeAssessment = usePatientAssessmentStore((s) => s.openOrResumeAssessment);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-11 z-30 flex justify-center sm:absolute sm:bottom-4 sm:z-auto">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/90 p-1 shadow-lg shadow-black/20 backdrop-blur">
        <DockButton
          active={patientAssessmentOpen}
          icon={<PatientIcon />}
          label="Patient"
          onClick={() => {
            if (patientAssessmentOpen) {
              setPatientAssessmentOpen(false);
              return;
            }
            onCloseJoints();
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
              onCloseJoints();
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
              onCloseJoints();
              setSpecialTestsOpen(false);
              setPatientAssessmentOpen(false);
            }
          }}
        />
        <DockButton
          active={jointsActive}
          icon={<JointsIcon />}
          label="Joints"
          onClick={onOpenJoints}
        />
      </div>
    </div>
  );
}
