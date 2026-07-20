"use client";

import { useState, type ReactNode } from "react";

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M21 8.2a3 3 0 0 0-2.1-2.1C17.1 5.6 12 5.6 12 5.6s-5.1 0-6.9.5A3 3 0 0 0 3 8.2a31.3 31.3 0 0 0 0 7.6 3 3 0 0 0 2.1 2.1c1.8.5 6.9.5 6.9.5s5.1 0 6.9-.5a3 3 0 0 0 2.1-2.1 31.3 31.3 0 0 0 0-7.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m10 9.4 5 2.6-5 2.6V9.4Z" fill="currentColor" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.2" cy="7.8" r="1" fill="currentColor" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m5.2 7.4 6.8 5 6.8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContactLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-md border border-ink-700 bg-ink-800 text-ink-300 transition hover:border-brand-600/70 hover:text-brand-300"
    >
      {children}
    </a>
  );
}

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
            className="mx-4 max-h-[88dvh] max-w-md overflow-y-auto rounded-lg border border-ink-700 bg-ink-900 p-5 text-ink-200 shadow-2xl shadow-black/35"
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
            <div className="mb-4 border-t border-ink-800 pt-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                Developed by
              </div>
              <div className="text-[13px] font-semibold text-ink-100">
                Dr. Faris Arab, BPT, MPT (Orthopaedics)
              </div>
              <div className="mt-1 space-y-0.5 text-[12px] leading-relaxed text-ink-400">
                <div>Orthopedic & Musculoskeletal Physiotherapist</div>
                <div>Chiropractor, Nutritionist</div>
                <div>Medical Educator</div>
                <div>Founder, THS Stemed Rehab Center</div>
                <div>Creator of Sukon Med</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ContactLink href="https://youtube.com/@DrFarisArab" label="Dr. Faris Arab on YouTube">
                  <YouTubeIcon />
                </ContactLink>
                <ContactLink href="https://www.instagram.com/dr.faris.arab/" label="Dr. Faris Arab on Instagram">
                  <InstagramIcon />
                </ContactLink>
                <ContactLink href="mailto:dr.faris.arab@gmail.com" label="Email Dr. Faris Arab">
                  <MailIcon />
                </ContactLink>
              </div>
            </div>
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
