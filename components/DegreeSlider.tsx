"use client";

import type { CSSProperties } from "react";

/**
 * Modern rectangular degree slider — replaces the bare native <input
 * type="range"> the app used before (default browser styling, no ticks, no
 * increment buttons). Three things layered on top of one native range input
 * (kept native for free keyboard/touch/a11y support, not reimplemented):
 *   - a filled track (teal from zero up to the current value, so direction
 *     of movement reads at a glance) with a rectangular pill thumb, styled
 *     via .degree-range in globals.css;
 *   - a tick-mark ruler underneath, with a taller marked tick + label at
 *     "nice" intervals and at 0 (the clinical neutral reference point,
 *     always shown if it falls within range);
 *   - flanking −/+ buttons that nudge by exactly 1°, so "sticky to
 *     degrees" isn't just the slider's step=1 snap — there's a discrete,
 *     unambiguous way to move one degree at a time without dragging.
 */

function niceTickStep(range: number): number {
  if (range <= 30) return 5;
  if (range <= 60) return 10;
  if (range <= 120) return 20;
  return 30;
}

function buildTicks(min: number, max: number): number[] {
  const step = niceTickStep(max - min);
  const start = Math.ceil(min / step) * step;
  const raw: number[] = [];
  for (let t = start; t <= max; t += step) raw.push(t);
  // Drop any "nice" tick sitting too close to a boundary — min/max are
  // always shown (unshift/push below), so a nice-step neighbor within
  // less than half a step of one just crowds/overlaps its label instead
  // of adding information.
  const minGap = step * 0.4;
  const ticks = raw.filter((t) => t - min > minGap && max - t > minGap);
  ticks.unshift(min);
  ticks.push(max);
  return ticks;
}

export function DegreeSlider({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  const zeroPct = min <= 0 && max >= 0 ? pct(0) : null;
  const valuePct = pct(clamp(value));
  const fillStart = zeroPct === null ? 0 : Math.min(zeroPct, valuePct);
  const fillEnd = zeroPct === null ? valuePct : Math.max(zeroPct, valuePct);
  const ticks = buildTicks(min, max);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          aria-label="Decrease"
          className="grid h-6 w-6 shrink-0 place-items-center rounded border border-ink-600 bg-ink-800 text-[13px] font-semibold leading-none text-ink-300 transition hover:border-brand-600/60 hover:text-brand-300 active:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink-600 disabled:hover:text-ink-300"
        >
          −
        </button>

        <div className="relative flex-1">
          <input
            type="range"
            className="degree-range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            style={
              {
                "--degree-fill-start": `${fillStart}%`,
                "--degree-fill-end": `${fillEnd}%`,
              } as CSSProperties
            }
          />
          {zeroPct !== null && (
            <div
              className="pointer-events-none absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-500/70"
              style={{ left: `${zeroPct}%` }}
            />
          )}
        </div>

        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          aria-label="Increase"
          className="grid h-6 w-6 shrink-0 place-items-center rounded border border-ink-600 bg-ink-800 text-[13px] font-semibold leading-none text-ink-300 transition hover:border-brand-600/60 hover:text-brand-300 active:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink-600 disabled:hover:text-ink-300"
        >
          +
        </button>
      </div>

      <div className="relative mt-1 h-7 px-[26px]">
        <div className="relative h-full">
          {ticks.map((t) => {
            const isBoundary = t === min || t === max;
            const isZero = t === 0;
            return (
              <div
                key={t}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${pct(t)}%` }}
              >
                <div
                  className={`w-px ${
                    isZero ? "h-2 bg-ink-400" : isBoundary ? "h-1.5 bg-ink-600" : "h-1 bg-ink-700"
                  }`}
                />
                <span
                  className={`mt-0.5 text-[9px] tabular-nums ${
                    isZero ? "font-medium text-ink-400" : "text-ink-600"
                  }`}
                >
                  {t}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
