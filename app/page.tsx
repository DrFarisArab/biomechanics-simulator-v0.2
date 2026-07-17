"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/Sidebar";
import { PresetMenu } from "@/components/PresetMenu";
import { SpecialTests } from "@/components/SpecialTests";
import { RecordReplayPanel } from "@/components/RecordReplayPanel";
import { PatientAssessmentPanel } from "@/components/PatientAssessment/PatientAssessmentPanel";
import { CommandBox } from "@/components/CommandBox";
import { Footer } from "@/components/Footer";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";

const Scene = dynamic(() => import("@/components/Scene").then((m) => m.Scene), { ssr: false });

export default function Home() {
  const appearance = useArmSimStore((s) => s.appearance);
  const setAppearance = useArmSimStore((s) => s.setAppearance);
  const showSkin = useArmSimStore((s) => s.showSkin);
  const setShowSkin = useArmSimStore((s) => s.setShowSkin);
  const showJointMarkers = useArmSimStore((s) => s.showJointMarkers);
  const setShowJointMarkers = useArmSimStore((s) => s.setShowJointMarkers);
  const showCommandBox = useArmSimStore((s) => s.showCommandBox);
  const setShowCommandBox = useArmSimStore((s) => s.setShowCommandBox);
  const resetAll = useArmSimStore((s) => s.resetAll);
  const specialTestsOpen = useArmSimStore((s) => s.specialTestsOpen);
  const setSpecialTestsOpen = useArmSimStore((s) => s.setSpecialTestsOpen);
  const recordReplayOpen = useRecordReplayStore((s) => s.panelOpen);
  const setRecordReplayOpen = useRecordReplayStore((s) => s.setPanelOpen);
  const patientAssessmentOpen = usePatientAssessmentStore((s) => s.panelOpen);
  const setPatientAssessmentOpen = usePatientAssessmentStore((s) => s.setPanelOpen);
  const openOrResumeAssessment = usePatientAssessmentStore((s) => s.openOrResumeAssessment);

  return (
    <div className="flex h-screen w-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4">
        <div className="flex items-center">
          <div className="text-[13px] font-semibold tracking-tight">Human Biomechanics Simulator</div>
          <div className="ml-2 rounded bg-teal-900/40 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">
            v0.2 · full body
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                showJointMarkers ? "text-teal-400" : "text-neutral-500"
              }`}
            >
              Markers
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showJointMarkers}
              aria-label="Toggle joint markers"
              onClick={() => setShowJointMarkers(!showJointMarkers)}
              data-on={showJointMarkers}
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-neutral-700 bg-neutral-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 data-[on=true]:justify-end data-[on=true]:border-teal-600 data-[on=true]:bg-teal-600"
            >
              <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
            </button>
          </div>
          <div className="h-4 w-px bg-neutral-800" />
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium transition ${showSkin ? "text-teal-400" : "text-neutral-500"}`}>
              Skin
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showSkin}
              aria-label="Toggle translucent reference skin overlay"
              onClick={() => setShowSkin(!showSkin)}
              data-on={showSkin}
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-neutral-700 bg-neutral-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 data-[on=true]:justify-end data-[on=true]:border-teal-600 data-[on=true]:bg-teal-600"
            >
              <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
            </button>
          </div>
          <div className="h-4 w-px bg-neutral-800" />
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                appearance === "skeleton" ? "text-teal-400" : "text-neutral-500"
              }`}
            >
              Skeleton
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={appearance === "muscles"}
              aria-label="Toggle between skeleton and muscles view"
              onClick={() => setAppearance(appearance === "skeleton" ? "muscles" : "skeleton")}
              data-on={appearance === "muscles"}
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-neutral-700 bg-neutral-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 data-[on=true]:justify-end data-[on=true]:border-teal-600 data-[on=true]:bg-teal-600"
            >
              <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
            </button>
            <span
              className={`text-[11px] font-medium transition ${
                appearance === "muscles" ? "text-teal-400" : "text-neutral-500"
              }`}
            >
              Muscles
            </span>
          </div>
          <div className="h-4 w-px bg-neutral-800" />
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                showCommandBox ? "text-teal-400" : "text-neutral-500"
              }`}
            >
              Command box
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showCommandBox}
              aria-label="Toggle the pose command box"
              onClick={() => setShowCommandBox(!showCommandBox)}
              data-on={showCommandBox}
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-neutral-700 bg-neutral-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 data-[on=true]:justify-end data-[on=true]:border-teal-600 data-[on=true]:bg-teal-600"
            >
              <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
            </button>
          </div>
          <button
            onClick={() => {
              setSpecialTestsOpen(!specialTestsOpen);
              if (!specialTestsOpen) {
                setRecordReplayOpen(false);
                setPatientAssessmentOpen(false);
              }
            }}
            aria-pressed={specialTestsOpen}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
              specialTestsOpen
                ? "border-teal-600/60 bg-teal-900/30 text-teal-400"
                : "border-neutral-700 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Special Tests
          </button>
          <button
            onClick={() => {
              setRecordReplayOpen(!recordReplayOpen);
              if (!recordReplayOpen) {
                setSpecialTestsOpen(false);
                setPatientAssessmentOpen(false);
              }
            }}
            aria-pressed={recordReplayOpen}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
              recordReplayOpen
                ? "border-teal-600/60 bg-teal-900/30 text-teal-400"
                : "border-neutral-700 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Record &amp; Replay
          </button>
          <button
            onClick={() => {
              if (patientAssessmentOpen) {
                setPatientAssessmentOpen(false);
                return;
              }
              setSpecialTestsOpen(false);
              setRecordReplayOpen(false);
              openOrResumeAssessment();
            }}
            aria-pressed={patientAssessmentOpen}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
              patientAssessmentOpen
                ? "border-teal-600/60 bg-teal-900/30 text-teal-400"
                : "border-neutral-700 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            New Patient
          </button>
          <button
            onClick={resetAll}
            className="rounded-md border border-teal-700/50 bg-teal-900/10 px-2.5 py-1.5 text-[11px] font-medium text-teal-400 transition hover:bg-teal-900/30"
          >
            Reset Pose
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <PresetMenu />
        <main className="relative min-w-0 flex-1">
          <Scene />
          <CommandBox />
        </main>
        {specialTestsOpen ? (
          <SpecialTests />
        ) : recordReplayOpen ? (
          <RecordReplayPanel />
        ) : patientAssessmentOpen ? (
          <PatientAssessmentPanel />
        ) : (
          <Sidebar />
        )}
      </div>
      <Footer />
    </div>
  );
}
