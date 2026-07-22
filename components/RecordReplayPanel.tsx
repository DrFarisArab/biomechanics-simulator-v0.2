"use client";

import { useMemo, useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { ARM_JOINT_DOFS, ARM_DOF_META } from "@/lib/armDofs";
import { TRUNK_JOINT_DOFS, TRUNK_DOF_META } from "@/lib/trunkDofs";
import { LEG_JOINT_DOFS, LEG_DOF_META } from "@/lib/legDofs";
import { MANDIBLE_JOINT_DOFS, MANDIBLE_DOF_META } from "@/lib/mandibleDofs";
import { JOINT_LABELS, ALL_JOINT_IDS } from "@/lib/jointLabels";
import { clipDuration } from "@/lib/clip";
import {
  GRAVITY_MOVEMENTS,
  type GravityMovementId,
} from "@/lib/gravityMovements";
import { exportClipToMp4 } from "@/lib/exportClipVideo";
import { DegreeSlider } from "./DegreeSlider";

const ALL_JOINT_DOFS = { ...ARM_JOINT_DOFS, ...TRUNK_JOINT_DOFS, ...LEG_JOINT_DOFS, ...MANDIBLE_JOINT_DOFS };
const ALL_DOF_META = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META, ...MANDIBLE_DOF_META };

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(t: number): string {
  return `${t.toFixed(1)}s`;
}

