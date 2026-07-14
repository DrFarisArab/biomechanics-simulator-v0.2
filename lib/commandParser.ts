import { ARM_JOINT_DOFS, ARM_DOF_META } from "./armDofs";
import { TRUNK_JOINT_DOFS, TRUNK_DOF_META } from "./trunkDofs";
import { LEG_JOINT_DOFS, LEG_DOF_META } from "./legDofs";

/**
 * Natural-language pose command parser — ported from the v0.1 app
 * (engine/commandParser.ts) and adapted to v0.2's actual joint/DOF ids.
 * Grammar is intentionally loose (token/phrase search, not a rigid pattern):
 * filler words are stripped before matching, and joints/movements are found
 * as sub-phrases anywhere in the remaining text. Examples that all work:
 *   "left shoulder flexion 90"          "abduct the right hip 30 degrees"
 *   "rotate the neck left 40"           "externally rotate the shoulder 60"
 *   "supinate the forearm 45"           "ankle dorsiflexion 15"
 *   "tilt the lumbar spine left 15"     "evert the right ankle 20"
 *
 * v0.2-SPECIFIC ADAPTATION: shoulder flexion/extension targets the
 * `sagittalFlexExt` DOF (true sagittal-plane flex/ext), not `flexExt`
 * (relabelled "Scaption" in v0.2 — see armDofs.ts) — a plain "flex the
 * shoulder" command means the sagittal movement, matching what a clinician
 * would expect. `flexExt` itself isn't reachable via NL command in this
 * version; use the sidebar slider for Scaption specifically.
 *
 * SIGN CONVENTION NOTE: for DOFs whose direction comes from a left/right
 * word (spine/pelvis rotation, spine lateral flexion, pelvic obliquity),
 * v0.2's own positive-direction label is NOT consistent across joints
 * (e.g. pelvis rotation's positive is "R rotation" but lumbar rotation's
 * positive is "Left rotation" — a real quirk of how each region's rig axis
 * was built, confirmed by reading armDofs.ts/trunkDofs.ts's own DOF_META
 * tables directly, not assumed). So the sign for these is derived AT
 * PARSE TIME from each DOF's own meta.positive label (does it start with
 * "l" or "r"?) rather than a single hardcoded left=+/right=- rule — this is
 * the one meaningful deviation from the v0.1 parser's logic, required
 * because v0.1's rig didn't have this per-joint inconsistency.
 */

type JointKind = "shoulder" | "hip" | "flexExt-only" | "wrist" | "forearm" | "ankle" | "spine" | "pelvis";

interface JointAlias {
  /** Joint ids to target. Two ids = a paired (left/right) joint. */
  ids: [string] | [string, string];
  kind: JointKind;
}

const JOINT_ALIASES: Record<string, JointAlias> = {
  shoulder: { ids: ["shoulder_left", "shoulder_right"], kind: "shoulder" },
  elbow: { ids: ["elbow_left", "elbow_right"], kind: "flexExt-only" },
  wrist: { ids: ["wrist_left", "wrist_right"], kind: "wrist" },
  // Pronation/supination is a forearm (radioulnar) movement, not a wrist
  // one — see armDofs.ts's forearm_left/right for why this is its own
  // joint id rather than folded into wrist.
  forearm: { ids: ["forearm_left", "forearm_right"], kind: "forearm" },
  hip: { ids: ["hip_left", "hip_right"], kind: "hip" },
  knee: { ids: ["knee_left", "knee_right"], kind: "flexExt-only" },
  ankle: { ids: ["ankle_left", "ankle_right"], kind: "ankle" },
  lumbar: { ids: ["lumbar"], kind: "spine" },
  "lumbar spine": { ids: ["lumbar"], kind: "spine" },
  "low back": { ids: ["lumbar"], kind: "spine" },
  "lower back": { ids: ["lumbar"], kind: "spine" },
  thoracic: { ids: ["thoracic"], kind: "spine" },
  "thoracic spine": { ids: ["thoracic"], kind: "spine" },
  thorax: { ids: ["thoracic"], kind: "spine" },
  "upper back": { ids: ["thoracic"], kind: "spine" },
  "mid back": { ids: ["thoracic"], kind: "spine" },
  neck: { ids: ["cervical"], kind: "spine" },
  cervical: { ids: ["cervical"], kind: "spine" },
  "cervical spine": { ids: ["cervical"], kind: "spine" },
  head: { ids: ["head"], kind: "spine" },
  pelvis: { ids: ["pelvis"], kind: "pelvis" },
  pelvic: { ids: ["pelvis"], kind: "pelvis" },
};

