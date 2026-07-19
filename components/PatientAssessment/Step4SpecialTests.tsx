"use client";

import { useMemo, useState } from "react";
import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import { JOINT_CATEGORIES, NOTABLE_RESULTS, TEST_RESULT_LABELS, type TestResult } from "@/lib/assessment";
import { REGIONS, TESTS, TIER_META, type SpecialTest } from "@/lib/specialTests";
import { ApplyPoseButton, Stat, TierDot } from "@/components/SpecialTests";
import { SectionLabel } from "./shared";

const RESULT_OPTIONS = Object.keys(TEST_RESULT_LABELS) as TestResult[];

function ResultChip({ value, active, onClick }: { value: TestResult; active: boolean; onClick: () => void }) {
  const notable = NOTABLE_RESULTS.includes(value);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-1.5 py-1 text-[10px] font-medium transition ${
        active
          ? notable
            ? "border border-danger-600/60 bg-danger-900/30 text-danger-400"
            : "border border-brand-600/60 bg-brand-900/25 text-brand-400"
          : "border border-ink-700 bg-ink-800/40 text-ink-400 hover:border-ink-600"
      }`}
    >
      {TEST_RESULT_LABELS[value]}
    </button>
  );
}

// Reference detail block — identical field set/order to SpecialTests.tsx's
// TestDetailView (tier/category, sensitivity/specificity, procedure,
// positive finding, pearl, Apply-pose/Play-movement) — so the clinician
// never has to leave the wizard to look a test up, and what they see here
// matches the Special Tests tab exactly.
function TestReference({ test }: { test: SpecialTest }) {
  const tierMeta = TIER_META[test.tier];
  return (
    <div className="flex flex-col gap-3 border-t border-ink-800 px-3 pb-3 pt-3">
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
          <TierDot tier={test.tier} /> {test.cat} · {tierMeta.label}
        </div>
        <div className="text-[11px] text-ink-400">{test.t}</div>
      </div>

      {(test.sn || test.sp) && (
        <div className="flex gap-2">
          {test.sn && <Stat label="Sensitivity" value={test.sn} />}
          {test.sp && <Stat label="Specificity" value={test.sp} />}
        </div>
      )}

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Procedure</div>
        <div className="text-[12px] leading-relaxed text-ink-200">{test.p}</div>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Positive finding</div>
        <div className="text-[12px] leading-relaxed text-ink-200">{test.pos}</div>
      </div>

      {test.pearl && (
        <div className="rounded-md border border-ink-700 bg-ink-800/30 px-3 py-2">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Clinical pearl</div>
          <div className="text-[11px] leading-relaxed text-ink-300">{test.pearl}</div>
        </div>
      )}

      <ApplyPoseButton test={test} />
    </div>
  );
}

function TestRow({ test, expanded, onToggle }: { test: SpecialTest; expanded: boolean; onToggle: () => void }) {
  const finding = usePatientAssessmentStore((s) => s.draft.testFindings[test.id]);
  const setTestResult = usePatientAssessmentStore((s) => s.setTestResult);
  const setTestNotes = usePatientAssessmentStore((s) => s.setTestNotes);
  const result = finding?.result ?? "not_tested";
  const notable = NOTABLE_RESULTS.includes(result);

  return (
    <div
      className={`overflow-hidden rounded-md border border-ink-700 bg-ink-800/40 ${
        notable ? "border-l-2 border-l-danger-500/70" : result !== "not_tested" ? "border-l-2 border-l-brand-500/60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-ink-800/70"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-200">
          <TierDot tier={test.tier} />
          {test.n}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {result !== "not_tested" && (
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                notable ? "bg-danger-900/50 text-danger-300" : "bg-ink-800 text-ink-300"
              }`}
            >
              {TEST_RESULT_LABELS[result]}
            </span>
          )}
          <span className={`text-ink-500 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      <div
        className={`grid transition-all duration-200 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <TestReference test={test} />
          <div className="flex flex-col gap-1.5 border-t border-ink-800 px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Result</div>
            <div className="flex flex-wrap gap-1">
              {RESULT_OPTIONS.map((opt) => (
                <ResultChip key={opt} value={opt} active={result === opt} onClick={() => setTestResult(test.id, opt)} />
              ))}
            </div>
            {result !== "not_tested" && (
              <input
                value={finding?.notes ?? ""}
                onChange={(e) => setTestNotes(test.id, e.target.value)}
                placeholder="Notes (optional) — e.g. positive at 120° abduction"
                className="w-full rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-[11px] text-ink-200 placeholder:text-ink-500 focus:border-brand-600 focus:outline-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step4SpecialTests() {
  const selectedJoints = usePatientAssessmentStore((s) => s.draft.selectedJoints);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  const { groupedTests, inScope } = useMemo(() => {
    const regionIds = new Set<string>();
    for (const joint of selectedJoints) {
      const cat = JOINT_CATEGORIES.find((c) => c.id === joint.categoryId);
      if (!cat) continue;
      for (const r of cat.regionIds) regionIds.add(r);
    }
    const grouped = REGIONS.filter((r) => regionIds.has(r.id)).map((region) => {
      const tests = TESTS.filter((t) => t.r === region.id);
      const categories = Array.from(new Set(tests.map((t) => t.cat)));
      return { region, categories: categories.map((cat) => ({ cat, tests: tests.filter((t) => t.cat === cat) })) };
    });
    return { groupedTests: grouped, inScope: regionIds.size > 0 };
  }, [selectedJoints]);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <SectionLabel>Special Tests</SectionLabel>

      {!inScope ? (
        <div className="rounded-md border border-dashed border-ink-700 bg-ink-800/20 px-3 py-2.5 text-[11px] leading-relaxed text-ink-400">
          Select at least one joint/region in Step 3 to see relevant special tests.
        </div>
      ) : (
        groupedTests.map(({ region, categories }) => (
          <div key={region.id} className="flex flex-col gap-2.5">
            <div className="text-[11px] font-semibold" style={{ color: region.color }}>
              {region.name}
            </div>
            {categories.map(({ cat, tests }) => (
              <div key={cat} className="flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{cat}</div>
                {tests.map((test) => (
                  <TestRow
                    key={test.id}
                    test={test}
                    expanded={expandedTestId === test.id}
                    onToggle={() => setExpandedTestId((cur) => (cur === test.id ? null : test.id))}
                  />
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
