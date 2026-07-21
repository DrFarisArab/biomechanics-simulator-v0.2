"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PresetMenu } from "@/components/PresetMenu";
import { SpecialTests } from "@/components/SpecialTests";
import { RecordReplayPanel } from "@/components/RecordReplayPanel";
import { PatientAssessmentPanel } from "@/components/PatientAssessment/PatientAssessmentPanel";
import { CommandBox } from "@/components/CommandBox";
import { ViewportTabsDock } from "@/components/ViewportTabsDock";
import { Toolbar } from "@/components/Toolbar";
import { MobileSheet } from "@/components/MobileSheet";
import { Footer } from "@/components/Footer";
import { MovementSummaryPanel } from "@/components/MovementSummaryPanel";
import { useIsPhone } from "@/lib/useMediaQuery";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";

const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), { ssr: false });

export default function Home() {
  const specialTestsOpen = useArmSimStore((s) => s.specialTestsOpen);
  const setSpecialTestsOpen = useArmSimStore((s) => s.setSpecialTestsOpen);
  const selectedJoint = useArmSimStore((s) => s.selectedJoint);
  const selectJoint = useArmSimStore((s) => s.selectJoint);
  const gravityEnabled = useArmSimStore((s) => s.gravityEnabled);
  const setGravityEnabled = useArmSimStore((s) => s.setGravityEnabled);
  const recordReplayOpen = useRecordReplayStore((s) => s.panelOpen);
  const setRecordReplayOpen = useRecordReplayStore((s) => s.setPanelOpen);
  const patientAssessmentOpen = usePatientAssessmentStore((s) => s.panelOpen);
  const setPatientAssessmentOpen = usePatientAssessmentStore((s) => s.setPanelOpen);
  const [jointListOpen, setJointListOpen] = useState(false);
  const [poseMenuOpen, setPoseMenuOpen] = useState(false);

  const isPhone = useIsPhone();

  // The one right-side panel that should be showing. The "overlay" panels
  // (Special Tests / Record / Patient) win over the default Sidebar, which
  // itself renders either the selected joint's DOF sliders or the
  // "No joint selected" hint.
  const overlayPanel = specialTestsOpen ? (
    <SpecialTests />
  ) : recordReplayOpen ? (
    <RecordReplayPanel />
  ) : patientAssessmentOpen ? (
    <PatientAssessmentPanel />
  ) : null;
  const sidePanel = overlayPanel ?? <Sidebar />;

  // On phone the Joints dock tab explicitly opens the otherwise hidden
  // default Sidebar, including its complete joint-selection list.
  const sheetOpen = overlayPanel !== null || selectedJoint !== null || jointListOpen;
  const jointsActive =
    overlayPanel === null &&
    !gravityEnabled &&
    (!isPhone || jointListOpen || selectedJoint !== null);

  const openJointList = () => {
    setSpecialTestsOpen(false);
    setRecordReplayOpen(false);
    setPatientAssessmentOpen(false);
    setGravityEnabled(false);
    selectJoint(null);
    setJointListOpen(true);
  };

  const closeActivePanel = () => {
    if (specialTestsOpen) setSpecialTestsOpen(false);
    else if (recordReplayOpen) setRecordReplayOpen(false);
    else if (patientAssessmentOpen) setPatientAssessmentOpen(false);
    else {
      setJointListOpen(false);
      if (selectedJoint) selectJoint(null);
    }
  };

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-ink-900 pl-safe pr-safe pt-safe pb-safe text-ink-100">
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-ink-800 bg-ink-900 px-4">
        <div className="flex min-w-0 items-center">
          <button
            type="button"
            aria-label="Open pose menu"
            aria-expanded={poseMenuOpen}
            onClick={() => setPoseMenuOpen((open) => !open)}
            className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-800 text-ink-300 transition hover:text-ink-100"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="truncate text-[13px] font-semibold tracking-tight">Human Biomechanics Simulator</div>
          <div className="ml-2 hidden shrink-0 rounded bg-brand-900/40 px-1.5 py-0.5 text-[10px] font-medium text-brand-400 sm:inline-block">
            v0.2 · full body
          </div>
        </div>
        <Toolbar />
      </header>
      <div className="relative flex min-h-0 flex-1">
        <PresetMenu open={poseMenuOpen} onOpenChange={setPoseMenuOpen} />
        <main className="relative min-w-0 flex-1">
          <Scene />
          <MovementSummaryPanel />
          <CommandBox />
          <ViewportTabsDock
            jointsActive={jointsActive}
            onOpenJoints={openJointList}
            onCloseJoints={() => setJointListOpen(false)}
          />
        </main>
        {/* Tablet + desktop: docked side panel. Phone renders it as a sheet
            instead. The `hidden sm:contents` wrapper keeps the column out of
            the layout below sm even during the one frame before `isPhone`
            settles — otherwise the panel's phone-width (w-full) briefly
            collapses <main> to zero and the canvas initializes blank. */}
        {!isPhone && <div className="hidden sm:contents">{sidePanel}</div>}
      </div>
      <Footer />

      {isPhone && (
        <MobileSheet open={sheetOpen} onClose={closeActivePanel}>
          {sidePanel}
        </MobileSheet>
      )}
    </div>
  );
}
