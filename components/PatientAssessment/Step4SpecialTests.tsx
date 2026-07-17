"use client";

import { useMemo } from "react";
import { usePatientAssessmentStore } from "@/lib/patientAssessmentStore";
import { JOINT_CATEGORIES, NOTABLE_RESULTS, TEST_RESULT_LABELS, TestResult } from "@/lib/assessment";
import { REGIONS, TESTS, type SpecialTest } from "@/lib/specialTests";
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
            ? "border border-red-600/60 bg-red-900/30 text-red-400"
            : "border border-teal-600/60 bg-teal-900/25 text-teal-400"
          : "border border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600"
      }`}
    >
      {TEST_RESULT_LABELS[value]}
    </button>
  );
}

function TestRow({ test }: { test: SpecialTest }) {
  const finding = usePatientAssessmentStore((s) => s.draft.testFindings[test.id]);
  const setTestResult = usePatientAssessmentStore((s) => s.setTestResult);
  const setTestNotes = usePatientAssessmentStore((s) => s.setTestNotes);
  const result = finding?.result ?? "not_tested";
  const notable = NOTABLE_RESULTS.includes(result);

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-md border border-neutral-700 bg-neutral-800/40 p-2 ${
        notable ? "border-l-2 border-l-red-500/70" : result !== "not_tested" ? "border-l-2 border-l-teal-500/60" : ""
      }`}
    >
      <div className="text-[11px] font-medium text-neutral-200">{test.n}</div>
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
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-[11px] text-neutral-200 placeholder:text-neutral-500 focus:border-teal-600 focus:outline-none"
        />
      )}
    </div>
  );
}

export function Step4SpecialTests() {
  const selectedJoints = usePatientAssessmentStore((s) => s.draft.selectedJoints);

  const { groupedTests, inScope } = useMemo(() => {
    const regionIds = new Set<string>();
    for (const joint of selectedJoints) {
      const cat = JOINT_CATEGORIES.find((c) => c.id === joint.categoryId);
      if (!cat) continue;
      for (const r of cat.regionIds) regionIds.add(r);
    }
    const grouped = REGIONS.filter((r) => regionIds.has(r.id)).map((region) => ({
      region,
      tests: TESTS.filter((t) => t.r === region.id),
    }));
    return { groupedTests: grouped, inScope: regionIds.size > 0 };
  }, [selectedJoints]);

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <SectionLabel>Special Tests</SectionLabel>

      {!inScope ? (
        <div className="rounded-md border border-dashed border-neutral-700 bg-neutral-800/20 px-3 py-2.5 text-[11px] leading-relaxed text-neutral-400">
          Select at least one joint/region in Step 3 to see relevant special tests.
        </div>
      ) : (
        groupedTests.map(({ region, tests }) => (
          <div key={region.id} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: region.color }}>
              {region.name}
            </div>
            {tests.map((test) => (
              <TestRow key={test.id} test={test} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
