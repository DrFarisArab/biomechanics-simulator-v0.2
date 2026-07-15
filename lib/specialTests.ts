// Ported from ~/Documents/Provocative special tests/msk-special-tests-with-schematics.jsx
// (a standalone clinical reference app) — data only, field names kept as-is
// (r/cat/n/t/p/pos/sn/sp/tier/pearl) to stay a straightforward sync target if
// the source app's dataset is updated later.

import { PRESETS, type PosePreset } from "./presets";
import { buildAnglesFromCommands } from "./poseFromCommands";

export interface Region {
  id: string;
  name: string;
  family: string;
  color: string;
  blurb: string;
}

export interface SpecialTest {
  id: string;
  r: string; // region id
  cat: string; // category within region
  n: string; // test name
  t: string; // target tissue / diagnosis
  p: string; // procedure
  pos: string; // positive finding
  sn?: string; // sensitivity %
  sp?: string; // specificity %
  tier: 1 | 2 | 3; // 1 stronger evidence, 2 moderate/variable, 3 limited/historical
  pearl?: string;
}

export interface TestCluster {
  id: string;
  r: string;
  name: string;
  when: string;
  items: string[];
  rule: string;
  tests: string[];
}

export const REGIONS: Region[] = [
  { id: "tmj", name: "TMJ", family: "Spine & Axial", color: "#5A54C4", blurb: "Temporomandibular joint & masticatory system" },
  { id: "cx", name: "Cervical Spine", family: "Spine & Axial", color: "#4C46B8", blurb: "Radiculopathy, myelopathy, headache, stability" },
  { id: "tx", name: "Thoracic & Outlet", family: "Spine & Axial", color: "#6A64D8", blurb: "Thoracic outlet syndrome, first rib, rib mobility" },
  { id: "lx", name: "Lumbar Spine", family: "Spine & Axial", color: "#423CA6", blurb: "Radiculopathy, neural tension, instability, UMN" },
  { id: "si", name: "SI Joint & Pelvis", family: "Spine & Axial", color: "#7A74E0", blurb: "SIJ provocation cluster & pelvic girdle pain" },
  { id: "sh", name: "Shoulder", family: "Upper Limb", color: "#0D7377", blurb: "Cuff, impingement, instability, labrum, AC, scapula" },
  { id: "el", name: "Elbow", family: "Upper Limb", color: "#0F8A80", blurb: "Epicondylalgia, UCL, PLRI, cubital tunnel" },
  { id: "wr", name: "Wrist", family: "Upper Limb", color: "#177268", blurb: "CTS, De Quervain, TFCC, carpal instability, vascular" },
  { id: "hn", name: "Hand", family: "Upper Limb", color: "#1E8A7E", blurb: "Thumb CMC, finger/tendon integrity, hypermobility, sensation" },
  { id: "hip", name: "Hip", family: "Lower Limb", color: "#9A552B", blurb: "FAI, labrum, GTPS, deep gluteal, red flags" },
  { id: "kn", name: "Knee", family: "Lower Limb", color: "#83481F", blurb: "Ligaments, meniscus, patellofemoral, PLC, ITB" },
  { id: "an", name: "Ankle", family: "Lower Limb", color: "#AA6432", blurb: "Lateral ligaments, syndesmosis, Achilles, impingement" },
  { id: "ft", name: "Foot", family: "Lower Limb", color: "#C77A3D", blurb: "Plantar fasciopathy, forefoot, midfoot, arch" },
];

