"use client";

import { useState } from "react";

export function Footer() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-ink-800 bg-ink-900 px-4 text-[10px] text-ink-500">
        <div className="min-w-0 truncate">
          © {new Date().getFullYear()} Human Biomechanics Simulator.
          <span className="hidden sm:inline"> For education and clinical reference only — not a diagnostic device.</span>
        </div>
        <button
          onClick={() => setShowAbout(true)}
          className="shrink-0 text-ink-400 transition hover:text-brand-400"
        >
          About us
        </button>
      </footer>

      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="mx-4 max-w-md rounded-lg border border-ink-700 bg-ink-900 p-5 text-ink-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-[14px] font-semibold">About this simulator</div>
            <p className="mb-3 text-[12px] leading-relaxed text-ink-400">
              A clinically-driven 3D articulated ROM engine built to demonstrate normal joint
              motion, provocative special tests, and functional postures for physiotherapy and
              orthopedic education. Every joint&apos;s axis convention and rotation sign was
              individually verified against real anatomical movement, not assumed.
            </p>
            <p className="mb-4 text-[11px] leading-relaxed text-ink-500">
              Anatomical geometry sourced from the Z-Anatomy atlas (CC-BY-SA). Rig, articulation
              logic, and application built for this project.
            </p>
            <button
              onClick={() => setShowAbout(false)}
              className="w-full rounded-md border border-brand-700/50 bg-brand-900/20 px-2.5 py-1.5 text-[12px] font-medium text-brand-400 transition hover:bg-brand-900/40"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