const SIDE_WORDS: Record<string, "left" | "right" | "both"> = {
  left: "left",
  l: "left",
  right: "right",
  r: "right",
  both: "both",
  bilateral: "both",
  bilaterally: "both",
};

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "by", "please", "set", "move", "put", "make",
  "do", "some", "degree", "degrees", "deg", "at", "on", "for", "with",
]);

interface MovementConcept {
  dofId: string;
  kinds: JointKind[];
  /** True if direction (sign) comes from a left/right side word, not the phrase. */
  needsSide: boolean;
  positive?: string[];
  negative?: string[];
  neutral?: string[];
}

const MOVEMENTS: MovementConcept[] = [
  {
    dofId: "flexExt",
    // "spine" added here so lumbar/thoracic/cervical/head flexion-extension
    // is reachable via NL command — the DOF has existed on every spine
    // region since trunkDofs.ts, but nothing routed to it (only rotation
    // and lateral flexion had spine-kind concepts) until special-test poses
    // needed "flex/extend the cervical spine" for CFRT, Sharp-Purser, etc.
    kinds: ["flexExt-only", "hip", "wrist", "spine"],
    needsSide: false,
    positive: ["flexion", "flex", "bend forward", "forward bend", "bend"],
    negative: ["extension", "extend", "straighten", "bend backward", "backward bend", "hyperextend", "hyperextension"],
  },
  {
    dofId: "sagittalFlexExt",
    kinds: ["shoulder"],
    needsSide: false,
    positive: ["flexion", "flex", "bend forward", "forward bend", "bend"],
    negative: ["extension", "extend", "straighten", "bend backward", "backward bend", "hyperextend", "hyperextension"],
  },
  {
    dofId: "abdAdd",
    kinds: ["shoulder", "hip"],
    needsSide: false,
    positive: ["abduction", "abduct", "raise sideways", "lift sideways", "move away from body", "move outward", "out to side"],
    negative: ["adduction", "adduct", "lower sideways", "move toward body", "move inward", "bring in", "across body"],
  },
  {
    dofId: "rotation",
    kinds: ["shoulder", "hip"],
    needsSide: false,
    positive: ["external rotation", "externally rotate", "rotate externally", "rotate out", "turn out", "turn outward", "external"],
    negative: ["internal rotation", "internally rotate", "rotate internally", "rotate in", "turn in", "turn inward", "internal"],
  },
  {
    dofId: "rotation",
    kinds: ["spine", "pelvis"],
    needsSide: true,
    neutral: ["rotation", "rotate", "twist", "turn"],
  },
  {
    dofId: "lateral",
    kinds: ["spine"],
    needsSide: true,
    neutral: ["lateral flexion", "side bend", "bend sideways", "lean", "tilt sideways"],
  },
  {
    dofId: "tilt",
    kinds: ["pelvis"],
    needsSide: false,
    positive: ["anterior tilt", "tilt forward", "tilt anteriorly", "tip forward", "forward tilt", "anteriorly"],
    negative: ["posterior tilt", "tilt backward", "tilt posteriorly", "tip back", "backward tilt", "posteriorly"],
  },
  {
    dofId: "obliquity",
    kinds: ["pelvis"],
    needsSide: true,
    neutral: ["hike", "obliquity", "hip hike", "pelvic hike"],
  },
  {
    dofId: "pronSup",
    kinds: ["forearm"],
    needsSide: false,
    positive: ["supination", "supinate", "palm up", "turn palm up", "rotate palm up"],
    negative: ["pronation", "pronate", "palm down", "turn palm down", "rotate palm down"],
  },
  {
    dofId: "radUlnar",
    kinds: ["wrist"],
    needsSide: false,
    positive: ["ulnar deviation", "deviate ulnar", "ulnar deviate", "bend toward pinky"],
    negative: ["radial deviation", "deviate radial", "radial deviate", "bend toward thumb"],
  },
  {
    dofId: "dorsiPlantar",
    kinds: ["ankle"],
    needsSide: false,
    positive: ["dorsiflexion", "dorsiflex", "toes up", "point toes up", "flex ankle up", "flexion", "flex"],
    negative: ["plantarflexion", "plantarflex", "toes down", "point toes down", "push toes down", "extension", "extend"],
  },
  {
    dofId: "invEv",
    kinds: ["ankle"],
    needsSide: false,
    positive: ["inversion", "invert", "sole inward", "turn sole in"],
    negative: ["eversion", "evert", "sole outward", "turn sole out"],
  },
];

