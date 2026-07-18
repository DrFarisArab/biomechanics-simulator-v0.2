// Prototype (#1): derive a base body-position preset from a test's procedure
// prose. The opening clause of every special-test procedure states the
// patient's position ("Patient supine, ...", "Patient sitting or standing,
// ..."), which is the ONE part of the free-text procedure that maps cleanly
// and reliably onto a base preset — unlike the examiner-action clauses, which
// describe manual forces that aren't joint angles (see the pose-authoring
// notes in specialTests.ts). Deriving the base from the procedure lets a pose
// be authored as just its test-specific joint commands, with the position
// read from the text instead of hand-specified in every fromBase() call.

// Phrase -> base preset id (ids match lib/presets.ts). Multi-word / more
// specific phrases (e.g. "long sitting") must be able to beat their shorter
// substrings ("sitting") — handled by the earliest-index + longest-phrase
// tie-break in basePresetFromProcedure below, so ordering here is only for
// readability.
const POSITION_PHRASES: { phrases: string[]; base: string }[] = [
  { phrases: ["long sitting", "long-sitting"], base: "long_sitting" },
  { phrases: ["hook-lying", "hook lying", "crook lying", "crook-lying"], base: "hooklying" },
  { phrases: ["half-kneeling", "half kneeling"], base: "half_kneeling_right" },
  { phrases: ["side-lying", "side lying", "sidelying"], base: "sidelying_left" },
  { phrases: ["quadruped", "hands and knees", "four-point"], base: "quadruped" },
  { phrases: ["prone"], base: "prone" },
  { phrases: ["supine"], base: "supine" },
  { phrases: ["seated", "sitting"], base: "sitting" },
  { phrases: ["standing", "stands"], base: "standing" },
];

/**
 * Returns the base preset id implied by a procedure's opening position phrase,
 * or null if no position word is found.
 *
 * Selection rule: the position stated EARLIEST in the text wins (procedures
 * open with the patient's position), with a longer phrase beating a shorter
 * one that starts at the same place. When a procedure offers two positions
 * ("sitting or supine"), the first-stated one is chosen — a deliberate,
 * predictable default; the handful of tests where the clinician prefers the
 * second are expected to override the base explicitly rather than rely on
 * this.
 */
export function basePresetFromProcedure(procedure: string): string | null {
  const text = ` ${procedure.toLowerCase().replace(/[.,;:()]/g, " ")} `;
  let best: { base: string; index: number; len: number } | null = null;
  for (const { phrases, base } of POSITION_PHRASES) {
    for (const phrase of phrases) {
      // Whole-word-ish match: require a space on each side of the phrase so
      // "prone" can't match inside "pronate", "stand" inside "understand", etc.
      const idx = text.indexOf(` ${phrase} `);
      if (idx === -1) continue;
      if (!best || idx < best.index || (idx === best.index && phrase.length > best.len)) {
        best = { base, index: idx, len: phrase.length };
      }
    }
  }
  return best ? best.base : null;
}
