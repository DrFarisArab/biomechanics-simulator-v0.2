"use client";

import { useEffect, useMemo, useState } from "react";
import { useArmSimStore } from "@/lib/store";
import { PRESETS } from "@/lib/presets";
import { useRecordReplayStore } from "@/lib/recordReplayStore";
import { buildTestPreviewClip } from "@/lib/testPreviewClip";
import {
  REGIONS,
  TESTS,
  CLUSTERS,
  TIER_META,
  TEST_POSE_MAP,
  SPECIAL_TEST_CUSTOM_POSES,
  type SpecialTest,
  type Region,
} from "@/lib/specialTests";

type View =
  | { kind: "home" }
  | { kind: "clusters" }
  | { kind: "region"; regionId: string }
  | { kind: "detail"; testId: string };

export function TierDot({ tier }: { tier: 1 | 2 | 3 }) {
  const m = TIER_META[tier];
  return (
    <span className="inline-flex items-center gap-1" title={m.label}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
    </span>
  );
}

function regionTestCount(regionId: string) {
  return TESTS.filter((t) => t.r === regionId).length;
}

export function ApplyPoseButton({ test }: { test: SpecialTest }) {
  const applyPose = useArmSimStore((s) => s.applyPose);
  const patchAngles = useArmSimStore((s) => s.patchAngles);
  const playPreview = useRecordReplayStore((s) => s.playPreview);
  const stopPreview = useRecordReplayStore((s) => s.stopPreview);
  const previewPlaying = useRecordReplayStore((s) => s.previewPlaying);
  const previewClip = useRecordReplayStore((s) => s.previewClip);
  const presetId = TEST_POSE_MAP[test.id];
  const preset = presetId ? PRESETS.find((p) => p.id === presetId) : SPECIAL_TEST_CUSTOM_POSES[test.id];

  // Memoized so the clip object (and its id) stays stable across re-renders
  // for the same preset — playPreview() stores this exact object in the
  // record/replay store, so a reference-stable clip is what lets the
  // "is THIS test's preview the one playing" check below actually match.
  // Rebuilding a fresh object (with a fresh random id) every render, as an
  // unmemoized call would, meant the comparison could never succeed.
  // Hook must run unconditionally (before the `!preset` early return below)
  // to satisfy React's rules of hooks — guarded internally instead of
  // skipped, since a conditional useMemo call broke the production build.
  const previewClipForTest = useMemo(() => (preset ? buildTestPreviewClip(preset) : null), [preset]);

  if (!preset) {
    return (
      <div className="rounded-md border border-dashed border-neutral-700 bg-neutral-800/20 px-3 py-2.5 text-[11px] leading-relaxed text-neutral-400">
        3D pose preview not yet available for this test — the reference info above is still accurate. More positions are being added over time.
      </div>
    );
  }

  const isThisPreviewPlaying = previewPlaying && previewClip?.id === previewClipForTest?.id;

  const applyStatic = () => {
    stopPreview();
    applyPose(preset.angles, {
      presetId: preset.id,
      rootPosition: preset.rootPosition,
      rootRotation: preset.rootRotation,
      furniture: preset.furniture,
      furnitureRotation: preset.furnitureRotation,
      stanceLeg: preset.stanceLeg,
    });
  };

  const togglePreview = () => {
    if (!previewClipForTest) return;
    if (isThisPreviewPlaying) {
      stopPreview();
      return;
    }
    // Set up the full target pose (root/furniture/stance + every joint at
    // its test-position angle) exactly like the static Apply button, then
    // immediately pull the tracked joints back to their start-of-test
    // angles before the first tick fires — otherwise there'd be a one-frame
    // flash of the end pose before playback catches up to t=0.
    applyPose(preset.angles, {
      presetId: preset.id,
      rootPosition: preset.rootPosition,
      rootRotation: preset.rootRotation,
      furniture: preset.furniture,
      furnitureRotation: preset.furnitureRotation,
      stanceLeg: preset.stanceLeg,
    });
    patchAngles(previewClipForTest.keyframes[0].poses);
    playPreview(previewClipForTest);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={applyStatic}
        className="w-full rounded-md border border-teal-700/50 bg-teal-900/20 px-3 py-2 text-[12px] font-semibold text-teal-400 transition hover:bg-teal-900/40"
      >
        Apply test position to model — {preset.label}
      </button>
      {previewClipForTest && (
        <button
          onClick={togglePreview}
          className={`flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[12px] font-semibold transition ${
            isThisPreviewPlaying
              ? "border-teal-600/60 bg-teal-900/25 text-teal-400"
              : "border-neutral-700 bg-neutral-800/40 text-neutral-300 hover:border-neutral-600"
          }`}
        >
          {isThisPreviewPlaying ? "❚❚ Pause preview" : "▶ Play test movement"}
        </button>
      )}
    </div>
  );
}