const ALL_JOINT_DOFS: Record<string, Record<string, unknown>> = {
  ...ARM_JOINT_DOFS,
  ...TRUNK_JOINT_DOFS,
  ...LEG_JOINT_DOFS,
};
const ALL_DOF_META: Record<
  string,
  Record<string, { label: string; positive: string; negative: string; min: number; max: number }>
> = { ...ARM_DOF_META, ...TRUNK_DOF_META, ...LEG_DOF_META };

const NUMBER_RE = /(-?\d+(?:\.\d+)?)\s*(?:°|deg(?:rees)?)?/i;

export interface ParsedCommand {
  raw: string;
  jointIds: string[];
  dofId: string;
  value: number;
  summary: string;
}

export interface ParseError {
  error: string;
}

export function isParseError(r: ParsedCommand | ParseError): r is ParseError {
  return "error" in r;
}

function clean(text: string): { tokens: string[]; joined: string } {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
  return { tokens, joined: ` ${tokens.join(" ")} ` };
}

function longestMatch<T>(joined: string, table: Record<string, T>): { key: string; value: T } | null {
  let best: { key: string; value: T } | null = null;
  for (const key of Object.keys(table)) {
    if (joined.includes(` ${key} `) && (!best || key.length > best.key.length)) {
      best = { key, value: table[key] };
    }
  }
  return best;
}

function findMovement(joined: string, kind: JointKind): { concept: MovementConcept; sign: number | null } | null {
  let best: { concept: MovementConcept; sign: number | null; phraseLen: number } | null = null;
  for (const concept of MOVEMENTS) {
    if (!concept.kinds.includes(kind)) continue;
    const groups: [string[] | undefined, number | null][] = concept.needsSide
      ? [[concept.neutral, null]]
      : [
          [concept.positive, 1],
          [concept.negative, -1],
        ];
    for (const [phrases, sign] of groups) {
      for (const phrase of phrases ?? []) {
        if (joined.includes(` ${phrase} `) && (!best || phrase.length > best.phraseLen)) {
          best = { concept, sign, phraseLen: phrase.length };
        }
      }
    }
  }
  return best ? { concept: best.concept, sign: best.sign } : null;
}