// tier: 1 stronger evidence · 2 moderate/variable · 3 limited/historical
export const TESTS: SpecialTest[] = [
  /* ---- TMJ ---- */
  { id: "tmj1", r: "tmj", cat: "Screening", n: "Mandibular ROM & opening path", t: "TMJ dysfunction, disc displacement", p: "Measure maximal mouth opening (normal ≈ 35–50 mm between incisors) and watch the path of opening.", pos: "Opening < 35 mm; C-shaped deviation that returns to midline suggests disc displacement with reduction; deflection that stays to one side suggests displacement without reduction or capsular restriction.", tier: 2 },
  { id: "tmj2", r: "tmj", cat: "Screening", n: "Joint sounds — palpation / auscultation", t: "Disc displacement, degenerative joint disease", p: "Palpate over both TMJs (or auscultate) during opening and closing.", pos: "Reciprocal click (opening + closing) suggests disc displacement with reduction; crepitus suggests degenerative change.", tier: 2 },
  { id: "tmj3", r: "tmj", cat: "Differentiation", n: "Dynamic loading / bite test", t: "Intra-articular vs muscular pain", p: "Patient bites forcefully on a tongue depressor or cotton roll placed on one side.", pos: "Biting on the ipsilateral side unloads that joint — decreased ipsilateral pain (or increased contralateral pain) points to an intra-articular source.", tier: 3 },
  { id: "tmj4", r: "tmj", cat: "Differentiation", n: "Resisted opening / closing isometrics", t: "Masticatory muscle involvement", p: "Apply graded manual resistance to opening, closing and lateral deviation with the jaw in mid-position.", pos: "Pain with resisted contraction but not with joint loading favours masticatory myalgia.", tier: 3 },

  /* ---- CERVICAL ---- */
  { id: "cx1", r: "cx", cat: "Radiculopathy", n: "Spurling test", t: "Cervical radiculopathy (foraminal compression)", p: "Extend the neck, side-bend/rotate toward the symptomatic side, then apply careful axial compression.", pos: "Reproduction of the familiar radicular arm pain (neck pain alone is not positive).", sn: "38–50", sp: "86–93", tier: 1, pearl: "Specific, not sensitive — good for ruling IN. Part of the Wainner cluster." },
  { id: "cx2", r: "cx", cat: "Radiculopathy", n: "Cervical distraction test", t: "Cervical radiculopathy", p: "Supine; grasp under the occiput and chin and apply gentle axial traction (~10–15 kg).", pos: "Reduction or abolition of radicular symptoms.", sn: "40–44", sp: "90–97", tier: 1 },
  { id: "cx3", r: "cx", cat: "Radiculopathy", n: "ULNT 1 (median nerve bias)", t: "Neural mechanosensitivity, radiculopathy", p: "Sequence: shoulder girdle depression → ~110° abduction → forearm supination + wrist/finger extension → shoulder ER → elbow extension. Add contralateral neck side-bend for structural differentiation.", pos: "Reproduction of symptoms, > 10° side-to-side elbow extension deficit, and change with neck movement.", sn: "72–97", sp: "11–33", tier: 2, pearl: "Very sensitive — a clearly negative ULNT1 helps rule OUT radiculopathy." },
  { id: "cx4", r: "cx", cat: "Radiculopathy", n: "Shoulder abduction relief (Bakody)", t: "Cervical radiculopathy (often C4–C6)", p: "Patient rests the symptomatic hand on top of the head.", pos: "Reduction of radicular symptoms; increase suggests interscalene or shoulder source.", sn: "17–78", sp: "75–92", tier: 2 },
  { id: "cx5", r: "cx", cat: "Headache", n: "Cervical flexion-rotation test (CFRT)", t: "Cervicogenic headache (C1–2 dysfunction)", p: "Supine; fully flex the cervical spine, then passively rotate the head each way.", pos: "Rotation < ~32–34° toward the painful side, or ≥ 10° deficit vs the other side (normal ≈ 44°).", sn: "≈90", sp: "≈88", tier: 1 },
  { id: "cx6", r: "cx", cat: "Motor control", n: "Craniocervical flexion test (CCFT)", t: "Deep neck flexor activation & endurance", p: "Supine with pressure biofeedback at 20 mmHg; patient performs graded head-nod to 22→30 mmHg, 10-s holds.", pos: "Inability to target/hold pressure or dominant superficial flexor substitution (SCM).", tier: 2, pearl: "A performance measure rather than a diagnostic test — also doubles as the starting exercise." },
  { id: "cx7", r: "cx", cat: "Stability & red flags", n: "Sharp-Purser test", t: "Atlantoaxial instability (RA, Down syndrome)", p: "Patient slightly flexes the neck; stabilise C2 spinous process and press the forehead posteriorly.", pos: "Reduction of symptoms or a palpable clunk as C1 reduces on C2.", sn: "≈69", sp: "≈96", tier: 2, pearl: "Perform BEFORE any provocative upper cervical testing in at-risk patients." },
  { id: "cx8", r: "cx", cat: "Stability & red flags", n: "Alar ligament stress test", t: "Upper cervical ligament integrity", p: "Stabilise/palpate C2; passively side-bend (or rotate) the head. C2 should move immediately.", pos: "Absent or delayed C2 movement and/or excessive laxity.", tier: 3, pearl: "Limited diagnostic accuracy — interpret only within a full craniocervical screen." },
  { id: "cx9", r: "cx", cat: "Myelopathy (UMN)", n: "Hoffmann sign", t: "Cervical myelopathy", p: "Flick the distal phalanx of the middle finger into flexion.", pos: "Reflex flexion-adduction of the thumb and/or index finger.", sn: "44–58", sp: "74–78", tier: 2, pearl: "Most useful inside the Cook myelopathy cluster (see Clusters)." },
  { id: "cx10", r: "cx", cat: "Myelopathy (UMN)", n: "Inverted supinator sign", t: "Cervical myelopathy (≈C5–6 level)", p: "Tap the brachioradialis tendon near the distal radius.", pos: "Finger flexion or elbow extension instead of the normal elbow flexion.", tier: 2 },
  { id: "cx11", r: "cx", cat: "Myelopathy (UMN)", n: "Lhermitte sign", t: "Cord / dorsal column irritation", p: "Passive or active cervical flexion, often in sitting.", pos: "Electric-shock sensation down the spine and/or limbs.", tier: 3, pearl: "Low sensitivity but concerning when present — consider imaging referral." },
  { id: "cx12", r: "cx", cat: "First rib & thoracic", n: "Cervical rotation lateral flexion (CRLF)", t: "Elevated / hypomobile first rib", p: "Passively rotate the head away from the tested side, then attempt to flex the neck toward the chest.", pos: "A firm block to lateral flexion compared with the other side.", tier: 3 },
  { id: "cx13", r: "cx", cat: "Stability & red flags", n: "Vascular screening hold (pre-manipulative)", t: "Symptoms of vertebrobasilar / cervical arterial dysfunction", p: "Sustain end-range rotation (± extension) ~10 s each side while monitoring eyes and symptoms.", pos: "Dizziness, diplopia, dysarthria, dysphagia, drop attacks, nystagmus (the 5 Ds).", tier: 3, pearl: "Poor validity for detecting arterial compromise — treat as symptom screening plus history (BP, smoking, trauma), never as clearance." },
  { id: "cx14", r: "cx", cat: "Screening / clinical decision rule", n: "Canadian C-Spine Rule", t: "Need for cervical spine imaging after trauma", p: "Algorithm: any high-risk factor (age ≥65, dangerous mechanism, paraesthesia) → image. Else, if a low-risk factor allows safe assessment → test active rotation 45° each way; inability to rotate fully → image.", pos: "Any high-risk factor present, no low-risk factor allowing safe assessment, or <45° active rotation either way.", sn: "99–100", sp: "≈43", tier: 1, pearl: "A clinical decision rule, not a positional maneuver — outperforms the NEXUS criteria for sensitivity in alert, stable trauma patients." },
  { id: "cx15", r: "cx", cat: "Stability & red flags", n: "Transverse ligament stress test", t: "Atlantoaxial (C1–2) hypermobility", p: "Supine; cup the occiput, index fingers over the C1 neural arch, and lift the head + C1 anteriorly (no flexion/extension) for 10–20 s.", pos: "Soft end-feel, or reproduction of nystagmus, dizziness, nausea, perioral paraesthesia, or a lump-in-throat sensation.", sn: "≈65", sp: "≈99", tier: 1, pearl: "Very specific — sufficient to rule IN upper cervical instability, but a negative test doesn't rule it out (low sensitivity)." },

  /* ---- THORACIC & OUTLET ---- */
  { id: "tx1", r: "tx", cat: "Thoracic outlet", n: "Adson test", t: "Scalene-triangle (interscalene) compression", p: "Extend and rotate the head toward the tested side while the patient inhales deeply; monitor the radial pulse and symptoms with the arm slightly abducted-extended.", pos: "Reproduction of the patient's symptoms — pulse obliteration alone is common in normals.", sn: "≈79", sp: "74–100", tier: 3, pearl: "High false-positive rate; only meaningful with symptom reproduction and as part of a TOS battery." },
  { id: "tx2", r: "tx", cat: "Thoracic outlet", n: "Roos / EAST test", t: "Thoracic outlet syndrome (all sites)", p: "Arms in 90° abduction + 90° elbow flexion ('surrender'); slowly open and close the fists for up to 3 minutes.", pos: "Reproduction of familiar symptoms, heaviness, or inability to complete the test (mild fatigue is normal).", sn: "≈84", sp: "30–100", tier: 2 },
  { id: "tx3", r: "tx", cat: "Thoracic outlet", n: "Wright hyperabduction test", t: "Pectoralis-minor space compression", p: "Passively hyperabduct and externally rotate the arm; monitor pulse and symptoms in stages.", pos: "Symptom reproduction (± pulse change) in hyperabduction.", tier: 3 },
  { id: "tx4", r: "tx", cat: "Thoracic outlet", n: "Costoclavicular (military brace) test", t: "Costoclavicular space compression", p: "Patient retracts and depresses the shoulder girdle ('exaggerated attention posture') for ~1 minute.", pos: "Reproduction of symptoms ± radial pulse change.", tier: 3 },
  { id: "tx5", r: "tx", cat: "Thoracic outlet", n: "Cyriax release test", t: "TOS — release phenomenon", p: "Passively elevate the whole shoulder girdle (forearms supported) and hold up to 3 minutes.", pos: "Paraesthesia or symptom change as compressed structures are released.", tier: 3 },
  { id: "tx6", r: "tx", cat: "Rib & segment", n: "Rib spring / PA provocation", t: "Rib or thoracic segmental dysfunction", p: "Prone; apply graded posteroanterior springing over ribs and thoracic segments.", pos: "Reproduction of familiar local pain and/or clear hypo- or hypermobility vs adjacent levels.", tier: 3 },

  /* ---- LUMBAR ---- */
  { id: "lx1", r: "lx", cat: "Radiculopathy / neural", n: "Straight leg raise (Lasègue)", t: "Lumbosacral radiculopathy (L4–S1), disc herniation", p: "Supine; passively raise the straight leg. Sensitising: add ankle dorsiflexion (Bragard) or neck flexion.", pos: "Reproduction of radicular leg pain between ~30–70° of hip flexion, changed by sensitisers. Isolated hamstring tightness is not positive.", sn: "85–91", sp: "26–29", tier: 1, pearl: "Sensitive, not specific — a negative SLR argues against disc herniation." },
  { id: "lx2", r: "lx", cat: "Radiculopathy / neural", n: "Crossed straight leg raise", t: "Disc herniation (L4–S1)", p: "Raise the asymptomatic leg.", pos: "Reproduction of pain in the symptomatic (opposite) leg.", sn: "22–43", sp: "88–98", tier: 1, pearl: "Mirror of SLR — highly specific, so good for ruling IN a herniation." },
  { id: "lx3", r: "lx", cat: "Radiculopathy / neural", n: "Slump test", t: "Neural mechanosensitivity, radiculopathy", p: "Seated slump → cervical flexion → knee extension → ankle dorsiflexion; then release neck flexion.", pos: "Reproduction of familiar symptoms that ease when the neck is extended (structural differentiation).", sn: "52–84", sp: "83–89", tier: 1 },
  { id: "lx4", r: "lx", cat: "Radiculopathy / neural", n: "Femoral nerve tension (prone knee bend)", t: "Upper lumbar radiculopathy (L2–L4)", p: "Prone; flex the knee and extend the hip.", pos: "Reproduction of anterior thigh radicular pain.", sn: "≈50", sp: "≈100", tier: 2 },
  { id: "lx5", r: "lx", cat: "Instability", n: "Prone instability test", t: "Lumbar segmental instability", p: "Trunk prone on table, feet on floor. Provoke PA pressure; repeat with legs actively lifted off the floor.", pos: "Pain present with feet down that disappears when the legs are lifted (muscle activation stabilises).", sn: "61", sp: "57", tier: 2, pearl: "One of Hicks' criteria supporting a stabilisation-exercise responder." },
  { id: "lx6", r: "lx", cat: "Instability", n: "Passive lumbar extension test", t: "Lumbar segmental instability", p: "Prone; lift both legs ~30 cm by the ankles, keeping knees extended.", pos: "Familiar low back pain that resolves on lowering.", sn: "84", sp: "90", tier: 2 },
  { id: "lx7", r: "lx", cat: "Stenosis", n: "Two-stage treadmill / extension bias", t: "Lumbar spinal stenosis (neurogenic claudication)", p: "Compare walking tolerance on level vs inclined treadmill (flexed posture).", pos: "Later symptom onset and longer tolerance when walking in flexion (inclined) than upright.", tier: 2 },
  { id: "lx8", r: "lx", cat: "Non-organic", n: "Waddell signs (screen)", t: "Non-organic / behavioural component", p: "Screen: superficial/non-anatomic tenderness, axial loading & simulated rotation, distracted SLR, regional non-dermatomal changes, over-reaction.", pos: "Three or more categories suggest a significant behavioural/psychosocial component.", tier: 2, pearl: "A yellow-flag screen, NOT a test for malingering — interpret with care." },
  { id: "lx9", r: "lx", cat: "Radiculopathy / neural", n: "Bowstring / popliteal compression", t: "Sciatic nerve tension", p: "At the SLR symptom point, slightly flex the knee, then apply thumb pressure in the popliteal fossa.", pos: "Reproduction of the same radiating symptoms.", tier: 3 },
  { id: "lx10", r: "lx", cat: "Radiculopathy / neural", n: "Bragard's sign", t: "Lumbosacral radiculopathy (vs isolated hamstring tightness)", p: "At the SLR pain point, lower the leg just below threshold, then dorsiflex the ankle.", pos: "Return of the familiar radicular pain with dorsiflexion.", sn: "≈69", sp: "≈76", tier: 2, pearl: "An SLR sensitiser in its own right — best used when SLR alone is equivocal, especially within the first 3 weeks of symptoms." },
  { id: "lx11", r: "lx", cat: "Core / motor control", n: "Double leg lowering test", t: "Abdominal (anterior core) control", p: "Supine, both hips flexed to 90° with a pressure cuff/hand under the low back; slowly lower both legs while maintaining posterior pelvic tilt.", pos: "The angle at which the low back arches and pressure drops — a smaller angle before losing the tilt indicates weaker eccentric abdominal control.", tier: 3, pearl: "Eccentric, harder than a curl-up — tests the abdominals' ability to control the pelvis under increasing hip-flexor load as the legs descend." },
  { id: "lx12", r: "lx", cat: "Directional preference", n: "McKenzie side glide test", t: "Frontal-plane directional preference / lateral shift", p: "Standing, shoulders kept level; glide the hips sideways as far as possible each direction (therapist can assist/overpressure).", pos: "Asymmetric loss of motion or reproduction/centralisation of symptoms to one side identifies a lateral component.", tier: 3, pearl: "Part of McKenzie/MDT classification — pairs with repeated flexion/extension to find the patient's full directional preference." },

  /* ---- SI JOINT & PELVIS ---- */
  { id: "si1", r: "si", cat: "Provocation cluster", n: "Thigh thrust (POSH)", t: "SIJ pain provocation", p: "Supine; flex the hip 90° and apply a posterior shear through the femur.", pos: "Reproduction of familiar SIJ/buttock pain.", sn: "36–88", sp: "≈69", tier: 1, pearl: "Individually the strongest single SIJ provocation test." },
  { id: "si2", r: "si", cat: "Provocation cluster", n: "Distraction (gapping)", t: "SIJ pain provocation", p: "Supine; apply a posterolateral force to both ASIS.", pos: "Reproduction of familiar SIJ pain.", sn: "≈60", sp: "≈81", tier: 1 },
  { id: "si3", r: "si", cat: "Provocation cluster", n: "Compression (approximation)", t: "SIJ pain provocation", p: "Side-lying; apply a downward force through the uppermost iliac crest.", pos: "Reproduction of familiar SIJ pain.", sn: "≈69", sp: "≈69", tier: 1 },
  { id: "si4", r: "si", cat: "Provocation cluster", n: "Sacral thrust", t: "SIJ pain provocation", p: "Prone; apply a posteroanterior thrust through the midline of the sacrum.", pos: "Reproduction of familiar SIJ pain.", sn: "≈53", sp: "≈75", tier: 1 },
  { id: "si5", r: "si", cat: "Provocation cluster", n: "Gaenslen test", t: "SIJ pain provocation", p: "Supine at the table edge; one hip in full flexion while the other drops into extension.", pos: "Reproduction of familiar SIJ pain on the extended side.", sn: "≈53", sp: "≈71", tier: 2 },
  { id: "si6", r: "si", cat: "Pelvic girdle (peripartum)", n: "Active straight leg raise (ASLR)", t: "Pelvic girdle pain / force-closure deficit", p: "Supine; raise the straight leg ~20 cm. Re-test with manual pelvic compression.", pos: "Heaviness/difficulty that improves with compression indicates a load-transfer problem.", sn: "≈87", sp: "≈94", tier: 2 },
  { id: "si7", r: "si", cat: "Other", n: "FABER (Patrick) — SIJ use", t: "SIJ or hip pathology", p: "Figure-4 position; apply gentle overpressure to knee and opposite ASIS.", pos: "Posterior/SIJ pain suggests SIJ; groin pain points to the hip.", tier: 2, pearl: "Non-specific — location of pain guides interpretation (also appears under Hip)." },

  /* ---- SHOULDER ---- */
  { id: "sh1", r: "sh", cat: "Subacromial / impingement", n: "Neer impingement sign", t: "Subacromial pain (impingement)", p: "Stabilise the scapula and passively force the internally-rotated arm into full flexion.", pos: "Pain in the anterolateral shoulder near end-range.", sn: "72–79", sp: "31–60", tier: 2, pearl: "Sensitive but not specific — screens IN, does not localise the tissue." },
  { id: "sh2", r: "sh", cat: "Subacromial / impingement", n: "Hawkins-Kennedy", t: "Subacromial pain (impingement)", p: "Shoulder and elbow at 90°; passively internally rotate the arm.", pos: "Reproduction of anterolateral pain.", sn: "74–80", sp: "40–59", tier: 2 },
  { id: "sh3", r: "sh", cat: "Subacromial / impingement", n: "Painful arc", t: "Subacromial pain", p: "Active abduction in the scapular plane.", pos: "Pain between ~60° and 120°, easing above and below.", sn: "33–74", sp: "81", tier: 2 },
  { id: "sh4", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Empty can (Jobe)", t: "Supraspinatus tear / tendinopathy", p: "Arm 90° in scapular plane, full internal rotation (thumb down); resist downward pressure.", pos: "Weakness and/or pain vs the other side.", sn: "63–89", sp: "50–68", tier: 2 },
  { id: "sh5", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Full can", t: "Supraspinatus (better tolerated)", p: "Same position but thumb-up (external rotation); resist downward pressure.", pos: "Weakness or pain.", sn: "70–77", sp: "68–74", tier: 2, pearl: "Often preferred over empty can — similar accuracy, less provocative." },
  { id: "sh6", r: "sh", cat: "Rotator cuff — infraspinatus/teres minor", n: "Resisted external rotation (arm at side)", t: "Infraspinatus / teres minor", p: "Elbow at side, 90° flexion, neutral rotation; resist external rotation.", pos: "Weakness or pain.", sn: "≈42", sp: "≈90", tier: 2 },
  { id: "sh7", r: "sh", cat: "Rotator cuff — infraspinatus/teres minor", n: "External rotation lag sign", t: "Infraspinatus full-thickness tear", p: "Passively bring the arm to near-full ER at 20° abduction and ask the patient to hold.", pos: "The arm drifts back into internal rotation (a lag).", sn: "46–56", sp: "94–98", tier: 2 },
  { id: "sh8", r: "sh", cat: "Rotator cuff — subscapularis", n: "Lift-off (Gerber)", t: "Subscapularis tear", p: "Dorsum of hand on the low back; patient lifts the hand away from the back.", pos: "Inability to lift off, or a lag.", sn: "18–62", sp: "79–100", tier: 2 },
  { id: "sh9", r: "sh", cat: "Rotator cuff — subscapularis", n: "Belly-press", t: "Subscapularis (upper) tear", p: "Palm on the belly, elbow forward; patient presses without flexing the wrist.", pos: "Elbow drops back / wrist flexes to compensate.", sn: "40–88", sp: "84–98", tier: 2 },
  { id: "sh10", r: "sh", cat: "Rotator cuff — subscapularis", n: "Bear-hug", t: "Subscapularis (upper) tear", p: "Palm on the opposite shoulder; resist the examiner lifting the hand off.", pos: "Weakness holding the hand down.", sn: "≈60", sp: "≈92", tier: 2 },
  { id: "sh11", r: "sh", cat: "Instability", n: "Apprehension test", t: "Anterior glenohumeral instability", p: "Supine; 90° abduction, progressive external rotation.", pos: "Apprehension/guarding (not just pain) that the shoulder will dislocate.", sn: "53–72", sp: "96–99", tier: 1 },
  { id: "sh12", r: "sh", cat: "Instability", n: "Relocation (Jobe)", t: "Anterior instability", p: "Repeat apprehension while applying a posteriorly-directed force to the humeral head.", pos: "Apprehension resolves with the posterior force.", sn: "46–65", sp: "54–100", tier: 1 },
  { id: "sh13", r: "sh", cat: "Instability", n: "Surprise / release", t: "Anterior instability", p: "From relocation, suddenly release the posterior force.", pos: "Sudden return of apprehension.", sn: "≈64", sp: "≈99", tier: 1, pearl: "Apprehension + relocation + surprise together are highly specific for anterior instability." },
  { id: "sh14", r: "sh", cat: "Instability", n: "Sulcus sign", t: "Inferior / multidirectional instability", p: "Apply downward traction on the arm at the side.", pos: "A visible sulcus (>2 cm) between acromion and humeral head.", tier: 2 },
  { id: "sh15", r: "sh", cat: "Labrum (SLAP)", n: "O'Brien active compression", t: "SLAP lesion / AC joint", p: "Arm 90° flexion, 10° adduction, full IR (thumb down); resist down, then repeat supinated (thumb up).", pos: "Deep pain thumb-down that reduces thumb-up (SLAP); pain 'on top' localised to the AC joint suggests AC pathology.", sn: "47–78", sp: "11–73", tier: 2 },
  { id: "sh16", r: "sh", cat: "Labrum (SLAP)", n: "Biceps load II", t: "SLAP lesion", p: "Supine, 120° abduction, full ER, elbow 90° supinated; patient resists elbow flexion.", pos: "Pain on resisted flexion in this position.", sn: "30–90", sp: "78–97", tier: 2 },
  { id: "sh17", r: "sh", cat: "Biceps", n: "Speed test", t: "Long head of biceps / SLAP", p: "Elbow extended, forearm supinated, ~60° flexion; resist shoulder flexion.", pos: "Pain in the bicipital groove.", sn: "32–68", sp: "56–75", tier: 3 },
  { id: "sh18", r: "sh", cat: "AC joint", n: "Cross-body adduction", t: "AC joint pathology", p: "Passively adduct the flexed arm across the body.", pos: "Localised pain at the AC joint.", sn: "77", sp: "79", tier: 2 },
  { id: "sh19", r: "sh", cat: "Scapula", n: "Scapular assistance / retraction", t: "Scapular dyskinesis contribution", p: "Manually assist scapular upward rotation (assist) or stabilise it in retraction while re-testing a painful/weak movement.", pos: "Symptoms or strength improve with the correction.", tier: 2, pearl: "A modification procedure, not a pathology test — it identifies a treatable scapular contribution." },
  { id: "sh20", r: "sh", cat: "Frozen shoulder", n: "Passive ER loss in adduction", t: "Adhesive capsulitis vs cuff", p: "Compare passive external rotation with the elbow at the side, both sides.", pos: "A global capsular pattern with markedly limited passive ER points to adhesive capsulitis rather than a cuff tear.", tier: 2 },
  { id: "sh21", r: "sh", cat: "Instability", n: "Anterior drawer test (shoulder)", t: "Anterior glenohumeral instability", p: "Supine, 80–120° abduction, 0–20° flexion, 0–30° external rotation; stabilise the scapula and draw the humerus forward.", pos: "Increased anterior translation vs the other side, graded 0–3; a click may suggest a labral tear.", sn: "53", sp: "85", tier: 2, pearl: "Useful when the apprehension test is hard to interpret on an aching (rather than unstable-feeling) shoulder." },
  { id: "sh22", r: "sh", cat: "Neuro differentiation", n: "Arm squeeze test", t: "Cervical radiculopathy vs shoulder pathology", p: "Squeeze the middle third of the upper arm (biceps/triceps belly).", pos: "Local pain on squeeze points to cervical nerve root compression rather than a shoulder source.", tier: 3, pearl: "A quick bedside differentiator when it's unclear whether arm pain is coming from the neck or the shoulder." },
  { id: "sh23", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Drop arm test (Codman's)", t: "Full-thickness rotator cuff tear (supraspinatus)", p: "Passively abduct the arm to 90°, then ask the patient to slowly lower it back to neutral.", pos: "The arm suddenly drops, or pain/weakness appears, during the lowering.", sn: "73", sp: "77", tier: 2, pearl: "Best combined with the infraspinatus test and painful arc — 3/3 positive raises +LR to ≈15.6 (≈28 if also over 60)." },
  { id: "sh24", r: "sh", cat: "Labrum (SLAP)", n: "Crank test", t: "Glenoid labral tear / SLAP lesion", p: "Sitting, arm flexed 90°; axially load the humerus while rotating it (usually painful on external rotation).", pos: "Reproduction of pain, with or without a click.", sn: "9–91", sp: "56–100", tier: 3, pearl: "Wide reported accuracy range — treat as one piece of a labral cluster, not a stand-alone rule-in/out." },
  { id: "sh25", r: "sh", cat: "Scapula", n: "Hara test", t: "Throwing kinetic-chain dysfunction", p: "An 11-item battery of scapular/humeral measures (e.g. scapula-spine distance) used in overhead throwing athletes.", pos: "Abnormal findings across the battery localise where in the kinetic chain the throwing dysfunction originates.", tier: 3, pearl: "Sport-specific (baseball pitching) — a measurement battery rather than a single provocation test." },
  { id: "sh26", r: "sh", cat: "Rotator cuff — infraspinatus/teres minor", n: "Hornblower's sign (Patte's test)", t: "Teres minor tear", p: "Standing, arm 90° abduction in the scapular plane, elbow 90°; resist active external rotation.", pos: "Inability to externally rotate against resistance; also positive if the patient must abduct the arm to bring the hand to the mouth.", sn: "100", sp: "93", tier: 1, pearl: "A positive Hornblower's alongside a positive external rotation lag sign suggests an irreparable posterosuperior cuff tear." },
  { id: "sh27", r: "sh", cat: "Rotator cuff — subscapularis", n: "Internal rotation lag sign", t: "Subscapularis tendon tear", p: "Sitting; passively bring the hand off the low back into 20° of extension, then release and ask the patient to hold.", pos: "A lag (the hand drifts back toward the back) — larger lag suggests a larger tear.", sn: "97–100", sp: "84–96", tier: 1, pearl: "Also called the subscapularis 'spring-back' test — pairs with lift-off as the two subscapularis-specific signs." },
  { id: "sh28", r: "sh", cat: "Instability", n: "Jerk test", t: "Posteroinferior glenohumeral instability", p: "90° abduction + internal rotation; axially load the humerus while moving the arm horizontally across the body.", pos: "A sudden clunk as the humeral head slides off the back of the glenoid (and again, returning it).", sn: "73", sp: "98", tier: 1, pearl: "Combine with the Kim test — sensitivity for posteroinferior labral lesions rises to ≈97% when both are positive." },
  { id: "sh29", r: "sh", cat: "Labrum (SLAP)", n: "Kim test", t: "Posteroinferior labral lesion", p: "Sitting, arm 90° abduction; strong axial load, then diagonal downward-and-backward force at 45° elevation.", pos: "Sudden posterior shoulder pain, with or without a clunk.", sn: "80", sp: "94", tier: 1, pearl: "More sensitive than the jerk test for a predominantly inferior lesion; the jerk test is better for a posterior one." },
  { id: "sh30", r: "sh", cat: "Instability", n: "Load and shift", t: "Glenohumeral joint laxity", p: "Sitting; stabilise the scapula and glide the humeral head anteromedially, then posterolaterally.", pos: "Translation beyond half the humeral head's width vs the other side.", sn: "14–50", sp: "≈100", tier: 2, pearl: "Not biomechanically validated, but very specific when translation is clearly excessive." },
  { id: "sh31", r: "sh", cat: "Instability", n: "Norwood stress test", t: "Posterior instability (posterior capsule)", p: "Supine, shoulder 90° abduction with external rotation (forearm vertical), elbow 90°; passively adduct while palpating for posterior head translation.", pos: "Apprehension, pain, or a posterior semi-luxation as the head glides over the glenoid rim.", tier: 3, pearl: "Posterior instability is uncommon (~2% of dislocations) — keep it on the differential when apprehension tests are equivocal." },
  { id: "sh32", r: "sh", cat: "Labrum (SLAP)", n: "Passive compression test", t: "SLAP lesion", p: "Side-lying on the unaffected side; 30° abduction, then passively externally rotate while extending and compressing the humeral head onto the glenoid.", pos: "Pain or a painful click in the joint.", sn: "82", sp: "86", tier: 2 },
  { id: "sh33", r: "sh", cat: "AC joint", n: "Paxinos test", t: "AC joint pathology", p: "Sitting, arm at the side; thumb under the posterolateral acromion, fingers over the mid-clavicle — squeeze the acromion anterosuperior against the clavicle inferior.", pos: "Pain at the AC joint.", sn: "79", sp: "50", tier: 3 },
  { id: "sh34", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Rent test", t: "Full-thickness rotator cuff tear", p: "Sitting, arm relaxed; palpate the anterior margin of the greater tuberosity through the deltoid for a palpable defect/crepitus.", pos: "A palpable 'rent' (gap) or crepitus at the tuberosity.", tier: 2, pearl: "Trans-deltoid palpation — may be the single best physical exam finding for a full-thickness tear when combined with the other cuff tests." },
  { id: "sh35", r: "sh", cat: "AC joint", n: "Resisted AC joint extension test", t: "AC joint pathology (vs subacromial impingement)", p: "Sitting, shoulder and elbow flexed 90° with the shoulder internally rotated; resist horizontal abduction (extension).", pos: "Pain localised to the AC joint.", sn: "72", sp: "85", tier: 2, pearl: "Combine with cross-body adduction and O'Brien's — 2 of 3 positive raises sensitivity to ≈81%." },
  { id: "sh36", r: "sh", cat: "Scapula", n: "Serratus anterior strength (punch-out) test", t: "Serratus anterior weakness / scapular winging", p: "Standing or sitting, arm forward-flexed 90°; apply backward pressure while the patient resists (a wall/floor push-up loads it further).", pos: "Winging of the scapula's medial border.", tier: 2 },
  { id: "sh37", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Whipple test", t: "Partial rotator cuff tear / SLAP lesion", p: "Standing or sitting; flex the arm 90° and adduct it across the body toward the opposite shoulder; resist downward pressure.", pos: "Pain with resisted downward pressure.", sn: "88.6", sp: "29.4", tier: 3, pearl: "Less specific than empty/full can for supraspinatus — use alongside them, not in place of them." },
  { id: "sh38", r: "sh", cat: "Biceps", n: "Yergason's test", t: "Biceps tendon pathology / SLAP lesion", p: "Elbow flexed 90°, forearm pronated; resist active supination + external rotation.", pos: "Pain in the bicipital groove, or a click suggesting transverse humeral ligament injury.", sn: "43", sp: "79", tier: 3 },
  { id: "sh39", r: "sh", cat: "Subacromial / impingement", n: "Yocum's test", t: "Subacromial impingement", p: "Hand placed on the opposite shoulder (cross-body adduction with the elbow flexed); the patient raises the elbow without shrugging the shoulder.", pos: "Pain during elbow elevation.", sn: "79", sp: "40", tier: 3, pearl: "A self-administered alternative to Hawkins-Kennedy — doesn't need the examiner to move the arm." },

  /* ---- ELBOW ---- */
  { id: "el1", r: "el", cat: "Epicondylalgia", n: "Cozen test (resisted wrist ext)", t: "Lateral epicondylalgia (tennis elbow)", p: "Elbow extended, forearm pronated; resist wrist extension while palpating the lateral epicondyle.", pos: "Pain at the lateral epicondyle.", sn: "84", sp: "≈50", tier: 2 },
  { id: "el2", r: "el", cat: "Epicondylalgia", n: "Mill test", t: "Lateral epicondylalgia", p: "Palpate the lateral epicondyle and passively pronate the forearm, flex the wrist and extend the elbow.", pos: "Lateral epicondyle pain.", tier: 2 },
  { id: "el3", r: "el", cat: "Epicondylalgia", n: "Maudsley (resisted middle finger)", t: "Lateral epicondylalgia (EDC bias)", p: "Resist extension of the middle finger with the elbow extended.", pos: "Lateral epicondyle pain.", tier: 2 },
  { id: "el4", r: "el", cat: "Epicondylalgia", n: "Medial epicondyle provocation (golfer)", t: "Medial epicondylalgia", p: "Resist wrist flexion and forearm pronation while palpating the medial epicondyle.", pos: "Medial epicondyle pain.", tier: 2 },
  { id: "el5", r: "el", cat: "Ligament", n: "Valgus stress (UCL)", t: "Ulnar collateral ligament (medial)", p: "Elbow ~20–30° flexion; apply a valgus force.", pos: "Medial pain and/or excess gapping vs the other side.", tier: 2 },
  { id: "el6", r: "el", cat: "Ligament", n: "Moving valgus stress", t: "UCL (overhead athletes)", p: "Full flexion + valgus, then rapidly extend the elbow maintaining valgus.", pos: "Pain reproduced in the late-cocking arc (~120°→70°).", sn: "≈100", sp: "≈75", tier: 2 },
  { id: "el7", r: "el", cat: "Ligament", n: "Varus stress (LCL)", t: "Lateral collateral ligament", p: "Elbow ~20–30° flexion; apply a varus force.", pos: "Lateral pain and/or excess gapping.", tier: 3 },
  { id: "el8", r: "el", cat: "Instability", n: "Lateral pivot-shift / posterolateral rotatory", t: "Posterolateral rotatory instability", p: "Supine, arm overhead; supinate + valgus + axial load while flexing from extension.", pos: "Apprehension or a clunk of radiohumeral subluxation-reduction (often only under anaesthesia).", tier: 3 },
  { id: "el9", r: "el", cat: "Nerve", n: "Elbow flexion + Tinel (cubital tunnel)", t: "Ulnar nerve entrapment", p: "Hold full elbow flexion with wrist extension up to 60 s; tap over the cubital tunnel.", pos: "Paraesthesia in the ulnar 1½ digits.", tier: 2 },

  /* ---- WRIST ---- researched against Physiopedia's Wrist special-tests
   * category (physio-pedia.com/Category:Wrist_-_Special_Tests). */
  { id: "wr1", r: "wr", cat: "Carpal tunnel", n: "Phalen test", t: "Carpal tunnel syndrome (median)", p: "Hold maximal wrist flexion for up to 60 s.", pos: "Paraesthesia in the median distribution (thumb, index, middle, radial ring).", sn: "51–68", sp: "73–76", tier: 2 },
  { id: "wr2", r: "wr", cat: "Carpal tunnel", n: "Tinel at the wrist", t: "Carpal tunnel syndrome", p: "Tap over the median nerve at the carpal tunnel.", pos: "Tingling radiating into the median fingers.", sn: "23–60", sp: "64–87", tier: 2 },
  { id: "wr3", r: "wr", cat: "Carpal tunnel", n: "Carpal compression (Durkan)", t: "Carpal tunnel syndrome", p: "Apply sustained thumb pressure over the carpal tunnel for ~30 s.", pos: "Median-nerve paraesthesia.", sn: "64–83", sp: "≈83", tier: 2, pearl: "Often the most accurate single CTS provocation test." },
  { id: "wr4", r: "wr", cat: "Tendon", n: "Finkelstein / Eichhoff", t: "De Quervain tenosynovitis", p: "Thumb held in the fist; ulnar-deviate the wrist (Eichhoff), or the examiner-guided Finkelstein.", pos: "Sharp pain over the first dorsal compartment (radial styloid).", tier: 2 },
  { id: "wr5", r: "wr", cat: "TFCC / DRUJ", n: "TFCC load (ulnar grind)", t: "Triangular fibrocartilage complex", p: "Ulnar-deviate and axially load the wrist with rotation.", pos: "Ulnar-sided wrist pain and/or click.", tier: 3 },
  { id: "wr6", r: "wr", cat: "TFCC / DRUJ", n: "Piano-key / DRUJ ballottement", t: "Distal radioulnar joint instability", p: "Stabilise the radius and translate the ulnar head dorsally-volarly.", pos: "Excess translation vs the other side ± pain.", tier: 3 },
  { id: "wr7", r: "wr", cat: "Carpal instability", n: "Watson scaphoid shift test", t: "Scapholunate instability", p: "Press the scaphoid tubercle while moving the wrist from ulnar to radial deviation.", pos: "A painful clunk as the scaphoid subluxes/relocates.", tier: 3 },
  { id: "wr8", r: "wr", cat: "Fracture screen", n: "Anatomical snuffbox tenderness", t: "Scaphoid fracture", p: "Palpate the anatomical snuffbox; add scaphoid tubercle tenderness and longitudinal thumb compression.", pos: "Focal tenderness — sensitive; image even with normal early X-ray if suspicious.", sn: "≈90", sp: "40", tier: 2, pearl: "Sensitive but not specific — a negative snuffbox largely rules OUT scaphoid fracture." },
  { id: "wr10", r: "wr", cat: "TFCC / DRUJ", n: "Supination lift test", t: "TFCC injury", p: "Palm-up (fully supinated forearm), ask the patient to lift a table or push up from a chair against resistance.", pos: "Ulnar-sided wrist pain that reproduces the patient's symptoms; inability to lift.", tier: 2, pearl: "A load-bearing functional test, not just passive stress — often positive when passive TFCC tests are equivocal." },
  { id: "wr11", r: "wr", cat: "Vascular", n: "Allen test", t: "Radial/ulnar artery patency", p: "Compress both radial and ulnar arteries, have the patient clench/open the fist to empty the hand, then release one artery at a time.", pos: "Delayed or absent flush on release indicates that artery (or the palmar arch) is inadequate.", tier: 1, pearl: "Essential before radial artery procedures (art-line, harvest) to confirm ulnar collateral flow." },
  { id: "wr12", r: "wr", cat: "Tendon", n: "Wringing test", t: "Lateral epicondylalgia (provoked at the wrist)", p: "Passively or actively wring a towel/cloth — alternating forearm pronation and supination with the wrist gripping.", pos: "Reproduction of lateral elbow pain during the wringing motion.", tier: 3, pearl: "Provokes lateral epicondylalgia through a functional movement rather than isolated resisted extension — useful when Cozen/Mill's are equivocal." },
  { id: "wr13", r: "wr", cat: "Tendon", n: "WHAT test (Wrist Hyperflexion and Abduction of the Thumb)", t: "De Quervain tenosynovitis", p: "Maximally flex the wrist while abducting the thumb.", pos: "Pain over the first dorsal compartment, comparable to Finkelstein's.", tier: 3, pearl: "An alternative to Finkelstein's for patients in whom the classic thumb-in-fist position is itself painful or hard to tolerate." },

  /* ---- HAND ---- researched against Physiopedia's Hand special-tests
   * category (physio-pedia.com/Category:Hand_-_Special_Tests). This rig has
   * no finger/thumb DOFs, so most hand-specific tests below are reference-
   * only (no 3D pose) — see the comments by SPECIAL_TEST_CUSTOM_POSES. */
  { id: "hn1", r: "hn", cat: "Thumb CMC", n: "CMC grind test", t: "First CMC (thumb base) osteoarthritis", p: "Axially load and rotate the thumb metacarpal on the trapezium.", pos: "Pain ± crepitus at the thumb base.", sn: "53–66", sp: "74–93", tier: 2 },
  { id: "hn2", r: "hn", cat: "Hypermobility", n: "Beighton score", t: "Generalised joint hypermobility", p: "9-point composite: passive little-finger MCP extension > 90° (×2), passive thumb-to-forearm apposition (×2), elbow hyperextension > 10° (×2), knee hyperextension > 10° (×2), and forward flexion with palms flat on the floor (×1).", pos: "≥ 4–6/9 (age-dependent) suggests generalised joint hypermobility.", tier: 2, pearl: "A whole-body screen scored at the hand/elbow/knee/spine — not a single-joint provocation test." },
  { id: "hn3", r: "hn", cat: "Finger / PIP", n: "Bunnell-Littler test", t: "Intrinsic tightness vs capsular (joint) tightness at the PIP", p: "With the MCP held extended, passively flex the PIP; then repeat with the MCP held flexed.", pos: "PIP flexion limited only with the MCP extended → intrinsic tightness. Limited in both positions → capsular/joint tightness.", tier: 2 },
  { id: "hn4", r: "hn", cat: "Tendon", n: "Elson test", t: "Central slip (extensor tendon) rupture at the PIP", p: "Flex the PIP to 90° over the edge of a table, then resist active PIP extension.", pos: "A rigid, extended DIP with weak PIP extension force indicates central slip rupture (the lateral bands sublux dorsally and stiffen the DIP).", sn: "≈100", tier: 1, pearl: "Detects an acute boutonnière deformity before it becomes visibly obvious — worth doing after any dorsal PIP trauma." },
  { id: "hn5", r: "hn", cat: "Measurement", n: "Figure-of-eight hand measurement", t: "Hand/finger oedema quantification", p: "Wrap a tape in a figure-8 around the wrist and across the dorsum/palm, looping around the thumb and 5th digit.", pos: "Not a provocation test — larger figure-8 circumference vs the other side quantifies hand swelling.", tier: 2, pearl: "A measurement technique, not a provocative test — good for objective before/after comparison during rehab." },
  { id: "hn6", r: "hn", cat: "Carpal tunnel", n: "Flick sign", t: "Carpal tunnel syndrome (screening question)", p: "Ask whether flicking/shaking the hand relieves the nocturnal numbness/tingling.", pos: "A reported flicking/shaking motion that relieves symptoms is suggestive of CTS.", sn: "≈93", sp: "≈96", tier: 2, pearl: "A history item phrased as a test — high reported accuracy, but relies on patient recall rather than direct provocation." },
  { id: "hn7", r: "hn", cat: "Functional", n: "Sollerman hand function test", t: "Overall grip/hand-function capacity", p: "20-item standardised battery of functional grips (e.g. turning a key, picking up coins, writing) scored 0-4 each.", pos: "Lower composite score quantifies functional hand impairment — used for outcome tracking, not diagnosis.", tier: 2, pearl: "An outcome-measure battery, not a single provocation test — most useful for tracking change over time (e.g. after tendon repair or nerve injury)." },
  { id: "hn8", r: "hn", cat: "Sensation", n: "Weber two-point discrimination", t: "Peripheral nerve sensory function/recovery", p: "Apply two blunt points simultaneously at progressively smaller distances on the fingertip pulp; find the minimum distance still perceived as two points.", pos: "> 6 mm static (or > 5 mm moving) 2-point discrimination suggests impaired sensory nerve function.", tier: 2, pearl: "Tracks nerve regeneration after repair — normal static 2PD is roughly 2-5 mm depending on digit." },
  { id: "hn9", r: "hn", cat: "Vascular / autonomic", n: "Trousseau's sign", t: "Latent hypocalcaemia (neuromuscular irritability)", p: "Inflate a BP cuff above systolic pressure on the upper arm and hold for up to 3 minutes.", pos: "Carpal spasm — wrist flexion with MCP flexion, finger extension, and thumb opposition (main d'accoucheur / 'obstetrician's hand').", sn: "66", sp: "≈98", tier: 2, pearl: "More specific than Chvostek's sign for hypocalcaemia, at the cost of being slower and mildly uncomfortable for the patient." },
  { id: "hn10", r: "hn", cat: "Sensation", n: "Wrinkling test (O'Riain)", t: "Digital nerve integrity (denervation screening)", p: "Immerse the fingertips in warm water for ~5-30 minutes.", pos: "Absence of the normal skin-wrinkling response suggests sympathetic/digital nerve denervation.", tier: 3, pearl: "Useful in young children or uncooperative patients where sensory testing by report isn't reliable." },

  /* ---- HIP ---- */
  { id: "hip1", r: "hip", cat: "FAI / labrum", n: "FADIR (anterior impingement)", t: "FAI / anterosuperior labral tear", p: "Supine; passively flex the hip to 90°, then adduct and internally rotate.", pos: "Reproduction of the familiar deep groin pain.", sn: "94–99", sp: "5–25", tier: 1, pearl: "Very sensitive — a negative FADIR makes intra-articular FAI/labral pathology unlikely." },
  { id: "hip2", r: "hip", cat: "FAI / labrum", n: "FABER (Patrick)", t: "Hip / SIJ / labral pathology", p: "Figure-4 position; gentle overpressure to knee and opposite ASIS. Note knee-to-table height.", pos: "Groin pain suggests hip/labrum; posterior pain suggests SIJ.", sn: "41–88", sp: "18–100", tier: 2 },
  { id: "hip3", r: "hip", cat: "FAI / labrum", n: "Scour / quadrant", t: "Labral tear, chondral lesion, OA", p: "Flex hip to 90°; move through arcs of IR/ER with add/abduction under axial compression.", pos: "Pain, clicking or grinding through the arc.", tier: 3 },
  { id: "hip4", r: "hip", cat: "FAI / labrum", n: "Anterior labral (McCarthy)", t: "Anterior labral tear", p: "From flexion-abduction-ER, move the hip into extension-adduction-IR.", pos: "Reproduction of pain or a click.", tier: 3 },
  { id: "hip5", r: "hip", cat: "Lateral / GTPS", n: "Resisted external derotation / single-leg stance", t: "Gluteal tendinopathy (GTPS)", p: "Provoke the abductors with resisted derotation, or hold a 30-s single-leg stance.", pos: "Reproduction of lateral hip pain over the greater trochanter.", sn: "≈88", sp: "≈97", tier: 2 },
  { id: "hip6", r: "hip", cat: "Lateral / GTPS", n: "Ober test", t: "ITB / TFL tightness", p: "Side-lying; abduct-extend the hip then let it drop into adduction (knee straight = ITB, bent = TFL).", pos: "Failure to adduct below horizontal.", tier: 3 },
  { id: "hip7", r: "hip", cat: "Lateral / GTPS", n: "Trendelenburg", t: "Gluteus medius weakness / hip abductor mechanism", p: "Single-leg stance for ~30 s; watch the contralateral pelvis.", pos: "Drop of the non-stance-side pelvis.", sn: "23–73", sp: "77–94", tier: 2 },
  { id: "hip8", r: "hip", cat: "Muscle length", n: "Thomas test", t: "Hip-flexor / rectus femoris tightness", p: "Supine at table edge; hug one knee to chest and observe the other thigh and knee.", pos: "Thigh rises off the table (iliopsoas) or the knee extends (rectus femoris).", tier: 2 },
  { id: "hip9", r: "hip", cat: "Muscle length", n: "Ely test", t: "Rectus femoris tightness", p: "Prone; passively flex the knee.", pos: "The ipsilateral hip flexes (buttock rises).", sn: "56–59", sp: "64–85", tier: 3 },
  { id: "hip10", r: "hip", cat: "Deep gluteal / sciatic", n: "FAIR / seated piriformis stretch", t: "Deep gluteal syndrome (piriformis)", p: "Flex-adduct-internally rotate the hip (FAIR), or the seated stretch with passive IR.", pos: "Reproduction of buttock pain ± sciatic radiation.", sn: "≈52–88", sp: "≈80–92", tier: 3 },
  { id: "hip11", r: "hip", cat: "Deep gluteal / sciatic", n: "Active piriformis test", t: "Deep gluteal syndrome", p: "Side-lying; resist active hip abduction-ER while palpating the piriformis.", pos: "Reproduction of buttock pain.", sn: "78", sp: "80", tier: 3 },
  { id: "hip12", r: "hip", cat: "Intra vs extra-articular", n: "Stinchfield (resisted SLR)", t: "Intra- vs extra-articular hip pain", p: "Resist a straight-leg raise held at ~30°.", pos: "Groin/anterior pain suggests an intra-articular hip source.", tier: 3 },
  { id: "hip13", r: "hip", cat: "Intra vs extra-articular", n: "Log roll", t: "Intra-articular hip pathology", p: "Supine, leg extended; passively roll the whole leg into IR and ER.", pos: "Pain, a click, or asymmetric ER laxity — the most hip-specific passive test.", tier: 2 },
  { id: "hip14", r: "hip", cat: "Red flags", n: "Fulcrum test", t: "Femoral shaft stress fracture", p: "Seated; place a forearm fulcrum under the thigh and apply gentle downward pressure on the knee.", pos: "Sharp localised pain or apprehension over the fracture site.", tier: 3, pearl: "Consider in runners/military recruits with load-related thigh pain — image if suspected." },
  { id: "hip15", r: "hip", cat: "Red flags", n: "Patellar-pubic percussion", t: "Occult hip / femoral neck fracture", p: "Auscultate over the pubic symphysis while percussing each patella.", pos: "A duller, diminished sound on the affected side.", sn: "≈95", sp: "≈86", tier: 2, pearl: "Useful bedside screen for occult fracture when X-ray is equivocal." },

  /* ---- KNEE ---- */
  { id: "kn1", r: "kn", cat: "ACL", n: "Lachman test", t: "ACL integrity", p: "Knee at 20–30° flexion; stabilise the femur and translate the tibia anteriorly.", pos: "Increased translation with a soft or absent endpoint.", sn: "81–87", sp: "≈97", tier: 1, pearl: "The most accurate single ACL test — assess endpoint quality, not just distance." },
  { id: "kn2", r: "kn", cat: "ACL", n: "Anterior drawer", t: "ACL integrity", p: "Hip 45°, knee 90°; draw the tibia anteriorly.", pos: "Excess anterior translation vs the other side.", sn: "18–92", sp: "78–98", tier: 2 },
  { id: "kn3", r: "kn", cat: "ACL", n: "Pivot shift", t: "Anterolateral rotatory instability (ACL)", p: "From extension, apply valgus + internal rotation while flexing.", pos: "A visible/palpable reduction clunk of the lateral tibial plateau.", sn: "18–48", sp: "97–99", tier: 1, pearl: "Very specific and correlates with functional instability — hard to elicit when the patient guards." },
  { id: "kn4", r: "kn", cat: "ACL", n: "Lever sign (Lelli)", t: "ACL integrity", p: "Fist under the proximal calf; press down on the distal thigh.", pos: "An intact ACL lifts the heel; if it stays down the test is positive.", tier: 2 },
  { id: "kn5", r: "kn", cat: "PCL", n: "Posterior drawer", t: "PCL integrity", p: "Knee 90°; push the tibia posteriorly.", pos: "Excess posterior translation / soft endpoint.", sn: "22–100", sp: "≈99", tier: 1 },
  { id: "kn6", r: "kn", cat: "PCL", n: "Posterior sag (Godfrey)", t: "PCL insufficiency", p: "Hips and knees at 90°; observe the tibial contour from the side.", pos: "Posterior sag / loss of the tibial step-off.", tier: 2 },
  { id: "kn7", r: "kn", cat: "Collaterals", n: "Valgus stress at 30°", t: "MCL integrity", p: "Slight flexion; apply a valgus force.", pos: "Medial pain and/or excess opening. Opening in full extension implies a more extensive injury.", tier: 2 },
  { id: "kn8", r: "kn", cat: "Collaterals", n: "Varus stress at 30°", t: "LCL integrity", p: "Slight flexion; apply a varus force.", pos: "Lateral pain and/or excess opening.", tier: 2 },
  { id: "kn9", r: "kn", cat: "Meniscus", n: "Joint-line tenderness", t: "Meniscal tear", p: "Palpate the medial and lateral joint lines at ~90° flexion.", pos: "Familiar focal joint-line pain.", sn: "63–83", sp: "≈77", tier: 2 },
  { id: "kn10", r: "kn", cat: "Meniscus", n: "McMurray test", t: "Meniscal tear", p: "Full flexion → extend with tibial rotation (ER biases medial, IR lateral).", pos: "A palpable/audible click or clunk with joint-line pain.", sn: "16–70", sp: "59–98", tier: 2, pearl: "A true thud is specific; pain alone is weak." },
  { id: "kn11", r: "kn", cat: "Meniscus", n: "Thessaly test (20°)", t: "Meniscal tear (loaded)", p: "Single-leg stance at 20° flexion; rotate the body/tibia both ways.", pos: "Joint-line discomfort, catching, or locking.", sn: "64–75", sp: "53–96", tier: 2 },
  { id: "kn12", r: "kn", cat: "Meniscus", n: "Apley grind", t: "Meniscal tear", p: "Prone, knee 90°; compress + rotate the tibia (compare with distraction).", pos: "Pain with compression (not distraction) suggests meniscus rather than ligament.", tier: 3 },
  { id: "kn13", r: "kn", cat: "Effusion", n: "Sweep / bulge test", t: "Small–moderate effusion", p: "Milk fluid up the medial gutter then stroke down and watch for a returning wave.", pos: "A fluid wave appears on the medial side.", tier: 2 },
  { id: "kn14", r: "kn", cat: "Effusion", n: "Patellar tap (ballottement)", t: "Larger effusion", p: "Compress the suprapatellar pouch and tap the patella onto the femur.", pos: "A floating patella / distinct tap.", tier: 2 },
  { id: "kn15", r: "kn", cat: "Patellofemoral", n: "Patellar apprehension", t: "Lateral patellar instability", p: "Knee slightly flexed; glide the patella laterally.", pos: "Guarding or apprehension of dislocation.", tier: 2 },
  { id: "kn16", r: "kn", cat: "Patellofemoral", n: "Patellar grind (Clarke)", t: "Patellofemoral pain / chondral irritation", p: "Press the patella distally while the patient contracts the quads.", pos: "Anterior pain — note the high false-positive rate.", tier: 3, pearl: "Often uncomfortable in healthy knees — low specificity, interpret cautiously." },
  { id: "kn17", r: "kn", cat: "Lateral / ITB", n: "Noble compression", t: "ITB syndrome", p: "Compress over the lateral femoral epicondyle while flexing/extending the knee.", pos: "Lateral pain near 30° flexion.", tier: 3 },
  { id: "kn18", r: "kn", cat: "PLC / rotational", n: "Dial test (30° & 90°)", t: "Posterolateral corner ± PCL", p: "Prone (or supine); compare external tibial rotation at 30° and 90°.", pos: ">10° extra ER at 30° only = PLC; at both 30° and 90° = combined PCL + PLC.", tier: 2 },
  { id: "kn19", r: "kn", cat: "Meniscus", n: "Ege's test (weight-bearing McMurray)", t: "Meniscal tear (loaded)", p: "Standing, feet 30–40cm apart; squat in max external rotation (medial meniscus) or max internal rotation (lateral meniscus).", pos: "Joint-line pain/click, typically around 90° flexion.", sn: "64–67", sp: "81–90", tier: 2, pearl: "More specific than McMurray's for medial tears — but not everyone can weight-bear enough to perform it." },
  { id: "kn20", r: "kn", cat: "ACL", n: "Slocum's test", t: "Anterolateral / anteromedial rotary instability", p: "Supine, knee 90°, foot fixed; anterior drawer with the tibia internally rotated 30° (ALRI) or externally rotated 15° (AMRI).", pos: "Excess anterior translation with rotation vs the straight anterior drawer.", tier: 2, pearl: "A rotated variant of the anterior drawer — relaxes the hamstrings via the 90° knee flexion." },
  { id: "kn21", r: "kn", cat: "Meniscus", n: "Steinman test", t: "Meniscal tear (vs ligament/osteophyte)", p: "Sitting or supine, knee at 90°; rotate the tibia medially/laterally, then track joint-line tenderness through flexion/extension.", pos: "Pain with rotation reproducing the click; tenderness migrates posteriorly with flexion, anteriorly with extension.", sn: "≈96.5", sp: "≈87", tier: 2, pearl: "The tenderness-migration part (part 2) helps distinguish meniscal pain from a fixed ligament or osteophyte tender point." },
  { id: "kn22", r: "kn", cat: "Osteochondritis", n: "Wilson's test", t: "Osteochondritis dissecans (medial femoral condyle)", p: "Sitting, knee flexed 90° with the tibia internally rotated; slowly extend the leg.", pos: "Pain ~30° short of full extension that resolves with tibial external rotation.", tier: 3, pearl: "No validated sensitivity/specificity data — use as a low-cost screen, not a rule-out." },
  { id: "kn23", r: "kn", cat: "PCL", n: "Muller's test (Quadriceps Active)", t: "PCL integrity / posterior tibial sag", p: "Supine, hip 45°, knee 90° (posterior-drawer position); ask the patient to gently contract the quads.", pos: "A posteriorly sagged tibia visibly translates anterior as the quads fire.", tier: 2, pearl: "Useful when a torn PCL makes the posterior drawer's start point ambiguous — the active contraction re-references it." },
  { id: "kn24", r: "kn", cat: "Muscle length", n: "Passive Knee Extension Test", t: "Hamstring flexibility / tightness", p: "Supine, hip flexed 90°; passively extend the knee to the first firm hamstring stretch and measure with a goniometer.", pos: "Popliteal angle (180° − knee extension angle); normal mean ≈75°, more suggests tightness.", tier: 3, pearl: "Used as an ACL return-to-play milestone between rehab phases, not just a flexibility check." },
  { id: "kn25", r: "kn", cat: "Lateral / ITB", n: "Renne test", t: "ITB friction syndrome", p: "Standing, weight-bearing on the involved leg; palpate the ITB over the lateral epicondyle while single-leg squatting to 60–90°, then repeat with firm compression.", pos: "Crepitus/snapping/pain at the lateral epicondyle, most provocative ~20–30° flexion.", tier: 3, pearl: "Pairs with Noble's test for lateral knee pain in runners/cyclists — Renne adds the weight-bearing squat." },
  { id: "kn26", r: "kn", cat: "Patellofemoral", n: "Moving Patellar Apprehension Test", t: "Lateral patellar instability", p: "From full extension, apply a lateral force to the patella while cycling the knee to 90° flexion and back (then repeat medially directed, for symptom relief).", pos: "Apprehension with the lateral-force pass that resolves with the medial-force pass.", sn: "100", sp: "≈88", tier: 1, pearl: "More sensitive than the static patellar apprehension sign — the medial-force pass confirms it's instability, not just guarding." },

  /* ---- ANKLE ---- researched against Physiopedia's Ankle special-tests
   * category (physio-pedia.com/Category:Ankle_-_Special_Tests). ft1-ft9's
   * ids are kept as-is (they predate the Ankle/Foot split and are
   * referenced elsewhere) even though the region below is now "an", not
   * "ft" — only the region field changed for the ankle-side tests. */
  { id: "ft1", r: "an", cat: "Lateral ligament", n: "Anterior drawer (ankle)", t: "ATFL integrity", p: "Foot in slight plantarflexion; draw the calcaneus/talus forward on the fixed tibia.", pos: "Excess anterior translation ± an anterolateral 'suction' dimple.", sn: "74–96", sp: "≈84", tier: 2, pearl: "Most useful ~5 days post-injury once acute guarding settles." },
  { id: "ft2", r: "an", cat: "Lateral ligament", n: "Talar tilt (inversion)", t: "ATFL / CFL integrity", p: "Invert the calcaneus and talus as a unit.", pos: "Excess inversion / gapping vs the other side.", tier: 3 },
  { id: "ft3", r: "an", cat: "Syndesmosis", n: "Squeeze test", t: "High ankle sprain (syndesmosis)", p: "Compress the tibia and fibula together at mid-calf.", pos: "Pain referred distally to the syndesmosis.", sn: "26–30", sp: "88–93", tier: 2 },
  { id: "ft4", r: "an", cat: "Syndesmosis", n: "External rotation stress", t: "Syndesmosis injury", p: "Knee 90°, ankle neutral; externally rotate the foot.", pos: "Pain over the anterolateral syndesmosis.", sn: "≈20", sp: "≈85", tier: 2, pearl: "Also listed under Foot on Physiopedia — same test, same position; syndesmosis symptoms can present at either level." },
  { id: "ft5", r: "an", cat: "Fracture rule", n: "Ottawa ankle rules", t: "Need for ankle/foot radiograph", p: "Assess bony tenderness at the posterior edge/tip of either malleolus, navicular, and 5th MT base, plus ability to bear weight 4 steps.", pos: "Any positive criterion → image. Near 100% sensitive for excluding fracture.", sn: "≈99", sp: "≈40", tier: 1, pearl: "A validated clinical-decision rule — safely reduces unnecessary X-rays." },
  { id: "ft6", r: "an", cat: "Achilles", n: "Thompson (calf squeeze)", t: "Achilles tendon rupture", p: "Prone, foot over the table edge; squeeze the calf.", pos: "Absent plantarflexion indicates a complete rupture.", sn: "96–98", sp: "93–100", tier: 1 },
  { id: "ft9", r: "an", cat: "Midfoot", n: "Kleiger's test (ER) — deltoid bias", t: "Medial (deltoid) / syndesmosis injury", p: "Seated, knee flexed 90°; externally rotate and evert the foot.", pos: "Medial (deltoid) or anterolateral (syndesmosis) pain, or a sense of fibular displacement.", tier: 3 },
  { id: "an1", r: "an", cat: "Impingement", n: "Impingement sign (ankle)", t: "Anterior ankle (bony/soft-tissue) impingement", p: "Passively dorsiflex the ankle to end-range with overpressure, sometimes combined with a lunge for a weight-bearing variant.", pos: "Anterior joint-line pain reproduced at, or just before, end-range dorsiflexion.", tier: 3 },
  { id: "an2", r: "an", cat: "Peroneal", n: "Peroneus longus & brevis tests", t: "Peroneal tendon pathology / instability", p: "Resist active eversion (brevis-biased) and resisted plantarflexion + eversion (longus-biased) while palpating the tendons posterior to the lateral malleolus.", pos: "Pain, weakness, or a palpable/visible subluxation of the tendons over the malleolus.", tier: 3 },
  { id: "an3", r: "an", cat: "Lateral ligament", n: "Prone anterior drawer test", t: "ATFL integrity (prone variant)", p: "Prone, knee flexed ~90°; draw the calcaneus/talus forward on the fixed tibia.", pos: "Excess anterior translation vs the other side.", tier: 3, pearl: "Same structure as the supine anterior drawer — the prone/knee-flexed setup relaxes the gastrocnemius and can make excess translation easier to feel." },
  { id: "an4", r: "an", cat: "Achilles / gastroc-soleus", n: "Silfverskiöld test", t: "Isolated gastrocnemius contracture vs soleus/capsular equinus", p: "Measure passive ankle dorsiflexion with the knee extended, then repeat with the knee flexed 90°.", pos: "Dorsiflexion clearly greater with the knee flexed → isolated gastrocnemius tightness. Equally limited in both → soleus or a bony/capsular block.", tier: 2, pearl: "Differentiates WHICH structure to stretch/lengthen — a gastroc-specific contracture responds to gastroc-isolated stretching; a soleus/capsular limit won't." },
  { id: "an5", r: "an", cat: "Balance / functional", n: "Star Excursion Balance Test", t: "Dynamic postural control / chronic ankle instability screening", p: "Single-leg stance; reach the free foot as far as possible along 8 grid directions without losing balance, touching down lightly, or shifting the stance foot.", pos: "Reach-distance asymmetry vs the other side, or an inability to complete a direction, suggests a postural-control deficit.", tier: 2, pearl: "Multi-directional dynamic reach — not representable as a single static pose here; the reference info above still applies." },
  { id: "an6", r: "an", cat: "Measurement", n: "Figure-of-eight ankle swelling measurement", t: "Ankle joint effusion / oedema quantification", p: "Wrap a tape in a figure-8 around the ankle (over the tibialis anterior tendon, medial to the ankle, over the Achilles, then lateral to the ankle) and record the circumference.", pos: "Not a provocation test — larger figure-8 circumference vs the other side quantifies swelling, useful for tracking recovery.", tier: 2, pearl: "A measurement technique, not a provocative test — good for objective before/after comparison during rehab." },

  /* ---- FOOT ---- researched against Physiopedia's Foot special-tests
   * category (physio-pedia.com/Category:Foot_-_Special_Tests). */
  { id: "ft7", r: "ft", cat: "Plantar heel", n: "Windlass test", t: "Plantar fasciopathy", p: "Passively (or in standing) dorsiflex the great toe (MTP).", pos: "Reproduction of plantar heel pain.", sn: "32", sp: "≈100", tier: 2, pearl: "Specific but insensitive — a positive test rules IN, a negative doesn't rule out." },
  { id: "ft8", r: "ft", cat: "Nerve / neuroma", n: "Mulder click", t: "Morton neuroma", p: "Squeeze the metatarsal heads together mediolaterally while pressing the interspace.", pos: "A palpable/audible click with reproduction of forefoot pain.", tier: 3 },
  { id: "ft10", r: "ft", cat: "Hindfoot alignment", n: "Coleman block test", t: "Flexible vs fixed hindfoot varus (cavovarus foot)", p: "Stand with the heel and lateral foot on a block, letting the plantarflexed first ray hang off the medial edge unsupported.", pos: "Heel varus corrects to neutral → flexible (forefoot-driven) deformity. Heel varus persists → fixed (rearfoot) deformity.", tier: 3, pearl: "Guides surgical planning — flexible deformities are often correctable with a first-ray procedure alone; fixed ones usually need rearfoot correction too." },
  { id: "ft11", r: "ft", cat: "Arch / midfoot", n: "Feiss line test", t: "Medial longitudinal arch collapse / navicular drop", p: "Mark the medial malleolus and 1st MTP head, join them with an imaginary line, then observe the navicular tuberosity's position relative to it in relaxed standing.", pos: "Navicular drops noticeably below the line (roughly by thirds) → pes planus / arch collapse.", tier: 3 },
  { id: "ft12", r: "ft", cat: "Arch / midfoot", n: "Navicular drop test", t: "Dynamic midfoot pronation / arch collapse under load", p: "Mark the navicular tuberosity height in subtalar neutral sitting (non-weight-bearing), then again in relaxed double-leg standing; measure the vertical difference.", pos: "Drop > 10 mm suggests excessive midfoot pronation.", tier: 3, pearl: "A measurement technique comparing non-weight-bearing vs weight-bearing navicular height — not itself a provocative maneuver." },
  { id: "ft13", r: "ft", cat: "Forefoot / neuroma", n: "Toe spread test", t: "Lateral plantar plate / intrinsic weakness screening", p: "Ask the patient to actively spread (abduct) all toes against the examiner's resistance, or observe active toe splay.", pos: "Weak or absent active toe splay on the affected side suggests intrinsic foot muscle weakness or plantar plate/neurologic involvement.", tier: 3 },
];

/* ================= CLUSTERS ================= */
// Validated combinations — the thing most reference apps miss.
export const CLUSTERS: TestCluster[] = [
  { id: "cl_cx", r: "cx", name: "Wainner cervical radiculopathy cluster", when: "Suspected cervical radiculopathy",
    items: ["ULNT 1 (median) positive", "Ipsilateral cervical rotation < 60°", "Distraction test positive", "Spurling positive"],
    rule: "3 of 4 → +LR ≈ 6.1 (post-test probability ≈ 65%). All 4 → +LR ≈ 30.", tests: ["cx3", "cx1", "cx2"] },
  { id: "cl_myelo", r: "cx", name: "Cook cervical myelopathy cluster", when: "Screening for cervical myelopathy",
    items: ["Gait deviation", "Hoffmann positive", "Inverted supinator sign", "Babinski positive", "Age > 45"],
    rule: "3 of 5 present → +LR ≈ 30.9 for myelopathy. 1 of 5 is a useful screen (high sensitivity).", tests: ["cx9", "cx10"] },
  { id: "cl_si", r: "si", name: "Laslett SIJ provocation cluster", when: "Suspected SIJ pain (after excluding disc)",
    items: ["Distraction", "Thigh thrust", "Compression", "Sacral thrust", "Gaenslen (×2)"],
    rule: "3 of 6 positive (or 2 of the first 4) → strong support for a SIJ source (+LR ≈ 4). All negative → SIJ unlikely.", tests: ["si2", "si1", "si3", "si4", "si5"] },
  { id: "cl_sh_imp", r: "sh", name: "Park subacromial impingement cluster", when: "Suspected subacromial pain",
    items: ["Hawkins-Kennedy positive", "Painful arc", "Weak/painful resisted ER (infraspinatus)"],
    rule: "All 3 positive → +LR ≈ 10.6 for impingement / cuff involvement.", tests: ["sh2", "sh3", "sh6"] },
  { id: "cl_sh_full", r: "sh", name: "Full-thickness cuff tear cluster", when: "Suspected full-thickness cuff tear",
    items: ["Painful arc", "Drop-arm / weak abduction", "Weak/painful external rotation", "Age ≥ 60"],
    rule: "3 of 3 provocation tests positive markedly raises the probability of a full-thickness tear.", tests: ["sh3", "sh6", "sh7"] },
  { id: "cl_hip", r: "hip", name: "Hip OA (Sutlive) cluster", when: "Suspected hip osteoarthritis",
    items: ["Self-reported squatting aggravates", "Active hip flexion causes lateral pain", "Scour with adduction causes groin/lateral pain", "Active hip extension causes pain", "Passive IR ≤ 25°"],
    rule: "4–5 of 5 → +LR ≈ 24.3 for hip OA. Passive IR loss is the key single sign.", tests: ["hip3", "hip8"] },
  { id: "cl_knee_acl", r: "kn", name: "ACL rupture cluster", when: "Suspected ACL tear",
    items: ["Lachman positive", "Anterior drawer positive", "Pivot shift positive"],
    rule: "Lachman is the anchor (sensitive); pivot shift adds specificity. Composite exam accuracy rivals MRI in experienced hands.", tests: ["kn1", "kn2", "kn3"] },
  { id: "cl_ankle", r: "an", name: "Ottawa ankle & foot rules", when: "Acute ankle/foot trauma — do I need an X-ray?",
    items: ["Bony tenderness posterior edge/tip of lateral malleolus", "Bony tenderness posterior edge/tip of medial malleolus", "Tenderness at navicular", "Tenderness at 5th metatarsal base", "Unable to weight-bear 4 steps"],
    rule: "Any single criterion positive → radiograph. Sensitivity ≈ 99% for excluding fracture.", tests: ["ft5"] },
];

export const FAMILIES = ["Spine & Axial", "Upper Limb", "Lower Limb"];

export const TIER_META: Record<1 | 2 | 3, { label: string; dot: string }> = {
  1: { label: "Stronger evidence", dot: "#2E9E6B" },
  2: { label: "Moderate / variable", dot: "#C9922E" },
  3: { label: "Limited / historical", dot: "#B0641F" },
};

// Which existing 3D-model preset (see lib/presets.ts) best approximates each
// test's setup position. Curated conservatively — a test is only mapped when
// an existing preset's pose genuinely matches its clinical setup; many tests
// (isometric resistance, palpation, manual overpressure/translation, ligament
// stress at a fixed flexion angle the sim doesn't have a preset for, etc.)
// have no 3D equivalent yet and are intentionally left unmapped rather than
// forced onto a poorly-fitting pose. Expand this table as more presets are
// added.
export const TEST_POSE_MAP: Record<string, string> = {
  // Lumbar / SIJ — supine straight-leg raise family
  lx1: "slr_right", // Straight leg raise (Lasègue)
  lx2: "slr_right", // Crossed SLR — same pose, test the OTHER leg's symptoms
  lx10: "slr_right", // Bragard's sign — same SLR position, sensitised with ankle dorsiflexion
  si6: "slr_right", // Active SLR

  // Hip — see HIP_CUSTOM_POSES below for the position-built ones; these
  // three reuse an existing preset outright (no custom pose needed).
  hip5: "single_leg_right", // Resisted external derotation / single-leg stance (position-only)
  hip7: "single_leg_right", // Trendelenburg
  // hip8 (Thomas test) — see SPECIAL_TEST_CUSTOM_POSES below, NOT mapped to
  // the standalone "thomas_test_left" sidebar preset here: that preset has
  // no supine root transform (it was built before the recumbent presets'
  // table-lying convention existed), so using it left the model standing
  // upright instead of lying on the table. The custom pose below is built
  // on the proper "supine" base like every other hip test.
  hip14: "sitting", // Fulcrum test (seated, legs dangling — palpation test, sitting matches the setup)
  hip15: "supine", // Patellar-pubic percussion (supine, legs neutral — auscultation test, no extra angles needed)

  // Knee — supine/hook-lying at ~90° knee flexion
  kn2: "hooklying", // Anterior drawer
  kn5: "hooklying", // Posterior drawer
  kn6: "hooklying", // Posterior sag (Godfrey)
  kn9: "hooklying", // Joint-line tenderness (palpated at ~90° flexion)
  // Knee — remaining tests that reuse an existing preset outright
  // (position-only: extension/starting-point tests, or the sim has no DOF
  // for the distinguishing rotation/compression component)
  kn3: "supine", // Pivot shift (starting position — extension)
  kn4: "supine", // Lever sign (Lelli) — knee extended
  kn13: "supine", // Sweep / bulge test — knee extended
  kn14: "supine", // Patellar tap — knee extended
  kn16: "supine", // Patellar grind (Clarke) — knee extended
  kn19: "deep_squat", // Ege's test — weight-bearing squat (rotation not modeled)
  kn20: "hooklying", // Slocum's test — same base position as anterior drawer
  kn21: "sitting", // Steinman test — seated, knee hanging at 90°
  kn23: "hooklying", // Muller's (Quadriceps Active) — posterior-drawer position
  kn26: "supine", // Moving Patellar Apprehension — starting position, extension

  // Shoulder — position-only approximations (does not model IR/ER or resistance)
  sh1: "overhead_reach", // Neer impingement sign (full flexion)
  sh2: "shoulder_flexion", // Hawkins-Kennedy (90° flexion)
  sh3: "shoulder_abduction", // Painful arc (60-120° abduction band)
  sh11: "shoulder_abduction", // Apprehension test (90° abduction)
  // Shoulder — remaining tests that reuse an existing preset outright
  sh22: "standing", // Arm squeeze test — purely a palpation test, no set arm position
  sh23: "shoulder_abduction", // Drop arm test (Codman's) — starting abduction position
  sh24: "shoulder_flexion", // Crank test — sitting/standing, ~90° elevation
  sh25: "standing", // Hara test — an 11-item measurement battery, no single pose
  sh29: "shoulder_abduction", // Kim test — 90° abduction
  sh30: "sitting", // Load and shift — seated, arm relaxed, purely a manual glide test
  sh33: "sitting", // Paxinos test — seated, arm at side, purely a palpation/compression test
  sh34: "sitting", // Rent test — seated, arm relaxed, purely a palpation test
  sh36: "shoulder_flexion", // Serratus anterior strength (punch-out) — 90° forward flexion

  // Cervical — tests that reuse an existing preset outright (position-only:
  // manual traction/palpation/reflex tests with no dramatic pose of their own)
  cx2: "supine", // Cervical distraction test — supine, gentle axial traction
  cx6: "supine", // Craniocervical flexion test — supine, subtle head-nod (biofeedback-driven, not a big pose)
  cx9: "sitting", // Hoffmann sign — seated, hand relaxed, purely a reflex flick
  cx10: "sitting", // Inverted supinator sign — seated, purely a tendon-tap reflex
  cx15: "supine", // Transverse ligament stress test — supine, subtle manual anterior lift

  // Ankle / Achilles — see SPECIAL_TEST_CUSTOM_POSES below for the
  // position-built ones; these reuse an existing preset outright.
  ft3: "supine", // Squeeze test — supine, ankle neutral, purely a mid-calf compression test
  ft6: "prone", // Thompson test (prone, foot off table edge)
  ft5: "standing", // Ottawa ankle rules — weight-bear assessment, standing
  an5: "standing", // Star Excursion Balance Test — single-leg standing starting point (dynamic reach not modeled)
  an6: "standing", // Figure-of-eight swelling measurement — standing, purely a tape measurement

  // Foot — position-only reuses.
  ft11: "standing", // Feiss line test — relaxed weight-bearing observation, standing
  ft12: "sitting", // Navicular drop test — non-weight-bearing starting reference (sitting)

  // Wrist — see SPECIAL_TEST_CUSTOM_POSES below for the position-built
  // ones; these reuse an existing preset outright (position-only: palpation
  // tests with no distinctive wrist/forearm angle of their own).
  wr2: "sitting", // Tinel at the wrist — seated, wrist relaxed, purely a nerve tap
  wr3: "sitting", // Carpal compression (Durkan) — seated, wrist neutral, sustained thumb pressure
  wr8: "sitting", // Anatomical snuffbox tenderness — seated, purely a palpation test
  wr11: "sitting", // Allen test — seated, purely a vascular occlusion/release test

  // Hand — position-only reuses.
  hn1: "sitting", // CMC grind test — seated, purely an axial-load/rotation test at the thumb base
};

/**
 * Custom, purpose-built poses for special tests that don't match any
 * existing preset — built via buildAnglesFromCommands() (the same NL
 * command grammar the CommandBox UI accepts), layered on top of an existing
 * preset's ROOT TRANSFORM (rootPosition/rootRotation/furniture — body
 * orientation isn't something the command parser sets, only joint angles
 * are). Positions researched against Physiopedia's hip special-tests pages
 * (physio-pedia.com/Category:Hip_-_Special_Tests), not guessed from the
 * dataset's own one-line procedure text — cross-checked joint angles where
 * the source gave one (e.g. FADIR's 90° hip flexion, Ely's near-full ~140°
 * knee flexion "heel to buttock"); where a source only says "adduct"/
 * "internally rotate" without a number, used a clinically typical magnitude
 * (documented per-test below) rather than an arbitrary one.
 *
 * All tested on the RIGHT side, matching the existing hip-region presets'
 * convention (slr_right, single_leg_right).
 */
function fromBase(baseId: string, commands: string[]): PosePreset {
  const base = PRESETS.find((p) => p.id === baseId);
  if (!base) throw new Error(`buildHipPose: base preset "${baseId}" not found`);
  // Start from the base preset's own angles (e.g. "sitting"'s 90/90 hip+knee
  // flexion) so bases with non-empty defaults don't collapse back to neutral
  // — then let the parsed commands override just the DOFs they touch.
  const angles: Record<string, Record<string, number>> = {};
  for (const [joint, dofs] of Object.entries(base.angles)) {
    angles[joint] = { ...dofs };
  }
  for (const [joint, dofs] of Object.entries(buildAnglesFromCommands(commands))) {
    angles[joint] = { ...angles[joint], ...dofs };
  }
  return {
    id: `__custom_${baseId}_${commands.join("|")}`,
    label: base.label,
    group: base.group,
    description: base.description,
    rootPosition: base.rootPosition,
    rootRotation: base.rootRotation,
    furniture: base.furniture,
    furnitureRotation: base.furnitureRotation,
    stanceLeg: base.stanceLeg,
    baseId,
    angles,
  };
}

export const SPECIAL_TEST_CUSTOM_POSES: Record<string, PosePreset> = {
  // FADIR — supine, hip flexed 90°, then adducted + internally rotated.
  // Adduction/IR magnitude not numerically specified by the source; used
  // typical clinical exam values (~20°/~30°).
  hip1: fromBase("supine", ["flex the right hip 90", "adduct the right hip 20", "internally rotate the right hip 30"]),

  // FABER (Patrick) — classic "figure-4": hip flexed, abducted, and
  // externally rotated with the knee bent to 90° so the lateral ankle rests
  // on the opposite thigh just above the knee (the earlier version of this
  // pose left the knee straight, which can't actually form a figure-4 —
  // that was the visible bug). Held/setup values kept a few degrees under
  // this rig's declared hip abduction/ER ROM ceiling (45°/45°) so the Play
  // preview below has room to animate INTO that ceiling rather than being
  // clamped flat.
  //
  // dynamicEndAngles models the exam maneuver itself — the examiner
  // stabilizing the opposite ASIS and pressing the test knee toward the
  // table, which further abducts/externally rotates the hip (a genuinely
  // different action from "getting into the figure-4 setup," so Play
  // animates setup -> pressed, not neutral -> setup, unlike every other hip
  // test's preview).
  hip2: {
    ...fromBase("supine", [
      "flex the right hip 42",
      "abduct the right hip 40",
      "externally rotate the right hip 40",
      "flex the right knee 90",
    ]),
    dynamicEndAngles: { hip_right: { abdAdd: 45, rotation: 45 } },
  },

  // Hip Quadrant / Scour — source gives a 70–140° flexion arc "scoured"
  // through adduction then abduction; snapshotting the flexion+adduction
  // phase at the arc's midpoint (110°) as the representative static pose.
  hip3: fromBase("supine", ["flex the right hip 110", "adduct the right hip 15"]),

  // McCarthy — dynamic (flex to end-range, then extend while rotating);
  // snapshotting the flexed+externally-rotated starting position (the ER
  // variant; the source also describes an IR variant from the same start).
  hip4: fromBase("supine", ["flex the right hip 100", "externally rotate the right hip 20"]),

  // Ober test — side-lying on the OPPOSITE side (so the tested right hip is
  // the top leg), abducted and slightly extended, then normally let drop
  // into adduction (that release isn't representable as a static pose —
  // this shows the held starting position).
  hip6: fromBase("sidelying_left", ["abduct the right hip 20", "extend the right hip 10"]),

  // Thomas test — supine at the table edge; the LEFT hip/knee are flexed
  // (hugged to the chest) while the RIGHT hip is the one being observed,
  // extended flat on the table — matching every other hip test's "tested
  // side is the right hip" convention. Source doesn't give a hugged-knee
  // angle; 120°/130° are typical near-end-range exam values (matches the
  // magnitude the old standalone "thomas_test_left" preset already used).
  hip8: fromBase("supine", ["flex the left hip 120", "flex the left knee 130"]),

  // Ely's test — prone, knee passively flexed until the heel nears the
  // buttock (source: "heel should touch the buttocks") — near the joint's
  // full 140° flexion ROM.
  hip9: fromBase("prone", ["flex the right knee 140"]),

  // FAIR test — side-lying on the OPPOSITE side (tested right hip on top),
  // flexed 90°, adducted, and internally rotated (source gives 90° flexion
  // explicitly; adduction/IR magnitude not numerically specified, used
  // typical exam values).
  hip10: fromBase("sidelying_left", ["flex the right hip 90", "adduct the right hip 20", "internally rotate the right hip 20"]),

  // Stinchfield — resisted SLR held at ~30° hip flexion (source gives the
  // angle explicitly) — more accurate than reusing the full slr_right
  // preset (which poses ~70° flexion, appropriate for the Lasègue SLR but
  // not this test's much lower held angle).
  hip12: fromBase("supine", ["flex the right hip 30"]),

  // Log roll — supine, leg extended, passively rolled through IR/ER;
  // snapshotting one direction (external rotation) of the roll.
  hip13: fromBase("supine", ["externally rotate the right hip 20"]),

  // ---- KNEE ---- researched against Physiopedia's knee special-tests
  // pages (physio-pedia.com/Category:Knee_-_Special_Tests). Where a source
  // gives a working angle (Lachman's 20–30°, Steinman/Wilson's 90°/30°,
  // PKET's ~75° popliteal-angle norm) that's used directly; where it only
  // says "slight flexion" (valgus/varus stress, patellar apprehension,
  // Noble's), a typical clinical ~30° is used.

  // Lachman test — supine, knee flexed to the low end of the 20–30° window.
  kn1: fromBase("supine", ["flex the right knee 25"]),

  // Valgus stress at 30° — source gives the angle explicitly.
  kn7: fromBase("supine", ["flex the right knee 30"]),

  // Varus stress at 30° — same setup as valgus stress, opposite force
  // direction (not representable — this shows the shared knee position).
  kn8: fromBase("supine", ["flex the right knee 30"]),

  // McMurray test — snapshotting the test's full-flexion starting point
  // (rotation-while-extending isn't representable as a static pose).
  kn10: fromBase("supine", ["flex the right knee 130"]),

  // Thessaly test — single-leg stance at 20° flexion (source gives the
  // angle explicitly); built on "standing" since the sim's single-leg-stance
  // preset doesn't expose a custom knee-flexion angle for the stance leg —
  // position-only, doesn't model the unweighted/rotating contralateral leg.
  kn11: fromBase("standing", ["flex the right hip 15", "flex the right knee 20"]),

  // Apley grind — prone, knee at 90° (source gives the angle explicitly).
  kn12: fromBase("prone", ["flex the right knee 90"]),

  // Patellar apprehension — knee "slightly flexed"; ~30° is the typical
  // clinical value (matches the companion Patellar Apprehension Sign page).
  kn15: fromBase("supine", ["flex the right knee 30"]),

  // Noble compression — most provocative near 30° flexion (source gives
  // the angle explicitly); shown supine with the knee at that angle.
  kn17: fromBase("supine", ["flex the right knee 30"]),

  // Dial test — prone, comparing ER at 30° vs 90°; snapshotting the 30°
  // position (axial tibial rotation itself isn't a modeled DOF).
  kn18: fromBase("prone", ["flex the right knee 30"]),

  // Wilson's test — sitting (hip+knee 90° from the base preset), extending
  // the knee to the diagnostic ~30°-from-full-extension pain point (source
  // gives the angle explicitly).
  kn22: fromBase("sitting", ["flex the right knee 30"]),

  // Passive Knee Extension Test — supine, hip flexed 90°, knee extended to
  // the normative mean popliteal angle (~75°, i.e. 180° − 74.6° per Davis
  // et al., the value cited on the source page).
  kn24: fromBase("supine", ["flex the right hip 90", "flex the right knee 75"]),

  // Renne test — single-leg squat to 60–90° (source range); built on
  // "standing" for the same reason as Thessaly above — position-only,
  // doesn't model true single-leg weight-bearing/unweighting.
  kn25: fromBase("standing", ["flex the right hip 70", "flex the right knee 70"]),

  // ---- SHOULDER ---- researched against Physiopedia's shoulder
  // special-tests pages (physio-pedia.com/Category:Shoulder_-_Special_Tests).
  // Uses the sim's "sagittalFlexExt" convention for true sagittal-plane
  // flexion/extension (see commandParser.ts's shoulder note) — plain
  // "flex"/"extend" on a shoulder joint already resolves to that DOF.

  // Anterior drawer test — supine, mid-range abduction/flexion/ER (source
  // gives ranges; used the midpoint of each: 100°/10°/15°).
  sh21: fromBase("supine", ["abduct the right shoulder 100", "flex the right shoulder 10", "externally rotate the right shoulder 15"]),

  // Hornblower's sign (Patte's test) — standing, 90° abduction in the
  // scapular plane, elbow flexed 90° (source gives both angles explicitly).
  sh26: fromBase("standing", ["abduct the right shoulder 90", "flex the right elbow 90"]),

  // Jerk test — 90° abduction + internal rotation (source gives both
  // explicitly); magnitude of IR not specified, used a typical ~30°.
  sh28: fromBase("standing", ["abduct the right shoulder 90", "internally rotate the right shoulder 30"]),

  // Norwood stress test — supine, 90° abduction with external rotation
  // (forearm vertical), elbow 90° (source gives all three explicitly; ER
  // magnitude itself not numbered, used a typical ~30°).
  sh31: fromBase("supine", ["abduct the right shoulder 90", "externally rotate the right shoulder 30", "flex the right elbow 90"]),

  // Passive compression test — side-lying on the OPPOSITE side (tested
  // right shoulder on top), 30° abduction with external rotation + slight
  // extension (source gives the abduction angle explicitly; ER/extension
  // magnitude not numbered, used typical exam values).
  sh32: fromBase("sidelying_left", ["abduct the right shoulder 30", "externally rotate the right shoulder 30", "extend the right shoulder 15"]),

  // Resisted AC joint extension test — sitting, shoulder + elbow flexed
  // 90° with the shoulder internally rotated (source gives all explicitly).
  sh35: fromBase("sitting", ["flex the right shoulder 90", "internally rotate the right shoulder 30", "flex the right elbow 90"]),

  // Whipple test — arm flexed 90° and adducted across the body toward the
  // opposite shoulder (source gives the flexion angle explicitly; adduction
  // magnitude not numbered, used a typical cross-body value).
  sh37: fromBase("standing", ["flex the right shoulder 90", "adduct the right shoulder 45"]),

  // Yergason's test — elbow flexed 90°, forearm pronated (source gives the
  // elbow angle explicitly; near-full pronation for the starting position).
  sh38: fromBase("standing", ["flex the right elbow 90", "pronate the right forearm 80"]),

  // Yocum's test — hand on the opposite shoulder: heavy cross-body
  // adduction with the elbow substantially flexed (source describes the
  // position qualitatively, not numerically — approximated to bring the
  // hand near the opposite shoulder).
  sh39: fromBase("standing", ["adduct the right shoulder 90", "flex the right elbow 130"]),

  // ---- LUMBAR SPINE ---- researched against Physiopedia's lumbar
  // special-tests pages (physio-pedia.com/Category:Lumbar_Spine_-_Special_Tests).

  // Double leg lowering test — supine, both hips flexed 90° (source gives
  // the angle explicitly), knees extended, the vertical-legs starting/test
  // position (the diagnostic angle itself is patient-specific, found as the
  // legs lower — not a fixed pose to snapshot).
  lx11: fromBase("supine", ["flex the left hip 90", "flex the right hip 90"]),

  // McKenzie side glide test — standing; the sim has no lateral-translation
  // DOF for a pure hip shift, so this is approximated with lumbar lateral
  // flexion (side bend) toward one side (magnitude not numerically
  // specified by the source — used a typical exam value).
  lx12: fromBase("standing", ["side bend the lumbar spine right 20"]),

  // ---- CERVICAL SPINE ---- researched against Physiopedia's cervical
  // special-tests pages (physio-pedia.com/Category:Cervical_Spine_-_Special_Tests).

  // Spurling test — sitting; extend, side-bend, and rotate toward the
  // symptomatic side (source describes the combined motion; magnitudes not
  // numerically specified, used typical exam values within the joint's ROM).
  cx1: fromBase("sitting", ["extend the cervical spine 20", "side bend the cervical spine right 20", "rotate the cervical spine right 30"]),

  // ULNT1 (median nerve bias) — supine; shoulder depression/abduction,
  // forearm supination, wrist/finger extension, external rotation (source
  // gives ~110° abduction explicitly, rest are typical exam positions),
  // plus contralateral cervical side-bend for structural differentiation.
  cx3: fromBase("supine", [
    "abduct the right shoulder 100",
    "externally rotate the right shoulder 60",
    "supinate the right forearm 45",
    "extend the right wrist 45",
    "side bend the cervical spine left 20",
  ]),

  // Shoulder abduction relief (Bakody) — sitting, symptomatic hand resting
  // on top of the head (source describes the position qualitatively —
  // approximated with abduction + substantial elbow flexion).
  cx4: fromBase("sitting", ["abduct the right shoulder 100", "flex the right elbow 140"]),

  // Cervical flexion-rotation test — supine, full cervical flexion then
  // rotate (source gives the flexion end-range and normal ~44° rotation;
  // snapshotting one rotated direction).
  cx5: fromBase("supine", ["flex the cervical spine 40", "rotate the cervical spine right 30"]),

  // Sharp-Purser test — sitting, SLIGHT cervical flexion (source specifies
  // "slightly flexes" — a small angle, well short of end-range).
  cx7: fromBase("sitting", ["flex the cervical spine 15"]),

  // Alar ligament stress test — sitting; passive side-bend (the source also
  // offers a rotation variant) while C2 is palpated/stabilised — magnitude
  // not numerically specified, used a typical exam value.
  cx8: fromBase("sitting", ["side bend the cervical spine right 15"]),

  // Lhermitte sign — sitting, cervical flexion (source: "passive or active
  // cervical flexion, often in sitting"; magnitude not specified, used a
  // substantial flexion value since symptoms are typically end-range).
  cx11: fromBase("sitting", ["flex the cervical spine 40"]),

  // Cervical rotation lateral flexion (CRLF) — sitting; rotate away from
  // the tested side, then attempt lateral flexion toward the chest (source
  // describes the sequence; magnitudes not specified, used typical values).
  cx12: fromBase("sitting", ["rotate the cervical spine right 60", "side bend the cervical spine right 15"]),

  // Vascular screening hold — sitting; sustained end-range rotation with
  // optional extension (source describes the position, not exact angles —
  // used typical end-range values for a ~10s sustained hold).
  cx13: fromBase("sitting", ["rotate the cervical spine right 60", "extend the cervical spine 20"]),

  // ---- ANKLE ---- researched against Physiopedia's Ankle special-tests
  // category (physio-pedia.com/Category:Ankle_-_Special_Tests).

  // Anterior drawer (ankle) — supine, ankle relaxed into slight
  // plantarflexion (source: "foot in slight plantarflexion") before the
  // calcaneus/talus are drawn forward.
  ft1: fromBase("supine", ["plantarflex the right ankle 15"]),

  // Talar tilt — supine, ankle inverted as a unit (source doesn't give a
  // number; used a typical near-end-range exam value, short of this rig's
  // 35° inversion ROM ceiling).
  ft2: fromBase("supine", ["invert the right ankle 25"]),

  // External rotation stress — source: "knee 90°, ankle neutral; externally
  // rotate the foot." This rig has no separate foot-rotation-under-fixed-
  // tibia DOF, so ankle eversion (turning the sole outward) is used as the
  // closest visual proxy for the foot externally rotating under load.
  ft4: fromBase("sitting", ["evert the right ankle 15"]),

  // Kleiger's test — seated, knee flexed 90° (source), foot externally
  // rotated/everted with a touch of dorsiflexion (magnitude not specified,
  // typical exam values used).
  ft9: fromBase("sitting", ["evert the right ankle 15", "dorsiflex the right ankle 10"]),

  // Impingement sign (ankle) — supine, passive dorsiflexion to end-range
  // (magnitude not numerically specified by the source; used a typical
  // near-end-range value within this rig's 20° dorsiflexion ceiling).
  an1: fromBase("supine", ["dorsiflex the right ankle 15"]),

  // Peroneus longus & brevis tests — supine, the resisted-eversion hold
  // position (magnitude not specified; used a typical exam value).
  an2: fromBase("supine", ["evert the right ankle 10"]),

  // Prone anterior drawer test — prone, knee flexed ~90° (source), ankle in
  // slight plantarflexion before the forward-draw.
  an3: fromBase("prone", ["flex the right knee 90", "plantarflex the right ankle 10"]),

  // Silfverskiöld test — dynamic maneuver, not a "get into position" pose:
  // setup = supine, knee EXTENDED, ankle passively dorsiflexed to its
  // gastroc-limited end-range (~5°); the exam action then flexes the knee
  // to 90° (source), which — if the limiter was gastrocnemius, not soleus —
  // lets dorsiflexion increase further (~15°). Play demonstrates exactly
  // that comparison (setup -> knee-flexed), same dynamicEndAngles pattern
  // as FABER's exam-pressure maneuver.
  an4: {
    ...fromBase("supine", ["dorsiflex the right ankle 5"]),
    dynamicEndAngles: { knee_right: { flexExt: 90 }, ankle_right: { dorsiPlantar: 15 } },
  },

  // ---- FOOT ---- researched against Physiopedia's Foot special-tests
  // category (physio-pedia.com/Category:Foot_-_Special_Tests). Windlass,
  // Navicular Drop, and Toe Spread aren't given custom poses — this rig has
  // no great-toe/MTP or navicular-arch DOF to represent them with; the
  // reference info in their entries above is still accurate.

  // Coleman block test — standing, hindfoot inverted into varus (the block
  // itself isn't modeled — this approximates the varus alignment the block
  // maneuver is checking, not the block setup itself).
  ft10: fromBase("standing", ["invert the right ankle 15"]),

  // ---- WRIST ---- researched against Physiopedia's Wrist special-tests
  // category (physio-pedia.com/Category:Wrist_-_Special_Tests). This rig
  // has wrist flexExt/radUlnar and forearm pronSup, but no thumb DOF — the
  // thumb-in-fist / thumb-abduction components several of these tests
  // describe aren't represented, only the wrist/forearm angle is.

  // Phalen test — seated, maximal wrist flexion (source: held up to 60s).
  wr1: fromBase("sitting", ["flex the right wrist 70"]),

  // Finkelstein / Eichhoff — seated, wrist ulnar-deviated (thumb-in-fist
  // not modeled — the ulnar deviation is the DOF this rig can show).
  wr4: fromBase("sitting", ["ulnar deviate the right wrist 20"]),

  // TFCC load (ulnar grind) — seated, ulnar deviation with forearm rotation
  // (source: "with rotation") — distinguished from Finkelstein's pose by
  // adding pronation, matching the "axial load + rotation" description.
  wr5: fromBase("sitting", ["ulnar deviate the right wrist 20", "pronate the right forearm 30"]),

  // Piano-key / DRUJ ballottement — seated, forearm pronated (source:
  // stabilise the radius, translate the ulnar head — pronation is the
  // setup position that best exposes the ulnar head dorsally).
  wr6: fromBase("sitting", ["pronate the right forearm 60"]),

  // Watson scaphoid shift — a genuine dynamic maneuver, not a "get into
  // position" pose: the examiner presses the scaphoid tubercle WHILE moving
  // the wrist from ulnar to radial deviation (source), so Play animates
  // that shift directly (same dynamicEndAngles pattern as FABER/
  // Silfverskiöld) rather than neutral -> a single static pose.
  wr7: {
    ...fromBase("sitting", ["ulnar deviate the right wrist 15"]),
    dynamicEndAngles: { wrist_right: { radUlnar: -15 } },
  },

  // Supination lift test — seated, forearm fully supinated (source: "palm
  // up") before lifting/pushing up against resistance.
  wr10: fromBase("sitting", ["supinate the right forearm 80"]),

  // Wringing test — the maneuver itself IS alternating pronation/supination
  // (source: "wring a towel"), so this is another dynamicEndAngles case:
  // setup = pronated, dynamic end = supinated, demonstrating one wring
  // cycle rather than a single static grip position.
  wr12: {
    ...fromBase("sitting", ["pronate the right forearm 40"]),
    dynamicEndAngles: { forearm_right: { pronSup: -40 } },
  },

  // WHAT test (Wrist Hyperflexion and Abduction of the Thumb) — same wrist
  // flexion as Phalen (source gives no separate angle); the thumb-abduction
  // component isn't modeled (no thumb DOF).
  wr13: fromBase("sitting", ["flex the right wrist 70"]),

  // ---- HAND ---- researched against Physiopedia's Hand special-tests
  // category (physio-pedia.com/Category:Hand_-_Special_Tests). This rig has
  // no finger/thumb DOFs at all, so none of the finger-level tests here
  // (Beighton, Bunnell-Littler, Elson, figure-8 hand measurement, Flick
  // sign, Sollerman, two-point discrimination, Trousseau's, Wrinkling) get
  // a custom pose — a wrist-only approximation of a finger/thumb-driven
  // sign (e.g. Trousseau's carpal spasm) would be more misleading than
  // showing none at all. The reference info in their entries above is
  // still accurate. hn1 (CMC grind) reuses "sitting" outright via
  // TEST_POSE_MAP — no distinctive pose beyond that.
};

// si7 (FABER, SIJ lens) is the exact same figure-4 maneuver as hip2 — same
// physical position and action, just interpreted for SIJ vs hip pathology
// by where the pain shows up — so it reuses hip2's pose/preview outright
// rather than duplicating it.
SPECIAL_TEST_CUSTOM_POSES.si7 = SPECIAL_TEST_CUSTOM_POSES.hip2;