// Collapsible step-by-step guide for the keyframe workflow — recording here
// means posing the model at a point in time, saving that pose, moving time
// forward, and posing again, rather than a continuous real-time capture.
// That's not obvious from the controls alone, so this is offered inline at
// both stages (picking what to track, and the pose editor itself) rather
// than only in the app-wide "How to use" modal in Footer.tsx.
function RecordingHelp({ variant }: { variant: "pick" | "edit" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-brand-700/40 bg-brand-900/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2.5 py-2 text-left text-[11px] font-semibold text-brand-400"
      >
        <span>How recording works</span>
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-brand-800/40 px-2.5 py-2 text-[11px] leading-relaxed text-ink-300">
          {variant === "pick" ? (
            <>
              <p>Recording keyframes a pose over time — it&apos;s not a live capture.</p>
              <p>1. Pick a closed-chain movement, or one or more joints to track.</p>
              <p>2. Tap Start Recording to open the pose editor.</p>
              <p>3. Pose the tracked joint(s), then save it as a keyframe.</p>
              <p>4. Move the time forward, pose again, and save another keyframe.</p>
              <p>5. Press play to preview the motion between keyframes, then export as video if you like it.</p>
            </>
          ) : (
            <>
              <p>1. Adjust the sliders below to pose the tracked joint(s) at the current time.</p>
              <p>2. Tap &ldquo;Set Movement&rdquo; to save this pose as a keyframe.</p>
              <p>3. Move time forward — drag the scrub bar or use the +/− time buttons — then pose again and set another keyframe.</p>
              <p>4. Press ▶ to play back; the model eases smoothly between your keyframes.</p>
              <p>5. Tap a tick on the timeline to jump to it, shift-tap (or shift-click) to delete it.</p>
              <p>6. Happy with the motion? Use Export Video below to save it.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function JointPicker() {
  const pendingJoints = useRecordReplayStore((s) => s.pendingJoints);
  const pendingClosedChainMovement = useRecordReplayStore((s) => s.pendingClosedChainMovement);
  const toggleJoint = useRecordReplayStore((s) => s.toggleJoint);
  const selectClosedChainMovement = useRecordReplayStore((s) => s.selectClosedChainMovement);
  const startClip = useRecordReplayStore((s) => s.startClip);
  const selectedMovement = GRAVITY_MOVEMENTS.find(
    (movement) => movement.id === pendingClosedChainMovement
  );
  const canStart = Boolean(pendingClosedChainMovement || pendingJoints.length > 0);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <RecordingHelp variant="pick" />

      <section className="flex flex-col gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Closed-chain movements
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-ink-300">
            Record a ground-contact movement through its linked joint constraints.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {GRAVITY_MOVEMENTS.map((movement) => {
            const selected = pendingClosedChainMovement === movement.id;
            return (
              <button
                key={movement.id}
                onClick={() => selectClosedChainMovement(movement.id)}
                aria-pressed={selected}
                className={`rounded-md border px-2 py-2 text-left text-[11px] font-medium transition ${
                  selected
                    ? "border-brand-600/60 bg-brand-900/25 text-brand-400"
                    : "border-ink-700 bg-ink-800/40 text-ink-300 hover:border-ink-600"
                }`}
              >
                {movement.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2 border-t border-ink-800 pt-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Open-chain movements
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-ink-300">
            Pick one or more joints. Every other joint stays unchanged during playback.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {ALL_JOINT_IDS.map((jointId) => {
            const checked = pendingJoints.includes(jointId);
            return (
              <button
                key={jointId}
                onClick={() => toggleJoint(jointId)}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition ${
                  checked
                    ? "border-brand-600/60 bg-brand-900/25 text-brand-400"
                    : "border-ink-700 bg-ink-800/40 text-ink-300 hover:border-ink-600"
                }`}
              >
                <span
                  className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${
                    checked ? "border-brand-500 bg-brand-500" : "border-ink-600"
                  }`}
                >
                  {checked && <span className="text-[9px] leading-none text-ink-950">✓</span>}
                </span>
                {JOINT_LABELS[jointId]}
              </button>
            );
          })}
        </div>
      </section>

      <button
        onClick={startClip}
        disabled={!canStart}
        className="w-full rounded-md border border-brand-700/50 bg-brand-900/20 px-3 py-2 text-[12px] font-semibold text-brand-400 transition hover:bg-brand-900/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {selectedMovement
          ? `Start Recording ${selectedMovement.label}`
          : `Start Recording${pendingJoints.length > 0 ? ` (${pendingJoints.length} joint${pendingJoints.length > 1 ? "s" : ""})` : ""}`}
      </button>
    </div>
  );
}

function ClosedChainMovementEditor({ movementId }: { movementId: GravityMovementId }) {
  const gravityMovement = useArmSimStore((s) => s.gravityMovement);
  const setGravityMovementAmount = useArmSimStore((s) => s.setGravityMovementAmount);
  const setGravityMovementSide = useArmSimStore((s) => s.setGravityMovementSide);
  const movement = GRAVITY_MOVEMENTS.find((item) => item.id === movementId)!;

  return (
    <div className="flex flex-col gap-2">
      {movement.sideLabel && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            {movement.sideLabel}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                onClick={() => setGravityMovementSide(side)}
                className={`rounded-md border px-2 py-1.5 text-[11px] font-medium capitalize transition ${
                  gravityMovement.side === side
                    ? "border-brand-600/60 bg-brand-900/25 text-brand-400"
                    : "border-ink-700 bg-ink-800/40 text-ink-300 hover:border-ink-600"
                }`}
              >
                {side}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-md border border-ink-700 bg-ink-800/50 p-2">
        <div className="mb-0.5 flex items-baseline justify-between">
          <div className="text-[11px] font-medium text-ink-200">{movement.controlLabel}</div>
          <div className="font-mono text-[11px] tabular-nums text-brand-400">
            {Math.round(gravityMovement.amount)}°
          </div>
        </div>
        <div className="mb-1.5 text-[10px] text-ink-400">{movement.summary}</div>
        <DegreeSlider
          value={gravityMovement.amount}
          min={0}
          max={movement.max}
          onChange={setGravityMovementAmount}
        />
      </div>
    </div>
  );
}

function TrackedJointEditor({ jointId }: { jointId: string }) {
  const angles = useArmSimStore((s) => s.angles);
  const setAngle = useArmSimStore((s) => s.setAngle);
  const dofs = ALL_JOINT_DOFS[jointId];
  const meta = ALL_DOF_META[jointId];
  const jointAngles = angles[jointId] ?? {};
  // See Sidebar.tsx — the mandible's DOFs are millimetres, not degrees.
  const unit = jointId === "mandible" ? "mm" : "°";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold text-ink-200">{JOINT_LABELS[jointId]}</div>
      {Object.keys(dofs).map((dofId) => {
        const dofMeta = meta[dofId];
        const value = jointAngles[dofId] ?? 0;
        return (
          <div key={dofId} className="rounded-md border border-ink-700 bg-ink-800/50 p-2">
            <div className="mb-1 flex items-baseline justify-between">
              <div className="text-[11px] font-medium text-ink-200">{dofMeta.label}</div>
              <div className="font-mono text-[11px] tabular-nums text-brand-400">
                {value > 0 ? "+" : ""}
                {Math.round(value)}{unit}
              </div>
            </div>
            <DegreeSlider value={value} min={dofMeta.min} max={dofMeta.max} onChange={(next) => setAngle(jointId, dofId, next)} />
          </div>
        );
      })}
    </div>
  );
}

function Timeline() {
  const clip = useRecordReplayStore((s) => s.clip);
  const currentTime = useRecordReplayStore((s) => s.currentTime);
  const isPlaying = useRecordReplayStore((s) => s.isPlaying);
  const loop = useRecordReplayStore((s) => s.loop);
  const seek = useRecordReplayStore((s) => s.seek);
  const play = useRecordReplayStore((s) => s.play);
  const pause = useRecordReplayStore((s) => s.pause);
  const setLoop = useRecordReplayStore((s) => s.setLoop);
  const deleteKeyframe = useRecordReplayStore((s) => s.deleteKeyframe);

  const duration = clipDuration(clip);
  const scrubMax = Math.max(duration, currentTime, 1);
  const canPlay = (clip?.keyframes.length ?? 0) >= 2;
  const nudgeTime = (delta: number) => seek(Math.max(0, currentTime + delta));

  return (
    <div className="flex flex-col gap-2 border-t border-ink-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (isPlaying ? pause() : play())}
          disabled={!canPlay}
          title={canPlay ? (isPlaying ? "Pause" : "Play") : "Add at least 2 keyframes to play"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-800/50 text-[12px] text-ink-200 transition hover:border-brand-600/60 hover:text-brand-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          onClick={() => setLoop(!loop)}
          title="Loop (plays forward, then backward, repeating)"
          aria-pressed={loop}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-[12px] transition ${
            loop ? "border-brand-600/60 bg-brand-900/25 text-brand-400" : "border-ink-700 bg-ink-800/50 text-ink-300"
          }`}
        >
          ⇄
        </button>
        <div className="ml-auto flex items-center gap-1 font-mono text-[11px] tabular-nums text-ink-300">
          <button
            type="button"
            onClick={() => nudgeTime(-0.1)}
            aria-label="Move replay time back 0.1 seconds"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-800/50 text-[13px] text-ink-300 transition hover:border-brand-600/60 hover:text-brand-400"
          >
            -
          </button>
          <span
            title="Current replay time"
            className="min-w-12 rounded border border-ink-700 bg-ink-800/50 px-1.5 py-1 text-center text-ink-200"
          >
            {formatTime(currentTime)}
          </span>
          <button
            type="button"
            onClick={() => nudgeTime(0.1)}
            aria-label="Move replay time forward 0.1 seconds"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-800/50 text-[13px] text-ink-300 transition hover:border-brand-600/60 hover:text-brand-400"
          >
            +
          </button>
          <span>/ {formatTime(duration)}</span>
        </div>
      </div>

      <div className="relative pt-2">
        <input
          type="range"
          min={0}
          max={scrubMax}
          step={0.05}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="degree-range w-full"
          style={
            {
              "--degree-fill-start": "0%",
              "--degree-fill-end": `${(currentTime / scrubMax) * 100}%`,
            } as React.CSSProperties
          }
        />
        {clip?.keyframes.map((kf) => (
          <button
            key={kf.id}
            onClick={() => seek(kf.time)}
            title={`Keyframe @ ${formatTime(kf.time)} — click to jump, shift-click to delete`}
            onClickCapture={(e) => {
              if (e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                deleteKeyframe(kf.id);
              }
            }}
            className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full border border-ink-950 bg-brand-400 hover:bg-brand-300"
            style={{ left: `${(kf.time / scrubMax) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-[10px] text-ink-400">Click a tick to jump there · shift-click to delete it</div>
    </div>
  );
}

export function RecordReplayPanel() {
  const clip = useRecordReplayStore((s) => s.clip);
  const currentTime = useRecordReplayStore((s) => s.currentTime);
  const discardClip = useRecordReplayStore((s) => s.discardClip);
  const addKeyframe = useRecordReplayStore((s) => s.addKeyframe);
  const speed = useRecordReplayStore((s) => s.speed);
  const setEasing = useRecordReplayStore((s) => s.setEasing);
  const setPanelOpen = useRecordReplayStore((s) => s.setPanelOpen);
  const setSpeed = useRecordReplayStore((s) => s.setSpeed);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const canExport = Boolean(clip && clip.keyframes.length >= 2 && clipDuration(clip) > 0);

  const handleExport = async () => {
    if (!clip || !canExport || isExporting) return;
    setExportError(null);
    setExportProgress(0);
    setIsExporting(true);
    try {
      await exportClipToMp4(clip, setExportProgress);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The video could not be exported.");
    } finally {
      setIsExporting(false);
    }
  };

  const trackedLabel = useMemo(
    () => {
      if (clip?.closedChainMovement) {
        return GRAVITY_MOVEMENTS.find((movement) => movement.id === clip.closedChainMovement)?.label ?? "";
      }
      return clip?.trackedJoints.map((joint) => JOINT_LABELS[joint]).join(", ") ?? "";
    },
    [clip]
  );

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-ink-800 bg-ink-900 sm:h-auto sm:w-80 sm:border-l">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold text-ink-100">Record &amp; Replay</div>
          <div className="text-[10px] text-ink-400">Keyframe a movement, then play it back</div>
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          aria-label="Close record & replay panel"
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-400 transition hover:bg-ink-800 hover:text-ink-200"
        >
          ✕
        </button>
      </div>

      {!clip ? (
        <JointPicker />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Tracking</div>
              <div className="truncate text-[12px] text-ink-200">{trackedLabel}</div>
            </div>
            <button
              onClick={discardClip}
              disabled={isExporting}
              className="shrink-0 rounded-md border border-ink-700 px-2 py-1 text-[10px] font-medium text-ink-300 transition hover:border-danger-700/60 hover:text-danger-400"
            >
              Discard
            </button>
          </div>

          <div className={`scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto ${isExporting ? "pointer-events-none opacity-60" : ""}`}>
            <div className="flex flex-col gap-3 px-4 py-3">
              <RecordingHelp variant="edit" />

              {clip.closedChainMovement ? (
                <ClosedChainMovementEditor movementId={clip.closedChainMovement} />
              ) : (
                clip.trackedJoints.map((jointId) => (
                  <TrackedJointEditor key={jointId} jointId={jointId} />
                ))
              )}

              <button
                onClick={addKeyframe}
                className="w-full rounded-md border border-brand-700/50 bg-brand-900/20 px-3 py-2 text-[12px] font-semibold text-brand-400 transition hover:bg-brand-900/40"
              >
                Set Movement @ {formatTime(currentTime)}
              </button>
            </div>

            <Timeline />
          </div>

          <div className="border-t border-ink-800 px-4 py-3">
            <div className="mb-2 flex items-center justify-between rounded-md border border-ink-700 bg-ink-800/40 px-2.5 py-1.5">
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                disabled={isExporting}
                aria-label="Playback speed"
                className="rounded-md border border-ink-700 bg-ink-800/50 px-1.5 py-1 text-[11px] text-ink-200 focus:border-brand-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {SPEED_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}x
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                {(["easeInOut", "linear"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEasing(e)}
                    disabled={isExporting}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition ${
                      clip.easing === e
                        ? "border border-brand-600/60 bg-brand-900/25 text-brand-400"
                        : "border border-ink-700 text-ink-300 hover:text-ink-200"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {e === "easeInOut" ? "Ease in-out" : "Linear"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={!canExport || isExporting}
              className="w-full rounded-md border border-brand-700/60 bg-brand-900/25 px-3 py-2 text-[12px] font-semibold text-brand-300 transition hover:bg-brand-900/45 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isExporting ? `Exporting video · ${Math.round(exportProgress * 100)}%` : "↓ Export Video"}
            </button>
            {isExporting && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full bg-brand-500 transition-[width] duration-100"
                  style={{ width: `${Math.max(2, exportProgress * 100)}%` }}
                />
              </div>
            )}
            {exportError ? (
              <div className="mt-2 text-[10px] leading-relaxed text-danger-400">{exportError}</div>
            ) : (
              <div className="mt-1.5 text-[10px] leading-relaxed text-ink-400">
                {clip.keyframes.length} keyframe{clip.keyframes.length === 1 ? "" : "s"} recorded. Exports the model viewport at 30 fps.
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
