"use client";

import type { ReactNode } from "react";

// Shared presentational primitives for the 5 wizard steps — pure/props-
// driven, no store access, so the step files stay focused on field lists
// instead of re-pasting these className strings 5 times. Every class here
// is copied verbatim from the app's existing panel vocabulary (SpecialTests/
// RecordReplayPanel), not a new design system.

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{children}</div>;
}

// The toggle-chip / pseudo-checkbox pattern from RecordReplayPanel's
// JointPicker — reused for joint chips, red-flag checkboxes, onset chips,
// and single-select option rows (sex, duration, dominant hand, side).
export function ChipButton({
  checked,
  onClick,
  children,
  showCheckbox = true,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Single-select rows (sex/duration/side) skip the check-square — the
   * teal-filled state alone communicates "selected" without implying a
   * multi-select checkbox affordance. */
  showCheckbox?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition ${
        checked
          ? "border-warm bg-warm text-ink-950 font-semibold"
          : "border-ink-700 bg-ink-800/40 text-ink-300 hover:border-ink-600"
      }`}
    >
      {showCheckbox && (
        <span
          className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${
            // Dark square (not brand-500) so the checkmark still reads
            // crisply once it's sitting on the solid warm chip background
            // above, instead of two similarly-muted tones blending together.
            checked ? "border-ink-950 bg-ink-950" : "border-ink-600"
          }`}
        >
          {checked && <span className="text-[9px] leading-none text-warm">✓</span>}
        </span>
      )}
      {children}
    </button>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-[12px] text-ink-200 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-300">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        placeholder={placeholder}
        className="w-full rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-[12px] text-ink-200 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none"
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-300">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-[12px] text-ink-200 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none"
      />
    </label>
  );
}