function RegionCard({ region, onOpen }: { region: Region; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="rounded-md border border-neutral-700 bg-neutral-800/40 p-3 text-left transition hover:border-neutral-600 hover:bg-neutral-800/70"
      style={{ borderLeftColor: region.color, borderLeftWidth: 3 }}
    >
      <div className="text-[13px] font-semibold text-neutral-100">{region.name}</div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">{region.blurb}</div>
      <div className="mt-1.5 text-[10px] font-medium text-neutral-300">{regionTestCount(region.id)} tests</div>
    </button>
  );
}

function HomeView({
  onOpenRegion,
  onOpenClusters,
  onOpenTest,
  query,
  setQuery,
}: {
  onOpenRegion: (id: string) => void;
  onOpenClusters: () => void;
  onOpenTest: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const families = ["Spine & Axial", "Upper Limb", "Lower Limb"];
  const q = query.trim().toLowerCase();
  const matches = q
    ? TESTS.filter((t) => t.n.toLowerCase().includes(q) || t.t.toLowerCase().includes(q))
    : null;

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <input
        type="text"
        placeholder="Search any test, structure or diagnosis…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-[12px] text-neutral-200 placeholder:text-neutral-500 focus:border-teal-600 focus:outline-none"
      />

      {!q && (
        <button
          onClick={onOpenClusters}
          className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-left transition hover:border-neutral-600"
        >
          <span className="text-[12px] font-medium text-neutral-200">Clinical clusters</span>
          <span className="text-[11px] font-mono text-neutral-400">{CLUSTERS.length}</span>
        </button>
      )}

      {matches ? (
        <div className="flex flex-col gap-1">
          <div className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Results ({matches.length})
          </div>
          {matches.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTest(t.id)}
              className="rounded px-2 py-1.5 text-left text-[12px] text-neutral-200 transition hover:bg-neutral-800"
            >
              {t.n}
              <span className="ml-1.5 text-neutral-400">— {t.t}</span>
            </button>
          ))}
          {matches.length === 0 && <div className="px-2 py-1 text-[12px] text-neutral-400">No matches.</div>}
        </div>
      ) : (
        families.map((family) => (
          <div key={family} className="flex flex-col gap-1.5">
            <div className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{family}</div>
            <div className="grid grid-cols-1 gap-1.5">
              {REGIONS.filter((r) => r.family === family).map((r) => (
                <RegionCard key={r.id} region={r} onOpen={() => onOpenRegion(r.id)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function RegionView({
  region,
  onBack,
  onOpenTest,
}: {
  region: Region;
  onBack: () => void;
  onOpenTest: (id: string) => void;
}) {
  const tests = TESTS.filter((t) => t.r === region.id);
  const categories = Array.from(new Set(tests.map((t) => t.cat)));

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <button onClick={onBack} className="w-fit text-[11px] font-medium text-neutral-300 transition hover:text-neutral-200">
        ← All regions
      </button>
      <div>
        <div className="text-[15px] font-semibold text-neutral-100">{region.name}</div>
        <div className="text-[11px] text-neutral-400">{region.blurb}</div>
      </div>
      {categories.map((cat) => (
        <div key={cat} className="flex flex-col gap-1">
          <div className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{cat}</div>
          {tests
            .filter((t) => t.cat === cat)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTest(t.id)}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[12px] text-neutral-200 transition hover:bg-neutral-800"
              >
                <span className="flex items-center gap-1.5">
                  <TierDot tier={t.tier} />
                  {t.n}
                </span>
                {(TEST_POSE_MAP[t.id] || SPECIAL_TEST_CUSTOM_POSES[t.id]) && (
                  <span className="shrink-0 text-[9px] font-medium text-teal-500">POSE</span>
                )}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-800/50 px-2.5 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-teal-400">{value}%</div>
    </div>
  );
}

function TestDetailView({
  test,
  region,
  onBack,
}: {
  test: SpecialTest;
  region: Region | undefined;
  onBack: () => void;
}) {
  const tierMeta = TIER_META[test.tier];
  const stopPreview = useRecordReplayStore((s) => s.stopPreview);

  useEffect(() => {
    return () => stopPreview();
  }, [test.id, stopPreview]);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <button onClick={onBack} className="w-fit text-[11px] font-medium text-neutral-300 transition hover:text-neutral-200">
        ← {region?.name ?? "Back"}
      </button>

      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
          <TierDot tier={test.tier} /> {test.cat} · {tierMeta.label}
        </div>
        <div className="mt-0.5 text-[15px] font-semibold text-neutral-100">{test.n}</div>
        <div className="text-[11px] text-neutral-400">{test.t}</div>
      </div>

      {(test.sn || test.sp) && (
        <div className="flex gap-2">
          {test.sn && <Stat label="Sensitivity" value={test.sn} />}
          {test.sp && <Stat label="Specificity" value={test.sp} />}
        </div>
      )}

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Procedure</div>
        <div className="text-[12px] leading-relaxed text-neutral-200">{test.p}</div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Positive finding</div>
        <div className="text-[12px] leading-relaxed text-neutral-200">{test.pos}</div>
      </div>

      {test.pearl && (
        <div className="rounded-md border border-neutral-700 bg-neutral-800/30 px-3 py-2">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Clinical pearl</div>
          <div className="text-[11px] leading-relaxed text-neutral-300">{test.pearl}</div>
        </div>
      )}

      <ApplyPoseButton test={test} />
    </div>
  );
}

function ClustersView({ onBack, onOpenTest }: { onBack: () => void; onOpenTest: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <button onClick={onBack} className="w-fit text-[11px] font-medium text-neutral-300 transition hover:text-neutral-200">
        ← All regions
      </button>
      <div className="text-[15px] font-semibold text-neutral-100">Clinical clusters</div>
      <div className="text-[11px] leading-relaxed text-neutral-400">
        Validated test combinations — more diagnostically useful than any single test alone.
      </div>
      {CLUSTERS.map((c) => (
        <div key={c.id} className="rounded-md border border-neutral-700 bg-neutral-800/40 p-3">
          <div className="text-[12px] font-semibold text-neutral-100">{c.name}</div>
          <div className="mt-0.5 text-[11px] text-neutral-400">{c.when}</div>
          <ul className="mt-2 flex flex-col gap-0.5">
            {c.items.map((item) => (
              <li key={item} className="text-[11px] text-neutral-300">
                • {item}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] leading-relaxed text-neutral-300">{c.rule}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {c.tests.map((tid) => {
              const t = TESTS.find((x) => x.id === tid);
              if (!t) return null;
              return (
                <button
                  key={tid}
                  onClick={() => onOpenTest(tid)}
                  className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-300 transition hover:border-teal-600/60 hover:text-teal-400"
                >
                  {t.n}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Text-size steps for the panel's own zoom control — 100/115/130%, cycling
// back to 100 after the top. Applied via CSS `zoom` (not a font-size
// inheritance trick) because nearly every text size in this panel is a
// literal Tailwind arbitrary pixel value (text-[11px] etc.), which does NOT
// scale from a parent's font-size the way relative units would — `zoom`
// scales the whole rendered subtree (text AND layout) uniformly instead.
const TEXT_SCALE_STEPS = [1, 1.15, 1.3];

export function SpecialTests() {
  const [view, setView] = useState<View>({ kind: "home" });
  const [query, setQuery] = useState("");
  const [textScaleIndex, setTextScaleIndex] = useState(0);
  const setSpecialTestsOpen = useArmSimStore((s) => s.setSpecialTestsOpen);

  const currentTest = view.kind === "detail" ? TESTS.find((t) => t.id === view.testId) : undefined;
  const currentRegion =
    view.kind === "region"
      ? REGIONS.find((r) => r.id === view.regionId)
      : currentTest
        ? REGIONS.find((r) => r.id === currentTest.r)
        : undefined;

  const content = useMemo(() => {
    switch (view.kind) {
      case "home":
        return (
          <HomeView
            query={query}
            setQuery={setQuery}
            onOpenRegion={(id) => setView({ kind: "region", regionId: id })}
            onOpenClusters={() => setView({ kind: "clusters" })}
            onOpenTest={(id) => setView({ kind: "detail", testId: id })}
          />
        );
      case "clusters":
        return <ClustersView onBack={() => setView({ kind: "home" })} onOpenTest={(id) => setView({ kind: "detail", testId: id })} />;
      case "region":
        if (!currentRegion) return null;
        return (
          <RegionView
            region={currentRegion}
            onBack={() => setView({ kind: "home" })}
            onOpenTest={(id) => setView({ kind: "detail", testId: id })}
          />
        );
      case "detail":
        if (!currentTest) return null;
        return (
          <TestDetailView
            test={currentTest}
            region={currentRegion}
            onBack={() =>
              currentRegion ? setView({ kind: "region", regionId: currentRegion.id }) : setView({ kind: "home" })
            }
          />
        );
    }
  }, [view, query, currentRegion, currentTest]);

  return (
    <aside className="scroll-slim flex w-80 shrink-0 flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold text-neutral-100">Special Tests</div>
          <div className="text-[10px] text-neutral-400">Orthopaedic special tests · bedside reference</div>
        </div>
        <button
          onClick={() => setSpecialTestsOpen(false)}
          aria-label="Close special tests panel"
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          ✕
        </button>
      </div>
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Text size</span>
        <button
          onClick={() => setTextScaleIndex((i) => (i + 1) % TEXT_SCALE_STEPS.length)}
          title="Increase text size"
          aria-label="Increase text size"
          className="flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800/50 px-2 py-1 text-[11px] font-semibold text-neutral-200 transition hover:border-teal-600/60 hover:text-teal-400"
        >
          <span className="text-[10px] leading-none">A</span>
          <span className="text-[14px] leading-none">A</span>
          <span className="ml-0.5 font-mono text-[10px] text-neutral-400">
            {Math.round(TEXT_SCALE_STEPS[textScaleIndex] * 100)}%
          </span>
        </button>
      </div>
      <div style={{ zoom: TEXT_SCALE_STEPS[textScaleIndex] }}>{content}</div>
    </aside>
  );
}
