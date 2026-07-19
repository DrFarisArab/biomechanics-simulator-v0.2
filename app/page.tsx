"use client";

import dynamic from "next/dynamic";
import { Sidebar } from "@/components/Sidebar";
import { PresetMenu } from "@/components/PresetMenu";
import { SpecialTests } from "@/components/SpecialTests";
import { RecordReplayPanel } from "@/components/RecordReplayPanel";
import { PatientAssessmentPanel } from "@/components/PatientAssessment/PatientAssessmentPanel";
import { CommandBox } from "@/components/CommandBox";
import { ViewportTabsDock } from "@/components/ViewportTabsDock";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const specialTestsOpen = useArmSimStore((s) => s.specialTestsOpen);
  const recordReplayOpen = useRecordReplayStore((s) => s.panelOpen);
  const patientAssessmentOpen = usePatientAssessmentStore((s) => s.panelOpen);

  return (
    <div className="flex h-screen w-screen flex-col bg-ink-950 text-ink-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-900 px-4">
        <div className="flex items-center">
          <div className="text-[13px] font-semibold tracking-tight">Human Biomechanics Simulator</div>
          <div className="ml-2 rounded bg-brand-900/40 px-1.5 py-0.5 text-[10px] font-medium text-brand-400">
            v0.2 · full body
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="h-4 w-px bg-ink-800" />
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                showJointMarkers ? "text-brand-400" : "text-ink-500"
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
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600"
            >
              <span className="h-4 w-4 rounded-full bg-ink-50 shadow-sm transition-transform" />
            </button>
          </div>
          <div className="h-4 w-px bg-ink-800" />
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                appearance === "muscles" ? "text-ink-700" : showSkin ? "text-brand-400" : "text-ink-500"
              }`}
            >
              Skin
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showSkin}
              aria-label="Toggle translucent reference skin overlay"
              disabled={appearance === "muscles"}
              title={appearance === "muscles" ? "Skin overlay is only available on the skeleton model" : undefined}
              onClick={() => setShowSkin(!showSkin)}
              data-on={showSkin}
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="h-4 w-4 rounded-full bg-ink-50 shadow-sm transition-transform" />
            </button>
          </div>
          <div className="h-4 w-px bg-ink-800" />
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                appearance === "skeleton" ? "text-brand-400" : "text-ink-500"
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
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600"
            >
              <span className="h-4 w-4 rounded-full bg-ink-50 shadow-sm transition-transform" />
            </button>
            <span
              className={`text-[11px] font-medium transition ${
                appearance === "muscles" ? "text-brand-400" : "text-ink-500"
              }`}
            >
              Muscles
            </span>
          </div>
          <div className="h-4 w-px bg-ink-800" />
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-medium transition ${
                showCommandBox ? "text-brand-400" : "text-ink-500"
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
              className="flex h-6 w-11 shrink-0 items-center rounded-full border border-ink-700 bg-ink-800 p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 data-[on=true]:justify-end data-[on=true]:border-brand-600 data-[on=true]:bg-brand-600"
            >
              <span className="h-4 w-4 rounded-full bg-ink-50 shadow-sm transition-transform" />
            </button>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <PresetMenu />
        <main className="relative min-w-0 flex-1">
          <Scene />
          <CommandBox />
          <ViewportTabsDock />
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
