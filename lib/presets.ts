export interface PosePreset {
  id: string;
  label: string;
  group: string;
  description: string;
  angles: Record<string, Record<string, number>>;
  rootPosition?: [number, number, number];
  rootRotation?: [number, number, number];
  furniture?: "none" | "chair" | "bed";
  furnitureRotation?: number;
  stanceLeg?: "none" | "left" | "right";
  // Which OTHER preset this one was built from (only set on specialTests.ts's
  // fromBase()-constructed poses) — lets a caller recover "the neutral setup
  // position before this test's specific joint angles were dialed in" for
  // things like the Special Tests Play-preview animation, without having to
  // guess or re-derive it.
  baseId?: string;
  // For tests whose Play preview isn't "get from neutral into this position"
  // but rather "hold this position, then a manual maneuver moves it further"
  // (e.g. FABER's examiner pressing the knee toward the table) — a sparse
  // patch of the DOFs that move DURING that maneuver, applied on top of this
  // preset's own `angles` as the animation's end pose. When present, this
  // preset's own `angles` is used as the preview's START (not baseId's
  // neutral), overriding the normal baseId-derived start/end entirely — see
  // testPreviewClip.ts's buildTestPreviewClip().
  dynamicEndAngles?: Record<string, Record<string, number>>;
}

const HALF_PI = Math.PI / 2;

function bilateral(base: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [joint, dofs] of Object.entries(base)) {
    out[`${joint}_left`] = { ...dofs };
    out[`${joint}_right`] = { ...dofs };
  }
  return out;
}

