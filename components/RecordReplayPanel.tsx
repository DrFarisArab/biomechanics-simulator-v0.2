"use client";

import { useMemo } from "react";
import { useArmSimStore } from "@/lib/store";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { ARM_JOINT_DOFS, ARM_DOF_META } from "@/lib/armDofs";
import { TRUNK_JOINT_DOFS, TRUNK_DOF_META } from "@/lib/trunkDofs";
import { LEG_JOINT_DOFS, LEG_DOF_META } from "@/lib/legDofs";
import { JOINT_LABELS, ALL_JOINT_IDS } from "@/lib/jointLabels";
import { clipDuration } from "@/lib/clip";
import { DegreeSlider } from "./DegreeSlider";

const ALL_JOINT_DOFS = { ...ARM_JOINT_DOFS, ...TRUNK_JOINT_DOFS, ...LEG_JOINT_DOFS };
const ALL_DOF_META = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META };

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(t: number): string {
  return `${t.toFixed(1)}s`;
}

function JointPicker() {
  const pendingJoints = useRecordReplayStore((s) => s.pendingJoints);
  const toggleJoint = useRecordReplayStore((s) => s.toggleJoint);
  const startClip = useRecordReplayStore((s) => s.startClip);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="text-[11px] leading-relaxed text-neutral-300">
        Pick one or more joints to animate. Every other joint stays exactly where it is during playback.
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
                  ? "border-teal-600/60 bg-teal-900/25 text-teal-400"
                  : "border-neutral-700 bg-neutral-800/40 text-neutral-300 hover:border-neutral-600"
              }`}
            >
              <span
                className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${
                  checked ? "border-teal-500 bg-teal-500" : "border-neutral-600"
                }`}
              >
                {checked && <span className="text-[9px] leading-none text-neutral-950">✓</span>}
              </span>
              {JOINT_LABELS[jointId]}
            </button>
          );
        })}
      </div>
      <button
        onClick={startClip}
        disabled={pendingJoints.length === 0}
        className="w-full rounded-md border border-teal-700/50 bg-teal-900/20 px-3 py-2 text-[12px] font-semibold text-teal-400 transition hover:bg-teal-900/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start Recording{pendingJoints.length > 0 ? ` (${pendingJoints.length} joint${pendingJoints.length > 1 ? "s" : ""})` : ""}
      </button>
    </div>
  );
}

