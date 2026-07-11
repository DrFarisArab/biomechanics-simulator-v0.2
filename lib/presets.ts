export interface PosePreset {
  id: string;
  label: string;
  group: string;
  description: string;
  angles: Record<string, Record<string, number>>;
}

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
    id: "sitting",
    label: "Sitting (90/90)",
    group: "Sitting",
    description: "Hips and knees flexed to 90°.",
    angles: bilateral({ hip: { flexExt: 90 }, knee: { flexExt: 90 } }),
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
    angles: { ...bilateral({ shoulder: { flexExt: 170 } }), thoracic: { flexExt: -10, lateral: 0, rotation: 0 } },
  },
  {
    id: "slr_right",
    label: "Straight-Leg Raise (R)",
    group: "Assessment",
    description: "Passive hip flexion with the knee extended.",
    angles: { hip_right: { flexExt: 70 } },
  },
  {
    id: "thomas_test_left",
    label: "Thomas Test (L)",
    group: "Assessment",
    description: "One hip+knee flexed to chest, other leg extended flat — tests iliopsoas/rectus femoris tightness.",
    angles: { hip_left: { flexExt: 120 }, knee_left: { flexExt: 130 } },
  },
  {
    id: "deep_squat",
    label: "Deep Squat",
    group: "Functional",
    description: "Combined hip, knee and ankle flexion.",
    angles: bilateral({ hip: { flexExt: 100 }, knee: { flexExt: 120 }, ankle: { dorsiPlantar: 15 } }),
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