export const PRESETS: PosePreset[] = [
  {
    id: "standing",
    label: "Anatomical Standing",
    group: "Standing",
    description: "Neutral reference: feet apart, arms at sides, palms forward.",
    angles: {},
  },
  {
    id: "relaxed",
    label: "Relaxed Standing",
    group: "Standing",
    description: "Slight shoulder abduction and elbow flexion at rest.",
    angles: bilateral({ shoulder: { abdAdd: 7 }, elbow: { flexExt: 12 } }),
  },
  {
    id: "single_leg_right",
    label: "Single-Leg Stance (R)",
    group: "Standing",
    description: "Left limb lifted; weight-bearing through the right.",
    // Activates ground-contact mode: the right hip/knee/ankle stay planted
    // (locked in the sidebar) and pelvic obliquity pivots about the right
    // hip — see stanceMode.ts's computePelvisPivotOffset/
    // stanceLegRotationCorrection for the mechanics.
    stanceLeg: "right",
    angles: { hip_left: { flexExt: 30 }, knee_left: { flexExt: 45 } },
  },
  {
    id: "sitting",
    label: "Sitting (90/90)",
    group: "Sitting",
    description: "Hips and knees flexed to 90°.",
    furniture: "chair",
    angles: bilateral({ hip: { flexExt: 90 }, knee: { flexExt: 90 } }),
  },
  {
    id: "long_sitting",
    label: "Long Sitting",
    group: "Sitting",
    // Seated upright on the treatment table with legs extended flat along
    // it — pelvis dropped to table height so the legs actually rest ON the
    // surface instead of floating above it. flexExt=97 (not a plain 90) —
    // the knee/ankle joint offsets carry their own small anterior/posterior
    // curvature, so a dead-on 90 still leaves the leg sloping visibly below
    // the table by the ankle; matches the v1 app's own tuned value for the
    // same reason.
    rootPosition: [0, -0.3, 0],
    furniture: "bed",
    description: "Hips flexed 90°, knees extended, seated on the table.",
    angles: bilateral({ hip: { flexExt: 97 } }),
  },
  {
    id: "supine",
    label: "Supine",
    group: "Recumbent",
    description: "Lying flat on the back.",
    rootRotation: [-HALF_PI, 0, 0],
    // Z centers the body along the table's length (2.15m) — verified via
    // world-space coordinates: without this, the body's local height axis
    // maps to world Z running from the feet (z≈0) to the head (z≈-1.55),
    // NOT centered on the table's own [-1.075, 1.075] span, so the head
    // end hung off the table while the foot end left unused table length.
    rootPosition: [0, 0.6, 0.82],
    furniture: "bed",
    angles: {},
  },
  {
    id: "prone",
    label: "Prone",
    group: "Recumbent",
    description: "Lying flat on the front.",
    rootRotation: [HALF_PI, 0, Math.PI],
    // Z centers the body along the table's length (2.15m) — verified via
    // world-space coordinates: without this, the body's local height axis
    // maps to world Z running from the feet (z≈0) to the head (z≈-1.55),
    // NOT centered on the table's own [-1.075, 1.075] span, so the head
    // end hung off the table while the foot end left unused table length.
    rootPosition: [0, 0.6, 0.82],
    furniture: "bed",
    angles: {},
  },
  {
    id: "hooklying",
    label: "Crook / Hook Lying",
    group: "Recumbent",
    description: "Supine with hips and knees flexed, feet flat.",
    rootRotation: [-HALF_PI, 0, 0],
    // Z centers the body along the table's length (2.15m) — verified via
    // world-space coordinates: without this, the body's local height axis
    // maps to world Z running from the feet (z≈0) to the head (z≈-1.55),
    // NOT centered on the table's own [-1.075, 1.075] span, so the head
    // end hung off the table while the foot end left unused table length.
    rootPosition: [0, 0.6, 0.82],
    furniture: "bed",
    angles: bilateral({ hip: { flexExt: 45 }, knee: { flexExt: 90 } }),
  },
  {
    id: "sidelying_left",
    label: "Side Lying (L)",
    group: "Recumbent",
    description: "Lying on the left side.",
    // Sign verified empirically (world-space thigh coordinates): -HALF_PI
    // puts the LEFT thigh at table height with the RIGHT thigh stacked
    // above it, i.e. actually lying on the left side — +HALF_PI put them
    // the other way around for this rig's coordinate convention.
    rootRotation: [0, 0, -HALF_PI],
    // Rotated about Z (not X, like the other recumbent poses), so the
    // body's long axis maps to world X instead of Z (not Z, like the
    // others) — X here centers the body along the (also-rotated) table's
    // length, same premise/verification method as the other recumbent
    // presets' Z offset.
    rootPosition: [-0.82, 0.657, 0],
    furniture: "bed",
    // Rotate the table 90° to match the body's long axis now running
    // along X instead of Z.
    furnitureRotation: HALF_PI,
    angles: {},
  },
  {
    id: "bowing",
    label: "Rukūʿ (Bowing)",
    group: "Recumbent",
    description: "Flat-back standing bow: hip-hinge forward flexion, hands reaching to the knees.",
    // This rig has no single "true hip-hinge" joint — hip only swings the
    // leg relative to a stationary pelvis, while the whole-trunk-relative-
    // to-pelvis pivot is lumbar (the spine chain's root attachment). The
    // clinical ~90° hip-hinge magnitude is carried mainly by lumbar here,
    // with hip kept small so the legs stay close to vertical/planted.
    angles: {
      ...bilateral({
        hip: { flexExt: 10 },
        knee: { flexExt: 5 },
        ankle: { dorsiPlantar: 6 },
        shoulder: { flexExt: 25 },
        elbow: { flexExt: 20 },
        wrist: { flexExt: -25 },
      }),
      lumbar: { flexExt: 55, lateral: 0, rotation: 0 },
      thoracic: { flexExt: 10, lateral: 0, rotation: 0 },
      cervical: { flexExt: -8, lateral: 0, rotation: 0 },
    },
  },
  {
    id: "sujud",
    label: "Sujūd (Prostration)",
    group: "Recumbent",
    description: "Kneeling, folded forward with hips and knees deeply flexed, forehead toward the hands.",
    // Verified via world-space coordinates: brings the hand and rear knee
    // both to ~floor level; the foot drops further below (toes tucked
    // under from the -25° ankle plantarflexion), which is anatomically
    // correct for this fold, not a clipping bug.
    rootPosition: [0, -1.06, 0],
    angles: {
      ...bilateral({
        hip: { flexExt: 120 },
        knee: { flexExt: 140 },
        ankle: { dorsiPlantar: -25 },
        shoulder: { flexExt: 15 },
        elbow: { flexExt: 115 },
        wrist: { flexExt: -70 },
        forearm: { pronSup: -10 },
      }),
      lumbar: { flexExt: 20, lateral: 0, rotation: 0 },
      thoracic: { flexExt: 32, lateral: 0, rotation: 0 },
      cervical: { flexExt: 28, lateral: 0, rotation: 0 },
    },
  },
  {
    id: "shoulder_abduction",
    label: "Shoulder Abduction 90°",
    group: "Assessment",
    description: "Bilateral glenohumeral abduction to 90°.",
    angles: bilateral({ shoulder: { abdAdd: 90 } }),
  },
  {
    id: "shoulder_flexion",
    label: "Shoulder Flexion 90°",
    group: "Assessment",
    description: "Bilateral shoulder flexion to 90°.",
    angles: bilateral({ shoulder: { flexExt: 90 } }),
  },
  {
    id: "overhead_reach",
    label: "Overhead Reach",
    group: "Assessment",
    description: "Full bilateral shoulder flexion with slight thoracic extension.",
    angles: { ...bilateral({ shoulder: { flexExt: 180 } }), thoracic: { flexExt: -10, lateral: 0, rotation: 0 } },
  },
  {
    id: "slr_right",
    label: "Straight-Leg Raise (R)",
    group: "Assessment",
    description: "Supine passive hip flexion with the knee extended.",
    rootRotation: [-HALF_PI, 0, 0],
    // Z centers the body along the table's length (2.15m) — verified via
    // world-space coordinates: without this, the body's local height axis
    // maps to world Z running from the feet (z≈0) to the head (z≈-1.55),
    // NOT centered on the table's own [-1.075, 1.075] span, so the head
    // end hung off the table while the foot end left unused table length.
    rootPosition: [0, 0.6, 0.82],
    furniture: "bed",
    angles: { hip_right: { flexExt: 70 } },
  },
  {
    id: "cervical_rotation",
    label: "Cervical Rotation (L)",
    group: "Assessment",
    description: "Isolated cervical spine rotation to the left.",
    angles: { cervical: { flexExt: 0, lateral: 0, rotation: 60 } },
  },
  {
    id: "thomas_test_left",
    label: "Thomas Test (L)",
    group: "Assessment",
    description: "One hip+knee flexed to chest, other leg extended flat — tests iliopsoas/rectus femoris tightness.",
    // Supine at the table edge, same as slr_right above — this preset was
    // originally built with no root transform at all, which left the model
    // standing upright instead of lying on the table.
    rootRotation: [-HALF_PI, 0, 0],
    rootPosition: [0, 0.6, 0.82],
    furniture: "bed",
    angles: { hip_left: { flexExt: 120 }, knee_left: { flexExt: 130 } },
  },
  {
    id: "deep_squat",
    label: "Deep Squat",
    group: "Functional",
    description: "Combined hip, knee and ankle flexion.",
    // Verified via world-space coordinates: brings the feet to y=0 (floor)
    // for this exact fold instead of floating ~26cm above it.
    rootPosition: [0, -0.645, 0],
    angles: bilateral({ hip: { flexExt: 110 }, knee: { flexExt: 125 }, ankle: { dorsiPlantar: 20 } }),
  },
  {
    id: "quadruped",
    label: "Quadruped (Hands & Knees)",
    group: "Functional",
    description:
      "Weight-bearing on hands and knees: shoulders and hips flexed 90°, elbows extended, wrists extended, knees flexed 90°, spine neutral.",
    rootRotation: [HALF_PI, 0, Math.PI],
    // Verified via world-space coordinates: this puts handL at floor level
    // (y=0) and the knee (shinL) ~9cm above it — the same premise as the
    // recumbent poses' table-height derivation, just floor-height instead.
    rootPosition: [0, 0.507, 0],
    angles: bilateral({
      shoulder: { flexExt: 90 },
      wrist: { flexExt: -70 },
      hip: { flexExt: 90 },
      knee: { flexExt: 90 },
    }),
  },
  {
    id: "half_kneeling_right",
    label: "Half Kneeling (R front)",
    group: "Functional",
    description:
      "Right leg forward with hip and knee at 90°; left (rear) hip extended, rear knee flexed, kneeling on the mat. Pelvis neutral.",
    // Verified via world-space coordinates: rear knee (shinL) at y=0
    // exactly (floor), front foot ~5cm above it — matches real
    // half-kneeling ground contact.
    rootPosition: [0, -0.433, 0],
    angles: {
      hip_right: { flexExt: 90 },
      knee_right: { flexExt: 90 },
      hip_left: { flexExt: -8 },
      knee_left: { flexExt: 110 },
    },
  },
  {
    id: "forward_bow",
    label: "Forward Bow (hip hinge)",
    group: "Functional",
    description: "Flat-back forward bend from the hips and lumbar spine.",
    angles: {
      ...bilateral({ hip: { flexExt: 40 } }),
      lumbar: { flexExt: 45, lateral: 0, rotation: 0 },
      thoracic: { flexExt: 10, lateral: 0, rotation: 0 },
    },
  },
  {
    id: "trunk_rotation_left",
    label: "Trunk Rotation (L)",
    group: "Assessment",
    description: "Combined lumbar and thoracic rotation to the left.",
    angles: {
      lumbar: { flexExt: 0, lateral: 0, rotation: 4 },
      thoracic: { flexExt: 0, lateral: 0, rotation: 25 },
    },
  },
];

export const PRESET_GROUPS = Array.from(new Set(PRESETS.map((p) => p.group)));
