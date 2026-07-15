// Canonical human-readable joint names, shared by Sidebar (DOF editor) and
// the Record & Replay joint picker — single source of truth so the two
// panels can never drift into showing different labels for the same joint id.
export const JOINT_LABELS: Record<string, string> = {
  shoulder_left: "Left Shoulder",
  shoulder_right: "Right Shoulder",
  elbow_left: "Left Elbow",
  elbow_right: "Right Elbow",
  forearm_left: "Left Forearm",
  forearm_right: "Right Forearm",
  wrist_left: "Left Wrist",
  wrist_right: "Right Wrist",
  pelvis: "Pelvis",
  lumbar: "Lumbar Spine",
  thoracic: "Thoracic Spine",
  cervical: "Cervical Spine",
  head: "Head",
  hip_left: "Left Hip",
  hip_right: "Right Hip",
  knee_left: "Left Knee",
  knee_right: "Right Knee",
  ankle_left: "Left Ankle",
  ankle_right: "Right Ankle",
  mandible: "Jaw (TMJ)",
};

export const ALL_JOINT_IDS = Object.keys(JOINT_LABELS);