function TrackedJointEditor({ jointId }: { jointId: string }) {
  const angles = useArmSimStore((s) => s.angles);
  const setAngle = useArmSimStore((s) => s.setAngle);
  const dofs = ALL_JOINT_DOFS[jointId];
  const meta = ALL_DOF_META[jointId];
  const jointAngles = angles[jointId] ?? {};

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold text-neutral-200">{JOINT_LABELS[jointId]}</div>
      {Object.keys(dofs).map((dofId) => {
        const dofMeta = meta[dofId];
        const value = jointAngles[dofId] ?? 0;
        return (
          <div key={dofId} className="rounded-md border border-neutral-700 bg-neutral-800/50 p-2">
            <div className="mb-1 flex items-baseline justify-between">
              <div className="text-[11px] font-medium text-neutral-200">{dofMeta.label}</div>
              <div className="font-mono text-[11px] tabular-nums text-teal-400">
                {value > 0 ? "+" : ""}
                {Math.round(value)}°
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
  const speed = useRecordReplayStore((s) => s.speed);
  const seek = useRecordReplayStore((s) => s.seek);
  const play = useRecordReplayStore((s) => s.play);
  const pause = useRecordReplayStore((s) => s.pause);
  const setLoop = useRecordReplayStore((s) => s.setLoop);
  const setSpeed = useRecordReplayStore((s) => s.setSpeed);
  const deleteKeyframe = useRecordReplayStore((s) => s.deleteKeyframe);

  const duration = clipDuration(clip);
  const scrubMax = Math.max(duration, currentTime, 1);
  const canPlay = (clip?.keyframes.length ?? 0) >= 2;

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-800 px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (isPlaying ? pause() : play())}
          disabled={!canPlay}
          title={canPlay ? (isPlaying ? "Pause" : "Play") : "Add at least 2 keyframes to play"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-neutral-700 bg-neutral-800/50 text-[12px] text-neutral-200 transition hover:border-teal-600/60 hover:text-teal-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button
          onClick={() => setLoop(!loop)}
          title="Loop (plays forward, then backward, repeating)"
          aria-pressed={loop}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-[12px] transition ${
            loop ? "border-teal-600/60 bg-teal-900/25 text-teal-400" : "border-neutral-700 bg-neutral-800/50 text-neutral-300"
          }`}
        >
          ⇄
        </button>
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-md border border-neutral-700 bg-neutral-800/50 px-1.5 py-1 text-[11px] text-neutral-200 focus:border-teal-600 focus:outline-none"
        >
          {SPEED_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1 font-mono text-[11px] tabular-nums text-neutral-300">
          <input
            type="number"
            step={0.1}
            min={0}
            value={Math.round(currentTime * 10) / 10}
            onChange={(e) => seek(Number(e.target.value))}
            title="Exact time — type a value to jump the cursor there, e.g. to place the next keyframe past the current clip end"
            className="w-14 rounded border border-neutral-700 bg-neutral-800/50 px-1 py-0.5 text-right text-neutral-200 focus:border-teal-600 focus:outline-none"
          />
          <span>s / {formatTime(duration)}</span>
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
            className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full border border-neutral-950 bg-teal-400 hover:bg-teal-300"
            style={{ left: `${(kf.time / scrubMax) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-[10px] text-neutral-400">Click a tick to jump there · shift-click to delete it</div>
    </div>
  );
}

export function RecordReplayPanel() {
  const clip = useRecordReplayStore((s) => s.clip);
  const currentTime = useRecordReplayStore((s) => s.currentTime);
  const discardClip = useRecordReplayStore((s) => s.discardClip);
  const addKeyframe = useRecordReplayStore((s) => s.addKeyframe);
  const setEasing = useRecordReplayStore((s) => s.setEasing);
  const setPanelOpen = useRecordReplayStore((s) => s.setPanelOpen);

  const trackedLabel = useMemo(
    () => clip?.trackedJoints.map((j) => JOINT_LABELS[j]).join(", ") ?? "",
    [clip?.trackedJoints]
  );

  return (
    <aside className="scroll-slim flex w-80 shrink-0 flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold text-neutral-100">Record &amp; Replay</div>
          <div className="text-[10px] text-neutral-400">Keyframe a movement, then play it back</div>
        </div>
        <button
          onClick={() => setPanelOpen(false)}
          aria-label="Close record & replay panel"
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          ✕
        </button>
      </div>

      {!clip ? (
        <JointPicker />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Tracking</div>
              <div className="truncate text-[12px] text-neutral-200">{trackedLabel}</div>
            </div>
            <button
              onClick={discardClip}
              className="shrink-0 rounded-md border border-neutral-700 px-2 py-1 text-[10px] font-medium text-neutral-300 transition hover:border-red-700/60 hover:text-red-400"
            >
              Discard
            </button>
          </div>

          <div className="flex flex-col gap-3 px-4 py-3">
            {clip.trackedJoints.map((jointId) => (
              <TrackedJointEditor key={jointId} jointId={jointId} />
            ))}

            <button
              onClick={addKeyframe}
              className="w-full rounded-md border border-teal-700/50 bg-teal-900/20 px-3 py-2 text-[12px] font-semibold text-teal-400 transition hover:bg-teal-900/40"
            >
              Add Keyframe @ {formatTime(currentTime)}
            </button>

            <div className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800/40 px-2.5 py-1.5">
              <span className="text-[11px] text-neutral-300">Easing</span>
              <div className="flex gap-1">
                {(["easeInOut", "linear"] as const).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEasing(e)}
                    className={`rounded px-2 py-1 text-[10px] font-medium transition ${
                      clip.easing === e
                        ? "border border-teal-600/60 bg-teal-900/25 text-teal-400"
                        : "border border-neutral-700 text-neutral-300 hover:text-neutral-200"
                    }`}
                  >
                    {e === "easeInOut" ? "Ease in-out" : "Linear"}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] leading-relaxed text-neutral-400">
              {clip.keyframes.length} keyframe{clip.keyframes.length === 1 ? "" : "s"} — move a slider above, then Add
              Keyframe at the time you want it captured.
            </div>
          </div>

          <Timeline />
        </>
      )}
    </aside>
  );
}