export function parsePoseCommand(input: string): ParsedCommand | ParseError {
  const numMatch = NUMBER_RE.exec(input);
  if (!numMatch) {
    return { error: 'No degree amount found. Try e.g. "left shoulder flexion 90".' };
  }
  const magnitude = Math.abs(Number(numMatch[1]));
  const withoutNumber = input.slice(0, numMatch.index) + input.slice(numMatch.index + numMatch[0].length);
  const { tokens, joined } = clean(withoutNumber);

  let jointMatch = longestMatch(joined, JOINT_ALIASES);
  if (!jointMatch) {
    return {
      error:
        'Couldn\'t find a joint in that. Try shoulder, elbow, wrist/forearm, hip, knee, ankle, lumbar, thoracic, neck, head, or pelvis.',
    };
  }

  // Colloquial "hip hike" / "hike ... hip" means the PELVIS obliquity, not
  // the hip joint itself — "hip" alone would otherwise win as a match.
  if (jointMatch.key === "hip" && / hike | obliquity /.test(joined)) {
    jointMatch = { key: "pelvis", value: JOINT_ALIASES.pelvis };
  }

  const { ids, kind } = jointMatch.value;

  const movementJoined = joined.replace(` ${jointMatch.key} `, " ").replace(/\s+/g, " ");

  const movementMatch = findMovement(movementJoined, kind);
  if (!movementMatch) {
    const hint =
      kind === "forearm"
        ? "pronation/supination"
        : `flexion/extension${
            kind === "shoulder" || kind === "hip" ? ", abduction/adduction, or internal/external rotation" : ""
          }${kind === "spine" ? ", rotation (with left/right), or lateral flexion (with left/right)" : ""}${
            kind === "pelvis" ? ", anterior/posterior tilt, or hike (with left/right)" : ""
          }${kind === "wrist" ? ", or ulnar/radial deviation" : ""}${
            kind === "ankle" ? ", dorsiflexion/plantarflexion, or inversion/eversion" : ""
          }`;
    return { error: `Couldn't find a movement for "${jointMatch.key}". Try e.g. ${hint}.` };
  }
  const { concept, sign } = movementMatch;

  const sideToken = tokens.find((t) => t in SIDE_WORDS);
  const side = sideToken ? SIDE_WORDS[sideToken] : undefined;

  // For needsSide DOFs, v0.2's positive direction is NOT uniformly
  // left-or-right across joints (see file header) — derive it from this
  // DOF's own meta.positive label instead of a hardcoded rule.
  let finalSign: number;
  if (concept.needsSide) {
    if (side !== "left" && side !== "right") {
      return {
        error: `"${jointMatch.key} ${concept.dofId}" needs a direction — add "left" or "right" (e.g. "rotate the neck left 30").`,
      };
    }
    const metaForSign = ALL_DOF_META[ids[0]]?.[concept.dofId];
    const positiveIsLeft = (metaForSign?.positive ?? "").trim().toLowerCase().startsWith("l");
    const sideIsLeft = side === "left";
    finalSign = sideIsLeft === positiveIsLeft ? 1 : -1;
  } else {
    finalSign = sign ?? 1;
  }

  // Resolve which id(s) to target: paired joints use the side word to pick
  // one side (or both, if absent/"both"); unpaired joints always have one id.
  let jointIds: string[];
  if (ids.length === 1) {
    jointIds = [ids[0]];
  } else if (!concept.needsSide && side && side !== "both") {
    jointIds = [ids[0].endsWith("_left") === (side === "left") ? ids[0] : ids[1]];
  } else {
    jointIds = [...ids];
  }

  for (const id of jointIds) {
    const dofs = ALL_JOINT_DOFS[id];
    if (!dofs) return { error: `Joint "${id}" not found in the rig.` };
    if (!(concept.dofId in dofs)) {
      return { error: `"${jointMatch.key}" has no matching movement for that.` };
    }
  }

  const meta = ALL_DOF_META[jointIds[0]]?.[concept.dofId];
  const min = meta?.min ?? -180;
  const max = meta?.max ?? 180;
  const rawValue = finalSign * magnitude;
  const value = Math.min(max, Math.max(min, rawValue));
  const clamped = value !== rawValue;

  const moveLabel = value >= 0 ? meta?.positive ?? "positive" : meta?.negative ?? "negative";
  const sideLabel =
    jointIds.length === 1 && ids.length === 2
      ? `${jointIds[0].endsWith("_left") ? "left " : "right "}`
      : jointIds.length === 2
        ? "both "
        : "";

  return {
    raw: input,
    jointIds,
    dofId: concept.dofId,
    value,
    summary: `Set ${sideLabel}${jointMatch.key} ${moveLabel.toLowerCase()} to ${Math.abs(value)}°${
      clamped ? ` (clamped from ${magnitude}° to this joint's ROM)` : ""
    }`,
  };
}
