// Examiner-hand contact registry for Special Tests.
//
// A therapist hand is only shown where the test involves a real MANUAL
// CONTACT the examiner performs on a specific target (raising the heel,
// stabilizing a segment, applying a compression / glide / load) — not for
// palpation, reflex, measurement, or purely patient-active tests, where a
// hand would misrepresent the maneuver.
//
// Each contact anchors to a rig bone; TherapistHand copies that bone's world
// transform every frame and applies the bone-local calibration below, so the
// hand stays registered to the target for whatever pose the test puts the
// model in (and follows if the movement is played). Left-side contacts render
// the right-hand mesh mirrored.
//
// Calibration values are captured from an interactive pass against each test's
// applied position (see the live-tuning workflow used for the SLR heel hand).

export type HandSide = "right" | "left";

// A placed marker is either an examiner hand or a pressure-direction arrow.
// Both anchor to a bone the same way; only the rendered mesh differs.
export type ContactKind = "hand" | "arrow";

export type HandContact = {
  /** "hand" (default, back-compat) or "arrow" (pressure direction). */
  kind?: ContactKind;
  /** Rig bone whose world transform this marker tracks (e.g. "footR", "shinR"). */
  bone: string;
  /** Which hand — "left" renders the right-hand mesh mirrored across X. Ignored for arrows. */
  side: HandSide;
  /** Bone-local offset in metres from the bone origin to the placement. */
  offset: [number, number, number];
  /** Bone-local rotation, radians, XYZ euler. For an arrow, this aims the tip. */
  euler: [number, number, number];
  /** Uniform scale; defaults to DEFAULT_HAND_SCALE. */
  scale?: number;
};

export const DEFAULT_HAND_SCALE = 0.0095;

// Max simultaneous examiner hands any single test uses. Two covers every
// real test (stabilize + mobilize); the extra headroom is for the placement
// editor. TherapistHand renders this many reusable display slots.
export const MAX_CONTACT_HANDS = 4;

// --- Shared contacts ------------------------------------------------------

// Straight-leg-raise family: one hand supporting the raised right heel, palm
// toward the calcaneus with a small air-gap, fingers down the limb, thumb up.
const SLR_RIGHT_HEEL: HandContact[] = [
  {
    bone: "footR",
    side: "right",
    offset: [0.01442, -0.06649, 0.04237],
    euler: [2.54864, -0.05568, -0.09334],
  },
];

// --- Registry (keyed by Special Test id, matching store.activeSpecialTestId) --
//
// This is the SHIPPED baseline. User-made placements (the in-app placement
// editor, persisted in handPlacementStore) take precedence at render time and
// are what get folded back in here later.

export const TEST_HAND_CONTACTS: Record<string, HandContact[]> = {
  lx1: SLR_RIGHT_HEEL, // Straight leg raise (Lasègue)
  lx2: SLR_RIGHT_HEEL, // Crossed SLR — same support of the raised leg
  lx10: SLR_RIGHT_HEEL, // Bragard's sign — SLR position, sensitised
  si6: SLR_RIGHT_HEEL, // Active SLR
};

// Rig bones the placement editor's auto-anchor considers when binding a
// dropped hand to the nearest body part. Covers the limbs, spine ends, and
// pelvis — the plausible manual-contact targets across the test library.
export const ANCHOR_BONE_CANDIDATES: string[] = [
  "footR", "footL", "shinR", "shinL", "thighR", "thighL",
  "handR", "handL", "forearmR", "forearmL", "upper_armR", "upper_armL",
  "scapulaR", "scapulaL", "pelvis", "head", "thoracic_v6", "lumbar_v2", "cervical_v3",
];

export function handContactsForTest(testId: string | null): HandContact[] {
  if (!testId) return [];
  return TEST_HAND_CONTACTS[testId] ?? [];
}
