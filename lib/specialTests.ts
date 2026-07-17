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
  { id: "si", name: "SI Joint & Pelvis", family: "Spine & Axial", color: "#7A74E0", blurb: "SIJ provocation cluster, pelvic girdle pain, motion palpation" },
  { id: "sh", name: "Shoulder", family: "Upper Limb", color: "#0D7377", blurb: "Cuff, impingement, instability, labrum, AC, scapula" },
  { id: "el", name: "Elbow", family: "Upper Limb", color: "#0F8A80", blurb: "Epicondylalgia, UCL (ulnar collateral ligament), PLRI (posterolateral rotatory instability), cubital tunnel" },
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
  { id: "tmj1", r: "tmj", cat: "Screening", n: "Mandibular range of motion & opening path", t: "Temporomandibular joint (TMJ) dysfunction, disc displacement", p: "Patient sitting upright, head in neutral. Ask the patient to open the mouth as wide as comfortable. Measure the maximal opening with a ruler between the upper and lower front-tooth (incisor) edges — normal is about 35–50 mm. Watch the path the chin traces as it opens and closes.", pos: "Opening < 35 mm; a C-shaped deviation that returns to midline suggests disc displacement with reduction; a deflection that stays to one side suggests displacement without reduction or capsular restriction.", tier: 2 },
  { id: "tmj2", r: "tmj", cat: "Screening", n: "Joint sounds — palpation / auscultation", t: "Disc displacement, degenerative joint disease", p: "Patient sitting upright. Place your fingertips (or a stethoscope) over both temporomandibular joints, just in front of the ear canals. Ask the patient to slowly open and close the mouth several times while you feel and listen for joint noise.", pos: "A reciprocal click (one on opening and one on closing) suggests disc displacement with reduction; crepitus (grating) suggests degenerative change.", tier: 2 },
  { id: "tmj3", r: "tmj", cat: "Differentiation", n: "Dynamic loading / bite test", t: "Intra-articular vs muscular pain", p: "Patient sitting upright. Place a tongue depressor or cotton roll between the back teeth on one side, then ask the patient to bite down firmly on it.", pos: "Biting on the same side unloads that joint — decreased pain on the biting side (or increased pain on the opposite side) points to an intra-articular source.", tier: 3 },
  { id: "tmj4", r: "tmj", cat: "Differentiation", n: "Resisted opening / closing isometrics", t: "Masticatory muscle involvement", p: "Patient sitting upright with the jaw in a mid-open resting position. Apply graded manual resistance against the chin as the patient tries in turn to open, to close, and to move the jaw side to side.", pos: "Pain with the resisted muscle contraction, but not with direct joint loading, favours masticatory muscle pain (myalgia).", tier: 3 },

  /* ---- CERVICAL ---- */
  { id: "cx1", r: "cx", cat: "Radiculopathy", n: "Spurling test", t: "Cervical radiculopathy (nerve-root compression at the foramen)", p: "Patient sitting. Ask the patient to extend the neck, then side-bend and rotate the head toward the painful side. Place both hands on top of the head and apply a careful, gentle downward (axial) compression.", pos: "Reproduction of the familiar radiating arm pain (neck pain alone is not a positive test).", sn: "38–50", sp: "86–93", tier: 1, pearl: "Specific, not sensitive — good for ruling IN. Part of the Wainner cervical radiculopathy cluster." },
  { id: "cx2", r: "cx", cat: "Radiculopathy", n: "Cervical distraction test", t: "Cervical radiculopathy", p: "Patient supine, relaxed. Cup one hand under the back of the head (occiput) and the other under the chin, then apply a gentle upward pull (axial traction) of roughly 10–15 kg.", pos: "Reduction or abolition of the radiating arm symptoms.", sn: "40–44", sp: "90–97", tier: 1 },
  { id: "cx3", r: "cx", cat: "Radiculopathy", n: "Upper Limb Neurodynamic Test 1 (ULNT 1, median nerve bias)", t: "Neural mechanosensitivity, radiculopathy", p: "Patient supine and relaxed. Build the position step by step: (1) depress (push down) the shoulder girdle, (2) abduct the shoulder to about 110°, (3) supinate the forearm and extend the wrist and fingers, (4) externally rotate the shoulder, (5) slowly extend the elbow. To confirm a neural source, add a neck side-bend away from the tested arm and note whether symptoms change.", pos: "Reproduction of symptoms, more than 10° side-to-side difference in elbow extension, and a change in symptoms with the neck movement.", sn: "72–97", sp: "11–33", tier: 2, pearl: "Very sensitive — a clearly negative test helps rule OUT radiculopathy." },
  { id: "cx4", r: "cx", cat: "Radiculopathy", n: "Shoulder abduction relief (Bakody)", t: "Cervical radiculopathy (often C4–C6)", p: "Patient sitting or supine. Ask the patient to rest the palm of the symptomatic hand flat on top of the head.", pos: "Reduction of the radiating symptoms; an increase instead suggests an interscalene (thoracic outlet) or shoulder source.", sn: "17–78", sp: "75–92", tier: 2 },
  { id: "cx5", r: "cx", cat: "Headache", n: "Cervical flexion-rotation test (CFRT)", t: "Cervicogenic headache (C1–C2 dysfunction)", p: "Patient supine. Fully flex the cervical spine (chin toward chest) and hold it there — this locks the lower cervical segments so most remaining rotation comes from C1–C2. Then passively rotate the head fully to each side and compare the range.", pos: "Rotation less than about 32–34° toward the painful side, or a 10° or greater deficit versus the other side (normal ≈ 44°).", sn: "≈90", sp: "≈88", tier: 1 },
  { id: "cx6", r: "cx", cat: "Motor control", n: "Craniocervical flexion test (CCFT)", t: "Deep neck-flexor activation & endurance", p: "Patient supine with knees bent. Place an inflated pressure-biofeedback cuff behind the neck at a baseline of 20 mmHg. Ask the patient to perform a slow, gentle head-nod (as if nodding 'yes'), progressively targeting 22, 24, 26, 28, then 30 mmHg, holding each level about 10 seconds.", pos: "Inability to reach or hold the target pressure, or substitution by the superficial neck flexors (sternocleidomastoid, SCM) — a visible/palpable neck-tensing instead of a smooth nod.", tier: 2, pearl: "A performance measure rather than a diagnostic test — also doubles as the starting exercise." },
  { id: "cx7", r: "cx", cat: "Stability & red flags", n: "Sharp-Purser test", t: "Atlantoaxial instability (rheumatoid arthritis, Down syndrome)", p: "Patient sitting with the neck slightly flexed. Pinch and stabilise the C2 spinous process (back of the neck) with one hand, place the palm of the other hand on the forehead, and gently press the forehead backward (posteriorly).", pos: "Reduction of symptoms, or a palpable clunk as C1 slides back into place on C2.", sn: "≈69", sp: "≈96", tier: 2, pearl: "Perform BEFORE any provocative upper cervical testing in at-risk patients." },
  { id: "cx8", r: "cx", cat: "Stability & red flags", n: "Alar ligament stress test", t: "Upper cervical ligament integrity", p: "Patient supine or sitting. Firmly stabilise the C2 spinous process between finger and thumb, then passively side-bend (or rotate) the head to one side. C2 should be felt to move almost immediately in the same direction.", pos: "Absent or delayed C2 movement and/or excessive laxity.", tier: 3, pearl: "Limited diagnostic accuracy — interpret only within a full craniocervical screen." },
  { id: "cx9", r: "cx", cat: "Myelopathy (upper motor neuron)", n: "Hoffmann sign", t: "Cervical myelopathy", p: "Patient sitting, hand relaxed. Hold the patient's middle finger and quickly flick the fingertip (distal phalanx) downward into flexion, then let it spring back.", pos: "A reflex flexion-and-drawing-in (adduction) of the thumb and/or index finger.", sn: "44–58", sp: "74–78", tier: 2, pearl: "Most useful inside the Cook cervical myelopathy cluster (see Clusters)." },
  { id: "cx10", r: "cx", cat: "Myelopathy (upper motor neuron)", n: "Inverted supinator sign", t: "Cervical myelopathy (around the C5–C6 level)", p: "Patient sitting, forearm relaxed and slightly pronated. Tap the brachioradialis tendon just above the wrist (near the lower end of the radius) with a reflex hammer.", pos: "Finger flexion or elbow extension appears instead of the normal elbow-flexion response.", tier: 2 },
  { id: "cx11", r: "cx", cat: "Myelopathy (upper motor neuron)", n: "Lhermitte sign", t: "Spinal cord / dorsal column irritation", p: "Patient sitting. Ask the patient to flex the neck, bringing the chin toward the chest (you can guide it passively).", pos: "An electric-shock sensation running down the spine and/or into the limbs.", tier: 3, pearl: "Low sensitivity but concerning when present — consider imaging referral." },
  { id: "cx12", r: "cx", cat: "First rib & thoracic", n: "Cervical rotation lateral flexion (CRLF)", t: "Elevated / hypomobile first rib", p: "Patient sitting or supine. Passively rotate the head fully away from the side being tested, then try to side-bend (laterally flex) the neck forward toward the chest.", pos: "A firm block to the side-bend compared with the other side.", tier: 3 },
  { id: "cx13", r: "cx", cat: "Stability & red flags", n: "Vascular screening hold (pre-manipulative)", t: "Symptoms of vertebrobasilar / cervical arterial dysfunction", p: "Patient sitting or supine. Hold the head at end-range rotation (with or without added extension) for about 10 seconds on each side, watching the eyes and asking about symptoms throughout.", pos: "Dizziness, double vision (diplopia), slurred speech (dysarthria), difficulty swallowing (dysphagia), drop attacks, or eye-flicker (nystagmus) — the '5 Ds and N'.", tier: 3, pearl: "Poor validity for detecting arterial compromise — treat as symptom screening plus history (blood pressure, smoking, trauma), never as clearance to manipulate." },
  { id: "cx14", r: "cx", cat: "Screening / clinical decision rule", n: "Canadian C-Spine Rule", t: "Need for cervical spine imaging after trauma", p: "This is a decision algorithm, not a hands-on maneuver. Step through it: any high-risk factor (age 65 or older, dangerous mechanism, or pins-and-needles in the limbs) → image. Otherwise, if a low-risk factor allows safe assessment → ask for active rotation 45° each way; if the patient cannot rotate fully → image.", pos: "Any high-risk factor present, no low-risk factor allowing safe assessment, or less than 45° active rotation to either side.", sn: "99–100", sp: "≈43", tier: 1, pearl: "A clinical decision rule, not a positional maneuver — outperforms the NEXUS criteria for sensitivity in alert, stable trauma patients." },
  { id: "cx15", r: "cx", cat: "Stability & red flags", n: "Transverse ligament stress test", t: "Atlantoaxial (C1–C2) hypermobility", p: "Patient supine. Cup the back of the head (occiput) in your palms and rest both index fingers over the C1 neural arch. Lift the head and C1 straight upward and forward (anteriorly) — with no flexion or extension — and hold for 10–20 seconds.", pos: "A soft end-feel, or reproduction of eye-flicker (nystagmus), dizziness, nausea, tingling around the lips, or a lump-in-the-throat sensation.", sn: "≈65", sp: "≈99", tier: 1, pearl: "Very specific — sufficient to rule IN upper cervical instability, but a negative test doesn't rule it out (low sensitivity)." },

  /* ---- THORACIC & OUTLET ---- */
  { id: "tx1", r: "tx", cat: "Thoracic outlet", n: "Adson test", t: "Scalene-triangle (interscalene) compression", p: "Patient sitting, the tested arm slightly abducted and extended. Feel the radial pulse at the wrist. Ask the patient to extend and rotate the head toward the tested side and take a deep breath in and hold it, while you monitor the pulse and any symptoms.", pos: "Reproduction of the patient's arm symptoms — a fading pulse on its own is common in healthy people and is not enough.", sn: "≈79", sp: "74–100", tier: 3, pearl: "High false-positive rate; only meaningful with symptom reproduction and as part of a thoracic outlet syndrome (TOS) test battery." },
  { id: "tx2", r: "tx", cat: "Thoracic outlet", n: "Roos test / elevated arm stress test (EAST)", t: "Thoracic outlet syndrome (all sites)", p: "Patient sitting. Position both arms in 90° of shoulder abduction with 90° of elbow flexion (the 'surrender' or 'stick-em-up' position). Ask the patient to slowly open and close the fists repeatedly for up to 3 minutes.", pos: "Reproduction of familiar symptoms, arm heaviness, or an inability to complete the 3 minutes (mild fatigue alone is normal).", sn: "≈84", sp: "30–100", tier: 2 },
  { id: "tx3", r: "tx", cat: "Thoracic outlet", n: "Wright hyperabduction test", t: "Compression in the pectoralis-minor space", p: "Patient sitting. Feel the radial pulse, then passively raise the arm overhead (hyperabduct) and externally rotate it, progressing in stages while monitoring the pulse and symptoms.", pos: "Reproduction of symptoms (with or without a pulse change) in the overhead position.", tier: 3 },
  { id: "tx4", r: "tx", cat: "Thoracic outlet", n: "Costoclavicular (military brace) test", t: "Compression in the costoclavicular space", p: "Patient sitting. Ask the patient to pull the shoulders back and down into an exaggerated 'attention' posture (shoulder girdle retracted and depressed) and hold it for about 1 minute while you monitor the radial pulse.", pos: "Reproduction of symptoms, with or without a radial-pulse change.", tier: 3 },
  { id: "tx5", r: "tx", cat: "Thoracic outlet", n: "Cyriax release test", t: "Thoracic outlet syndrome — release phenomenon", p: "Patient sitting. Stand behind the patient, support the forearms, and passively lift the whole shoulder girdle upward, holding it there for up to 3 minutes to unload the compressed structures.", pos: "Pins-and-needles or a change in symptoms as the previously compressed structures are released.", tier: 3 },
  { id: "tx6", r: "tx", cat: "Rib & segment", n: "Rib spring / posteroanterior (PA) provocation", t: "Rib or thoracic segmental dysfunction", p: "Patient prone. Using the heel of your hand or thumbs, apply graded springing pressure from back to front (posteroanterior) over individual ribs and thoracic vertebrae.", pos: "Reproduction of the familiar local pain, and/or clearly reduced or excessive movement compared with the levels above and below.", tier: 3 },

  /* ---- LUMBAR ---- */
  { id: "lx1", r: "lx", cat: "Radiculopathy / neural", n: "Straight leg raise (Lasègue)", t: "Lumbosacral radiculopathy (L4–S1), disc herniation", p: "Patient supine, relaxed. Keeping the knee straight, passively raise the leg by the heel, lifting slowly until symptoms appear. To sensitise (bias the nerve further), add ankle dorsiflexion (pull the foot up — Bragard) or ask the patient to flex the neck.", pos: "Reproduction of the radiating leg pain between about 30° and 70° of hip flexion, made worse by the sensitisers. Hamstring tightness alone is not a positive test.", sn: "85–91", sp: "26–29", tier: 1, pearl: "Sensitive, not specific — a negative straight leg raise argues against disc herniation." },
  { id: "lx2", r: "lx", cat: "Radiculopathy / neural", n: "Crossed straight leg raise", t: "Disc herniation (L4–S1)", p: "Patient supine. Perform the straight leg raise on the PAIN-FREE leg (keep the knee straight and lift by the heel).", pos: "Raising the pain-free leg reproduces the pain in the OTHER (symptomatic) leg.", sn: "22–43", sp: "88–98", tier: 1, pearl: "Mirror of the straight leg raise — highly specific, so good for ruling IN a herniation." },
  { id: "lx3", r: "lx", cat: "Radiculopathy / neural", n: "Slump test", t: "Neural mechanosensitivity, radiculopathy", p: "Patient sitting on the edge of the table. Build the position in order: (1) slump the trunk (round the low and mid back) while keeping the head level, (2) flex the neck (chin to chest), (3) actively extend one knee, (4) dorsiflex that ankle. Then, holding everything else, ask the patient to lift the head (extend the neck) and see if symptoms ease.", pos: "Reproduction of the familiar leg/back symptoms that clearly ease when the neck is straightened (this neck-movement change confirms a neural source).", sn: "52–84", sp: "83–89", tier: 1 },
  { id: "lx4", r: "lx", cat: "Radiculopathy / neural", n: "Femoral nerve tension (prone knee bend)", t: "Upper lumbar radiculopathy (L2–L4)", p: "Patient prone. Passively flex the knee, bringing the heel toward the buttock; if needed, also lift (extend) the thigh at the hip to add tension.", pos: "Reproduction of radiating pain in the front of the thigh.", sn: "≈50", sp: "≈100", tier: 2 },
  { id: "lx5", r: "lx", cat: "Instability", n: "Prone instability test", t: "Lumbar segmental instability", p: "Patient lies face-down with the trunk on the table and both feet resting on the floor. With the feet down, press from back to front (posteroanterior) over each lumbar segment and note any painful level. Then ask the patient to lift both legs off the floor (activating the back muscles) and repeat the same pressure.", pos: "Pain present with the feet down that disappears once the legs are lifted — the muscle activation stabilises the painful segment.", sn: "61", sp: "57", tier: 2, pearl: "One of Hicks' criteria supporting a stabilisation-exercise responder." },
  { id: "lx6", r: "lx", cat: "Instability", n: "Passive lumbar extension test", t: "Lumbar segmental instability", p: "Patient prone. Grasp both ankles and lift both legs together about 30 cm off the table, keeping the knees straight, then gently lower them.", pos: "Familiar low back pain while the legs are raised that resolves as they are lowered.", sn: "84", sp: "90", tier: 2 },
  { id: "lx7", r: "lx", cat: "Stenosis", n: "Two-stage treadmill / extension bias", t: "Lumbar spinal stenosis (neurogenic claudication)", p: "Patient walks on a treadmill in two stages: first on the level (upright, which extends the spine), then on an incline (which flexes the spine forward). Compare how long the patient can walk and when leg symptoms start in each stage.", pos: "Later symptom onset and longer walking tolerance in the flexed (inclined) posture than when upright.", tier: 2 },
  { id: "lx8", r: "lx", cat: "Non-organic", n: "Waddell signs (screen)", t: "Non-organic / behavioural component", p: "A screen of five categories: (1) superficial or non-anatomic tenderness, (2) pain on axial loading (press down on the head) and on simulated trunk rotation, (3) a straight leg raise that differs markedly when the patient is distracted, (4) sensory or motor changes that don't follow a dermatome/myotome, and (5) over-reaction during the exam.", pos: "Three or more of the five categories positive suggests a significant behavioural/psychosocial component.", tier: 2, pearl: "A yellow-flag screen, NOT a test for malingering — interpret with care." },
  { id: "lx9", r: "lx", cat: "Radiculopathy / neural", n: "Bowstring / popliteal compression", t: "Sciatic nerve tension", p: "Patient supine. Raise the straight leg to the point where symptoms just begin, then slightly bend the knee to ease them. Holding that position, press with your thumb into the back of the knee (popliteal fossa) over the sciatic nerve.", pos: "Thumb pressure reproduces the same radiating leg symptoms.", tier: 3 },
  { id: "lx10", r: "lx", cat: "Radiculopathy / neural", n: "Bragard's sign", t: "Lumbosacral radiculopathy (vs isolated hamstring tightness)", p: "Patient supine. Raise the straight leg to the point of familiar pain, then lower it just below that threshold so symptoms ease. Holding there, pull the foot up into dorsiflexion.", pos: "The familiar radiating pain returns with the ankle dorsiflexion.", sn: "≈69", sp: "≈76", tier: 2, pearl: "A straight-leg-raise sensitiser in its own right — best used when the straight leg raise alone is equivocal, especially within the first 3 weeks of symptoms." },
  { id: "lx11", r: "lx", cat: "Core / motor control", n: "Double leg lowering test", t: "Abdominal (anterior core) control", p: "Patient supine with both hips flexed to 90° (legs up). Place a pressure cuff (or your hand) under the low back to monitor the pelvic tilt. Ask the patient to keep the low back flat (posterior pelvic tilt) while slowly lowering both straight legs toward the table.", pos: "Note the leg angle at which the low back arches up and the pressure drops — a higher leg angle (legs still far from the table) before the back gives way indicates weaker abdominal control.", tier: 3, pearl: "An eccentric task, harder than a curl-up — it tests the abdominals' ability to control the pelvis as the descending legs increase the hip-flexor pull." },
  { id: "lx12", r: "lx", cat: "Directional preference", n: "McKenzie side glide test", t: "Frontal-plane directional preference / lateral shift", p: "Patient standing, shoulders kept level. Ask the patient to shift the hips sideways as far as possible in each direction while the shoulders stay put (you can add gentle overpressure).", pos: "A clearly asymmetric loss of motion, or symptoms that reproduce/centralise to one side, identifies a lateral (side-shift) component.", tier: 3, pearl: "Part of the McKenzie / Mechanical Diagnosis and Therapy (MDT) classification — pairs with repeated flexion/extension to map the patient's full directional preference." },

  /* ---- SI JOINT & PELVIS ---- */
  { id: "si1", r: "si", cat: "Provocation cluster", n: "Thigh thrust (posterior shear)", t: "Sacroiliac joint (SIJ) pain provocation", p: "Patient supine. Flex the hip on the tested side to 90° (knee bent). Cup one hand under the sacrum, then push straight down the line of the femur through the flexed knee, driving the joint into a backward (posterior) shear.", pos: "Reproduction of the familiar sacroiliac joint / buttock pain.", sn: "36–88", sp: "≈69", tier: 1, pearl: "Individually the strongest single sacroiliac joint provocation test." },
  { id: "si2", r: "si", cat: "Provocation cluster", n: "Distraction (gapping)", t: "Sacroiliac joint (SIJ) pain provocation", p: "Patient supine. Cross your arms and place the heels of your hands on the inner edges of both front pelvic bones (anterior superior iliac spines, ASIS), then push down and outward (posterolaterally) to gap the front of the joints.", pos: "Reproduction of the familiar sacroiliac joint pain.", sn: "≈60", sp: "≈81", tier: 1 },
  { id: "si3", r: "si", cat: "Provocation cluster", n: "Compression (approximation)", t: "Sacroiliac joint (SIJ) pain provocation", p: "Patient side-lying. Place both hands on the top of the uppermost iliac crest and press straight down toward the floor, compressing the pelvis.", pos: "Reproduction of the familiar sacroiliac joint pain.", sn: "≈69", sp: "≈69", tier: 1 },
  { id: "si4", r: "si", cat: "Provocation cluster", n: "Sacral thrust", t: "Sacroiliac joint (SIJ) pain provocation", p: "Patient prone. Place the heel of one hand on the middle of the sacrum and push straight down (from back to front, posteroanterior), springing through the joint.", pos: "Reproduction of the familiar sacroiliac joint pain.", sn: "≈53", sp: "≈75", tier: 1 },
  { id: "si5", r: "si", cat: "Provocation cluster", n: "Gaenslen test", t: "Sacroiliac joint (SIJ) pain provocation", p: "Patient supine at the edge of the table with the tested-side buttock right at the edge. Ask the patient to pull the opposite knee to the chest (hip fully flexed) while you let the tested leg drop off the edge into hip extension, adding gentle overpressure.", pos: "Reproduction of the familiar sacroiliac joint pain on the extended (dropped) side.", sn: "≈53", sp: "≈71", tier: 2 },
  { id: "si6", r: "si", cat: "Pelvic girdle (peripartum)", n: "Active straight leg raise (ASLR)", t: "Pelvic girdle pain / force-closure deficit", p: "Patient supine, legs straight. Ask the patient to lift one straight leg about 20 cm off the table and rate how heavy/difficult it feels. Then repeat while you manually compress the pelvis inward (squeeze the two iliac crests together) and see if it becomes easier.", pos: "Heaviness or difficulty lifting the leg that clearly improves with the pelvic compression indicates a load-transfer (force-closure) problem.", sn: "≈87", sp: "≈94", tier: 2 },
  { id: "si7", r: "si", cat: "Other", n: "FABER / Patrick test (flexion, abduction, external rotation)", t: "Sacroiliac joint (SIJ) or hip pathology", p: "Patient supine. Place the tested leg in a figure-4: heel on the opposite knee, with the hip flexed, abducted, and externally rotated. Stabilise the opposite front pelvic bone (anterior superior iliac spine, ASIS) and apply gentle downward overpressure to the bent knee.", pos: "Pain felt behind at the sacroiliac joint suggests an SIJ source; pain felt in the groin points to the hip.", tier: 2, pearl: "Non-specific — the LOCATION of the pain guides interpretation (also appears under Hip)." },

  /* ---- PELVIS (merged into SI JOINT & PELVIS) ---- researched against
   * Physiopedia's Pelvis special-tests category
   * (physio-pedia.com/Category:Pelvis_-_Special_Tests). That category's 11
   * pages include 5 tests already above (Gaenslen = si5, the Posterior
   * Pelvic Pain Provocation/P4 test = si1 Thigh thrust, Sacral Thrust =
   * si4, Sacroiliac Compression = si3, Sacroiliac Distraction = si2) — NOT
   * duplicated below, so the same test doesn't appear twice in the menu.
   * Only the 6 genuinely missing tests are added, under this SAME region
   * (originally a separate "Pelvis" region/menu, merged into
   * "SI Joint & Pelvis" per the clinician's own follow-up — ids kept as
   * pv1-pv6 rather than renumbered, since nothing but the `r` field
   * needed to change). None of the 11 overlap with the Hip region's own
   * tests (checked directly, not assumed). */
  { id: "pv1", r: "si", cat: "Ligament", n: "Long dorsal sacroiliac ligament palpation", t: "Long dorsal sacroiliac ligament pathology / sacroiliac joint (SIJ)-related pain", p: "Patient prone or side-lying. Find the bony bump at the back of the pelvis (posterior superior iliac spine, PSIS), then palpate just below and toward the midline of it, over the long dorsal sacroiliac ligament (between the PSIS and the groove beside the sacrum).", pos: "Focal tenderness that reproduces the patient's pain — often seen with sacroiliac-joint-related or postpartum pelvic girdle pain.", tier: 3, pearl: "A purely palpation sign, not a provocation maneuver — best interpreted alongside a provocation cluster (e.g. Laslett's) rather than on its own." },
  { id: "pv2", r: "si", cat: "Provocation", n: "Mennell's sign", t: "Sacroiliac joint (SIJ) dysfunction", p: "Patient prone (or side-lying). Stabilise the pelvis/sacrum firmly with one hand, then with the other hand lift the straight leg upward into hip extension.", pos: "Reproduction of pain localised to the sacroiliac joint region.", tier: 3, pearl: "A historically-described test with limited modern evidence — most useful as part of a broader sacroiliac joint provocation picture rather than alone." },
  { id: "pv3", r: "si", cat: "Provocation", n: "Yeoman's test", t: "Anterior sacroiliac joint / ligament stress", p: "Patient prone. Bend the knee on the tested side to 90°. Press down on the sacrum with one hand to stabilise it, then with the other hand lift the bent leg upward (extending the hip), rotating that half of the pelvis forward.", pos: "Reproduction of sacroiliac joint pain as the pelvis (ilium) rotates forward on the sacrum.", tier: 3 },
  { id: "pv4", r: "si", cat: "Motion palpation", n: "Seated flexion test", t: "Intra-articular sacroiliac (sacral) motion asymmetry", p: "Patient sitting with hips flexed about 90° and feet supported — sitting 'locks' the pelvis by weight-bearing through the sit-bones. Place a thumb under each PSIS (the bony bumps at the back of the pelvis), then ask the patient to bend forward, and watch whether the thumbs move up evenly.", pos: "One PSIS travels further upward (toward the head) than the other — the asymmetry suggests a sacral/intra-articular restriction on that side.", tier: 3, pearl: "Paired with the standing flexion test to help tell a true intra-articular (sacroiliac) restriction from an iliosacral (pelvic-bone) one — poor inter-rater reliability is a well-known limitation of both." },
  { id: "pv5", r: "si", cat: "Motion palpation", n: "Standing flexion test", t: "Iliosacral (pelvic-bone) motion asymmetry", p: "Patient standing. Place a thumb under each PSIS (the bony bumps at the back of the pelvis), then ask the patient to bend forward from the hips and low back, watching whether the thumbs rise evenly.", pos: "One PSIS travels further upward than the other; the side that moves first/furthest is the restricted (positive) side — pointing to an iliosacral restriction.", tier: 3, pearl: "Unlike the seated version, the pelvis isn't 'locked' by sitting here — so this reflects the whole chain (hip, leg, pelvis), not an isolated joint restriction." },
  { id: "pv6", r: "si", cat: "Motion palpation", n: "Stork test (Gillet test)", t: "Sacroiliac joint (SIJ) mobility (hypomobility screening)", p: "Patient standing. Place one thumb on the PSIS (bony bump at the back of the pelvis) on the tested side and the other thumb on the sacrum at the midline, level with it. Ask the patient to lift that knee up toward the chest (a stork stance) and feel how the PSIS moves relative to the sacrum.", pos: "Normally the PSIS drops down and back relative to the sacrum; little or no movement (or movement the wrong way) suggests reduced sacroiliac joint mobility on that side.", tier: 3, pearl: "One of the most commonly taught sacroiliac mobility tests, but inter-rater reliability is famously poor — interpret cautiously and alongside provocation testing." },

  /* ---- SHOULDER ---- */
  { id: "sh1", r: "sh", cat: "Subacromial / impingement", n: "Neer impingement sign", t: "Subacromial pain (impingement)", p: "Patient sitting. Stand beside/behind the patient. Hold the scapula down with one hand to stop it rotating, turn the arm inward (internal rotation, thumb pointing down), then with your other hand passively raise the straight arm fully forward and up (flexion) to end-range.", pos: "Pain in the front-and-outer shoulder near the top of the range.", sn: "72–79", sp: "31–60", tier: 2, pearl: "Sensitive but not specific — it screens impingement IN but doesn't tell you which tissue." },
  { id: "sh2", r: "sh", cat: "Subacromial / impingement", n: "Hawkins-Kennedy", t: "Subacromial pain (impingement)", p: "Patient sitting. Bring the shoulder and elbow each to 90° (arm forward, elbow bent). Support the elbow with one hand and, with the other, passively rotate the forearm downward (internal rotation of the shoulder).", pos: "Reproduction of pain in the front-and-outer shoulder.", sn: "74–80", sp: "40–59", tier: 2 },
  { id: "sh3", r: "sh", cat: "Subacromial / impingement", n: "Painful arc", t: "Subacromial pain", p: "Patient standing. Ask the patient to actively raise the arm out to the side in the plane of the shoulder blade (scapular plane) all the way up, then lower it.", pos: "Pain appearing between about 60° and 120° of elevation that eases above and below that arc.", sn: "33–74", sp: "81", tier: 2 },
  { id: "sh4", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Empty can (Jobe)", t: "Supraspinatus tear / tendinopathy", p: "Patient sitting or standing. Position the arm at 90° elevation in the plane of the shoulder blade (about 30° forward of straight sideways), then fully rotate it inward so the thumb points down (as if emptying a can). Push down on the forearm while the patient resists.", pos: "Weakness and/or pain compared with the other side.", sn: "63–89", sp: "50–68", tier: 2 },
  { id: "sh5", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Full can", t: "Supraspinatus (better tolerated)", p: "Same arm position as the empty can (90° in the scapular plane) but with the thumb pointing UP (external rotation). Push down on the forearm while the patient resists.", pos: "Weakness or pain.", sn: "70–77", sp: "68–74", tier: 2, pearl: "Often preferred over the empty can — similar accuracy, less provocative." },
  { id: "sh6", r: "sh", cat: "Rotator cuff — infraspinatus/teres minor", n: "Resisted external rotation (arm at side)", t: "Infraspinatus / teres minor", p: "Patient sitting or standing with the elbow tucked at the side, bent to 90°, and the forearm pointing straight forward (neutral rotation). Ask the patient to rotate the forearm outward against your resistance.", pos: "Weakness or pain.", sn: "≈42", sp: "≈90", tier: 2 },
  { id: "sh7", r: "sh", cat: "Rotator cuff — infraspinatus/teres minor", n: "External rotation lag sign", t: "Infraspinatus full-thickness tear", p: "Patient sitting, elbow at the side bent to 90° and the shoulder abducted about 20°. Passively rotate the forearm outward to nearly full external rotation, then let go and ask the patient to hold that position.", pos: "The forearm springs back inward (a lag) because the patient can't hold the outward-rotated position.", sn: "46–56", sp: "94–98", tier: 2 },
  { id: "sh8", r: "sh", cat: "Rotator cuff — subscapularis", n: "Lift-off (Gerber)", t: "Subscapularis tear", p: "Patient standing. Place the back of the hand against the low back (palm facing outward). Ask the patient to lift the hand straight away from the back.", pos: "Inability to lift the hand off, or a lag on trying to hold it off.", sn: "18–62", sp: "79–100", tier: 2 },
  { id: "sh9", r: "sh", cat: "Rotator cuff — subscapularis", n: "Belly-press", t: "Subscapularis (upper) tear", p: "Patient sitting or standing. Place the patient's flat palm on the belly with the elbow held forward of the trunk. Ask the patient to press the palm into the belly while keeping the wrist straight and the elbow forward.", pos: "The elbow drops back behind the body and/or the wrist flexes to cheat — a sign the subscapularis can't do the press.", sn: "40–88", sp: "84–98", tier: 2 },
  { id: "sh10", r: "sh", cat: "Rotator cuff — subscapularis", n: "Bear-hug", t: "Subscapularis (upper) tear", p: "Patient sitting or standing. Place the patient's palm on the OPPOSITE shoulder with the elbow lifted forward. Ask the patient to keep the palm down while you try to pull/rotate the hand up off the shoulder.", pos: "Weakness in holding the hand down against your pull.", sn: "≈60", sp: "≈92", tier: 2 },
  { id: "sh11", r: "sh", cat: "Instability", n: "Apprehension test", t: "Anterior glenohumeral instability", p: "Patient supine (or sitting), shoulder abducted to 90° and elbow bent to 90°. Slowly and progressively rotate the forearm outward (external rotation), watching the patient's face and comfort.", pos: "Apprehension or guarding (a sense the shoulder will pop out) — not just pain.", sn: "53–72", sp: "96–99", tier: 1 },
  { id: "sh12", r: "sh", cat: "Instability", n: "Relocation (Jobe)", t: "Anterior instability", p: "Immediately after a positive apprehension test (same 90°/90° position), place your hand on the front of the shoulder and push the head of the humerus backward (posteriorly) while holding the external rotation.", pos: "The apprehension eases with the backward pressure.", sn: "46–65", sp: "54–100", tier: 1 },
  { id: "sh13", r: "sh", cat: "Instability", n: "Surprise / release", t: "Anterior instability", p: "From the relocation position (backward pressure applied), suddenly let go of the backward force.", pos: "A sudden return of apprehension the moment the pressure is released.", sn: "≈64", sp: "≈99", tier: 1, pearl: "Apprehension + relocation + surprise together are highly specific for anterior instability." },
  { id: "sh14", r: "sh", cat: "Instability", n: "Sulcus sign", t: "Inferior / multidirectional instability", p: "Patient sitting, arm relaxed at the side. Grasp just above the elbow and pull the whole arm straight down (downward traction), watching the skin just below the tip of the shoulder (acromion).", pos: "A visible groove (sulcus) greater than 2 cm appears between the acromion and the head of the humerus.", tier: 2 },
  { id: "sh15", r: "sh", cat: "Labrum (SLAP)", n: "O'Brien active compression", t: "SLAP (superior labral) lesion / acromioclavicular (AC) joint", p: "Patient standing, arm raised to 90° forward, brought 10° across the body (adduction), and fully rotated inward so the thumb points down. Push down on the arm while the patient resists. Then turn the palm fully up (thumb up) and repeat.", pos: "Deep pain with the thumb-down pass that lessens with the thumb-up pass suggests a SLAP lesion; pain felt right on top of the shoulder points instead to the acromioclavicular joint.", sn: "47–78", sp: "11–73", tier: 2 },
  { id: "sh16", r: "sh", cat: "Labrum (SLAP)", n: "Biceps load II", t: "SLAP (superior labral) lesion", p: "Patient supine. Abduct the shoulder to 120° and rotate it fully outward (external rotation), with the elbow bent 90° and the forearm turned palm-up (supinated). Ask the patient to bend the elbow against your resistance.", pos: "Pain on the resisted elbow bend in this position.", sn: "30–90", sp: "78–97", tier: 2 },
  { id: "sh17", r: "sh", cat: "Biceps", n: "Speed test", t: "Long head of biceps / SLAP (superior labral) lesion", p: "Patient sitting or standing. Straighten the elbow and turn the palm up (supinated), then raise the arm forward to about 60°. Push the arm down while the patient resists.", pos: "Pain in the biceps groove at the front of the shoulder.", sn: "32–68", sp: "56–75", tier: 3 },
  { id: "sh18", r: "sh", cat: "AC joint", n: "Cross-body adduction", t: "Acromioclavicular (AC) joint pathology", p: "Patient sitting or standing. Raise the arm to 90° forward (flexion), then passively bring it straight across the body toward the opposite shoulder (horizontal adduction), adding gentle overpressure.", pos: "Pain localised right on top of the shoulder at the acromioclavicular joint.", sn: "77", sp: "79", tier: 2 },
  { id: "sh19", r: "sh", cat: "Scapula", n: "Scapular assistance / retraction", t: "Contribution of scapular dyskinesis", p: "Patient standing. As the patient raises the painful/weak arm, use your hands to help the shoulder blade rotate upward (assistance), or hold it pinched back and down (retraction). Compare the movement with and without your help.", pos: "The pain or weakness clearly improves when you correct the shoulder-blade position.", tier: 2, pearl: "A correction procedure, not a pathology test — it reveals a treatable scapular contribution." },
  { id: "sh20", r: "sh", cat: "Frozen shoulder", n: "Passive external rotation loss in adduction", t: "Adhesive capsulitis vs cuff tear", p: "Patient sitting or supine, elbow tucked at the side and bent 90°. Passively rotate the forearm outward (external rotation) to end-range, and compare the available range with the other shoulder.", pos: "Markedly reduced passive external rotation, as part of a global loss of motion, points to a frozen shoulder (adhesive capsulitis) rather than a cuff tear.", tier: 2 },
  { id: "sh21", r: "sh", cat: "Instability", n: "Anterior drawer test (shoulder)", t: "Anterior glenohumeral instability", p: "Patient supine. Position the shoulder in 80–120° abduction, 0–20° forward flexion, and 0–30° external rotation. Stabilise the shoulder blade with one hand, grip the upper humerus with the other, and draw it forward.", pos: "More forward (anterior) glide than the other side, graded 0–3; a click may suggest a labral tear.", sn: "53", sp: "85", tier: 2, pearl: "Useful when the apprehension test is hard to read on an aching (rather than unstable-feeling) shoulder." },
  { id: "sh22", r: "sh", cat: "Neuro differentiation", n: "Arm squeeze test", t: "Cervical radiculopathy vs shoulder pathology", p: "Patient sitting. Firmly squeeze the middle third of the upper arm (the biceps/triceps muscle bellies) between your fingers and thumb.", pos: "Marked local pain on the squeeze points to a cervical nerve-root source rather than the shoulder itself.", tier: 3, pearl: "A quick bedside way to tell whether arm pain is coming from the neck or the shoulder." },
  { id: "sh23", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Drop arm test (Codman's)", t: "Full-thickness rotator cuff tear (supraspinatus)", p: "Patient sitting or standing. Passively raise the arm out to the side to 90° abduction, then ask the patient to slowly lower it back to the side under control.", pos: "The arm suddenly drops, or pain/weakness appears, during the lowering.", sn: "73", sp: "77", tier: 2, pearl: "Best combined with the resisted-external-rotation (infraspinatus) test and painful arc — all 3 positive raises the positive likelihood ratio to about 15.6 (about 28 if the patient is also over 60)." },
  { id: "sh24", r: "sh", cat: "Labrum (SLAP)", n: "Crank test", t: "Glenoid labral tear / SLAP (superior labral) lesion", p: "Patient sitting. Raise the arm to about 90° in the plane of the shoulder blade. Push straight down the shaft of the humerus (axial load into the socket) while rotating the arm back and forth — pain is usually brought on with external rotation.", pos: "Reproduction of pain, with or without a click.", sn: "9–91", sp: "56–100", tier: 3, pearl: "Widely varying reported accuracy — treat it as one piece of a labral test cluster, not a stand-alone rule-in/out." },
  { id: "sh25", r: "sh", cat: "Scapula", n: "Hara test", t: "Throwing kinetic-chain dysfunction", p: "Not a single maneuver — an 11-item battery of shoulder-blade and arm measures (for example, the distance from the shoulder blade to the spine) performed on overhead-throwing athletes.", pos: "Abnormal findings across the battery show where along the movement chain the throwing dysfunction arises.", tier: 3, pearl: "Sport-specific (baseball pitching) — a measurement battery rather than a single provocation test." },
  { id: "sh26", r: "sh", cat: "Rotator cuff — infraspinatus/teres minor", n: "Hornblower's sign (Patte's test)", t: "Teres minor tear", p: "Patient standing. Support the arm at 90° abduction in the plane of the shoulder blade with the elbow bent 90°. Ask the patient to rotate the forearm outward (external rotation) against your resistance.", pos: "Inability to hold external rotation against resistance; also positive if the patient has to lift the whole arm out to the side to bring the hand to the mouth.", sn: "100", sp: "93", tier: 1, pearl: "A positive Hornblower's alongside a positive external rotation lag sign suggests an irreparable posterosuperior cuff tear." },
  { id: "sh27", r: "sh", cat: "Rotator cuff — subscapularis", n: "Internal rotation lag sign", t: "Subscapularis tendon tear", p: "Patient sitting. Place the back of the hand on the low back, then passively lift it about 20° away from the back (into extension/internal rotation), let go, and ask the patient to hold it there.", pos: "A lag — the hand drifts back toward the back; a bigger lag suggests a bigger tear.", sn: "97–100", sp: "84–96", tier: 1, pearl: "Also called the subscapularis 'spring-back' test — pairs with the lift-off as the two subscapularis-specific signs." },
  { id: "sh28", r: "sh", cat: "Instability", n: "Jerk test", t: "Posteroinferior glenohumeral instability", p: "Patient sitting. Raise the arm to 90° abduction and rotate it inward (internal rotation). Push straight down the shaft of the humerus into the socket (axial load) while moving the arm horizontally across the body.", pos: "A sudden clunk as the head of the humerus slips off the back rim of the socket (and again as it returns).", sn: "73", sp: "98", tier: 1, pearl: "Combine with the Kim test — sensitivity for posteroinferior labral lesions rises to about 97% when both are positive." },
  { id: "sh29", r: "sh", cat: "Labrum (SLAP)", n: "Kim test", t: "Posteroinferior labral lesion", p: "Patient sitting, arm supported at 90° abduction. With one hand push firmly down the shaft of the humerus into the socket (axial load); with the other, take the arm to about 45° of elevation and push it diagonally downward and backward.", pos: "Sudden pain at the back of the shoulder, with or without a clunk.", sn: "80", sp: "94", tier: 1, pearl: "More sensitive than the jerk test for a mainly inferior lesion; the jerk test is better for a mainly posterior one." },
  { id: "sh30", r: "sh", cat: "Instability", n: "Load and shift", t: "Glenohumeral joint laxity", p: "Patient sitting. Stabilise the shoulder blade with one hand, grip the head of the humerus with the other, seat it in the socket, then glide it forward-and-inward, then backward-and-outward.", pos: "Glide of more than half the width of the humeral head compared with the other side.", sn: "14–50", sp: "≈100", tier: 2, pearl: "Not biomechanically validated, but very specific when the glide is clearly excessive." },
  { id: "sh31", r: "sh", cat: "Instability", n: "Norwood stress test", t: "Posterior instability (posterior capsule)", p: "Patient supine. Position the shoulder at 90° abduction with external rotation so the forearm points to the ceiling, elbow bent 90°. Passively bring the arm across the body (horizontal adduction) while feeling at the back of the shoulder for the head sliding backward.", pos: "Apprehension, pain, or a partial backward dislocation as the head rides over the back rim of the socket.", tier: 3, pearl: "Posterior instability is uncommon (about 2% of dislocations) — keep it on the differential when the standard apprehension tests are equivocal." },
  { id: "sh32", r: "sh", cat: "Labrum (SLAP)", n: "Passive compression test", t: "SLAP (superior labral) lesion", p: "Patient side-lying on the good side. Hold the affected arm at about 30° abduction. Passively rotate it outward (external rotation) while pushing the head of the humerus up into the socket and extending the arm.", pos: "Pain or a painful click inside the joint.", sn: "82", sp: "86", tier: 2 },
  { id: "sh33", r: "sh", cat: "AC joint", n: "Paxinos test", t: "Acromioclavicular (AC) joint pathology", p: "Patient sitting, arm relaxed at the side. Place your thumb under the back-outer corner of the acromion and the index/middle fingers on top of the mid-collarbone (clavicle). Squeeze by pushing the acromion up-and-forward against the clavicle down.", pos: "Pain at the acromioclavicular joint on top of the shoulder.", sn: "79", sp: "50", tier: 3 },
  { id: "sh34", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Rent test", t: "Full-thickness rotator cuff tear", p: "Patient sitting, arm relaxed (some extension helps expose the tendon). Palpate through the deltoid over the front edge of the greater tuberosity (the bony knob at the top-outer humerus), feeling for a gap as you rotate the arm.", pos: "A palpable 'rent' (gap in the tendon) or grating (crepitus) at the tuberosity.", tier: 2, pearl: "Palpation through the deltoid — may be the single best exam finding for a full-thickness tear when combined with the other cuff tests." },
  { id: "sh35", r: "sh", cat: "AC joint", n: "Resisted AC joint extension test", t: "Acromioclavicular (AC) joint pathology (vs subacromial impingement)", p: "Patient sitting with the shoulder and elbow each bent 90° and the shoulder rotated inward, arm across toward the midline. Ask the patient to pull the arm horizontally outward and back (horizontal abduction) against your resistance.", pos: "Pain localised to the acromioclavicular joint on top of the shoulder.", sn: "72", sp: "85", tier: 2, pearl: "Combine with cross-body adduction and O'Brien's — 2 of 3 positive raises sensitivity to about 81%." },
  { id: "sh36", r: "sh", cat: "Scapula", n: "Serratus anterior strength (punch-out) test", t: "Serratus anterior weakness / scapular winging", p: "Patient standing or sitting, arm raised straight forward to 90° (as if starting a punch). Push the fist/arm backward while the patient resists (a wall or floor push-up loads it further). Watch the inner edge of the shoulder blade.", pos: "The inner (medial) border of the shoulder blade lifts away from the ribcage (winging).", tier: 2 },
  { id: "sh37", r: "sh", cat: "Rotator cuff — supraspinatus", n: "Whipple test", t: "Partial rotator cuff tear / SLAP (superior labral) lesion", p: "Patient standing or sitting. Raise the arm to 90° forward and bring the hand across the body toward the opposite shoulder. Push down on the arm while the patient resists.", pos: "Pain with the resisted downward pressure.", sn: "88.6", sp: "29.4", tier: 3, pearl: "Less specific than the empty/full can for supraspinatus — use alongside them, not instead of them." },
  { id: "sh38", r: "sh", cat: "Biceps", n: "Yergason's test", t: "Biceps tendon pathology / SLAP (superior labral) lesion", p: "Patient sitting, elbow tucked at the side and bent 90° with the forearm turned palm-down (pronated). Ask the patient to turn the palm up (supinate) and rotate the arm outward against your resistance.", pos: "Pain in the biceps groove at the front of the shoulder, or a click suggesting the tendon-holding ligament (transverse humeral ligament) is injured.", sn: "43", sp: "79", tier: 3 },
  { id: "sh39", r: "sh", cat: "Subacromial / impingement", n: "Yocum's test", t: "Subacromial impingement", p: "Patient sitting. Ask the patient to place the hand of the tested arm on the opposite shoulder, then raise that elbow upward without shrugging or lifting the shoulder.", pos: "Pain as the elbow is raised.", sn: "79", sp: "40", tier: 3, pearl: "A self-performed alternative to Hawkins-Kennedy — the examiner doesn't have to move the arm." },

  /* ---- ELBOW ---- */
  { id: "el1", r: "el", cat: "Epicondylalgia", n: "Cozen test (resisted wrist extension)", t: "Lateral epicondylalgia (tennis elbow)", p: "Patient sitting, elbow straight and the forearm turned palm-down (pronated), hand in a loose fist. Steady the elbow with one hand, resting your thumb on the lateral epicondyle (bony point on the outer elbow). Ask the patient to cock the wrist back (extend it) against your resistance.", pos: "Pain over the lateral epicondyle.", sn: "84", sp: "≈50", tier: 2 },
  { id: "el2", r: "el", cat: "Epicondylalgia", n: "Mill test", t: "Lateral epicondylalgia", p: "Patient sitting. Rest a finger on the lateral epicondyle (outer elbow), then passively turn the forearm palm-down (pronate), bend the wrist fully down (flex), and straighten the elbow.", pos: "Pain over the lateral epicondyle.", tier: 2 },
  { id: "el3", r: "el", cat: "Epicondylalgia", n: "Maudsley test (resisted middle finger)", t: "Lateral epicondylalgia (biased to extensor digitorum communis, EDC)", p: "Patient sitting, elbow straight. Ask the patient to hold the middle finger out straight while you press down on it (resisting middle-finger extension).", pos: "Pain over the lateral epicondyle (outer elbow).", tier: 2 },
  { id: "el4", r: "el", cat: "Epicondylalgia", n: "Medial epicondyle provocation (golfer's elbow)", t: "Medial epicondylalgia", p: "Patient sitting, elbow straight and forearm palm-up. Rest a finger on the medial epicondyle (bony point on the inner elbow), then ask the patient to bend the wrist down (flex) and turn the forearm palm-down (pronate) against your resistance.", pos: "Pain over the medial epicondyle.", tier: 2 },
  { id: "el5", r: "el", cat: "Ligament", n: "Valgus stress test (ulnar collateral ligament, UCL)", t: "Ulnar collateral ligament (inner elbow)", p: "Patient sitting, elbow bent about 20–30°. Steady the upper arm, hold the wrist, and push the forearm outward away from the body (a valgus force) to open the inner side of the joint.", pos: "Inner-elbow pain and/or more opening (gapping) than the other side.", tier: 2 },
  { id: "el6", r: "el", cat: "Ligament", n: "Moving valgus stress test", t: "Ulnar collateral ligament (UCL) — overhead athletes", p: "Patient sitting, shoulder abducted. Fully bend the elbow while applying and holding an outward (valgus) force, then quickly straighten the elbow while keeping that valgus force on.", pos: "Pain reproduced within the throwing 'late-cocking' arc, roughly 120° down to 70° of flexion.", sn: "≈100", sp: "≈75", tier: 2 },
  { id: "el7", r: "el", cat: "Ligament", n: "Varus stress test (lateral collateral ligament, LCL)", t: "Lateral collateral ligament (outer elbow)", p: "Patient sitting, elbow bent about 20–30°. Steady the upper arm, hold the wrist, and push the forearm inward toward the body (a varus force) to open the outer side of the joint.", pos: "Outer-elbow pain and/or more opening (gapping) than the other side.", tier: 3 },
  { id: "el8", r: "el", cat: "Instability", n: "Lateral pivot-shift test (posterolateral rotatory)", t: "Posterolateral rotatory instability (PLRI)", p: "Patient supine with the arm raised overhead. Hold the forearm palm-up (supinated), apply an outward (valgus) force plus a push down the forearm into the joint (axial load), then slowly bend the elbow starting from full extension.", pos: "Apprehension, or a clunk as the radial head slips out and back in — often only felt with the patient under anaesthesia.", tier: 3 },
  { id: "el9", r: "el", cat: "Nerve", n: "Elbow flexion + Tinel test (cubital tunnel)", t: "Ulnar nerve entrapment", p: "Patient sitting. Ask the patient to fully bend the elbow with the wrist cocked back (extended) and hold up to 60 seconds; you may also gently tap over the cubital tunnel (the groove behind the inner elbow).", pos: "Pins-and-needles in the little finger and half the ring finger (the ulnar 1½ digits).", tier: 2 },
  { id: "el10", r: "el", cat: "Ligament", n: "Milking maneuver", t: "Ulnar collateral ligament (UCL, inner elbow) insufficiency", p: "Patient sitting, shoulder abducted and rotated outward, elbow bent past 90° with the forearm palm-up. Reach under the forearm, grasp the patient's thumb, and pull down on it repeatedly — this applies a valgus (milking) stress to the inner elbow.", pos: "Inner-elbow pain and/or a feeling of instability that reproduces the athlete's symptoms.", tier: 2, pearl: "Different from the static and moving valgus stress tests above — it stresses the ligament by pulling through the thumb with the arm in a throwing-like position, rather than a direct valgus push at a fixed angle." },
  { id: "el11", r: "el", cat: "Instability", n: "Table top relocation test", t: "Posterolateral rotatory instability (PLRI) — awake alternative to the lateral pivot-shift", p: "Patient standing, leaning onto a tabletop or chair armrest with the forearm palm-up and the elbow near 40° flexion. Ask the patient to push up as if to stand. First let them do it freely, then repeat while you press a thumb over the radial head (outer elbow).", pos: "Apprehension or a palpable clunk on the free push-up that goes away WHEN your thumb supports the radial head — a true relocation.", tier: 3, pearl: "A bedside, awake-patient alternative to the lateral pivot-shift test, which classically only reproduces the clunk under anaesthesia — useful when that test is equivocal or too guarded in clinic." },
  { id: "el12", r: "el", cat: "Fracture screen", n: "Elbow extension test", t: "Elbow fracture screening (rule out)", p: "Patient sitting. Ask the patient to fully straighten (extend) both elbows and compare the two sides.", pos: "Inability to fully straighten the injured elbow suggests a joint fracture or effusion; full extension makes a fracture unlikely.", sn: "≈97", sp: "≈69", tier: 1, pearl: "A quick, validated screen in acute elbow trauma — the elbow equivalent of the Ottawa ankle rules — where the high sensitivity makes a negative test useful for avoiding unnecessary X-rays." },
  { id: "el13", r: "el", cat: "Nerve", n: "Scratch collapse test (cubital tunnel)", t: "Ulnar nerve entrapment at the elbow", p: "Patient sitting, elbows tucked at the sides bent 90°. Ask the patient to resist as you push both forearms inward (testing shoulder external rotation). Then lightly scratch the skin over the cubital tunnel (behind the inner elbow) and immediately re-test that resistance.", pos: "A brief give-way (collapse) of the resistance on the affected side right after the scratch.", tier: 3, pearl: "A modern complement to Tinel's / elbow-flexion testing for cubital tunnel syndrome — evidence is still evolving but it's increasingly taught alongside the classic provocation tests." },

  /* ---- WRIST ---- researched against Physiopedia's Wrist special-tests
   * category (physio-pedia.com/Category:Wrist_-_Special_Tests). */
  { id: "wr1", r: "wr", cat: "Carpal tunnel", n: "Phalen test", t: "Carpal tunnel syndrome (median nerve)", p: "Patient sitting. Ask the patient to press the backs of both hands together with the wrists fully bent down (flexed) and the fingers pointing to the floor, and hold for up to 60 seconds.", pos: "Pins-and-needles in the median-nerve area of the hand (thumb, index, middle, and thumb-side half of the ring finger).", sn: "51–68", sp: "73–76", tier: 2 },
  { id: "wr2", r: "wr", cat: "Carpal tunnel", n: "Tinel test at the wrist", t: "Carpal tunnel syndrome", p: "Patient sitting, forearm palm-up and wrist supported in slight extension. Lightly tap with a finger or reflex hammer over the median nerve at the front of the wrist (the carpal tunnel).", pos: "Tingling shooting into the median-nerve fingers (thumb, index, middle).", sn: "23–60", sp: "64–87", tier: 2 },
  { id: "wr3", r: "wr", cat: "Carpal tunnel", n: "Carpal compression (Durkan) test", t: "Carpal tunnel syndrome", p: "Patient sitting, forearm palm-up. Press both of your thumbs steadily over the carpal tunnel at the base of the palm and hold for about 30 seconds.", pos: "Pins-and-needles in the median-nerve fingers.", sn: "64–83", sp: "≈83", tier: 2, pearl: "Often the most accurate single provocation test for carpal tunnel syndrome." },
  { id: "wr4", r: "wr", cat: "Tendon", n: "Finkelstein / Eichhoff test", t: "De Quervain tenosynovitis", p: "Patient sitting. Ask the patient to tuck the thumb into the palm and close the fingers over it in a fist, then bend the wrist toward the little-finger side (ulnar deviation) — the Eichhoff version; alternatively the examiner holds the thumb and deviates the wrist (Finkelstein).", pos: "Sharp pain over the thumb-side of the wrist (first dorsal compartment, at the radial styloid).", tier: 2 },
  { id: "wr5", r: "wr", cat: "TFCC / DRUJ", n: "TFCC load test (ulnar grind)", t: "Triangular fibrocartilage complex (TFCC)", p: "Patient sitting, forearm supported. Bend the wrist toward the little-finger side (ulnar deviation), push down the line of the forearm into the wrist (axial load), and rotate the forearm back and forth.", pos: "Pain on the little-finger (ulnar) side of the wrist and/or a click.", tier: 3 },
  { id: "wr6", r: "wr", cat: "TFCC / DRUJ", n: "Piano-key / distal radioulnar joint (DRUJ) ballottement", t: "Distal radioulnar joint instability", p: "Patient sitting, forearm palm-down (pronated). Steady the lower radius with one hand and, with the other, push the head of the ulna (the bump on the little-finger side of the wrist) up and down (dorsal-to-palmar), comparing with the other side.", pos: "More movement (translation) than the other side, with or without pain — the ulna springs back like a piano key.", tier: 3 },
  { id: "wr7", r: "wr", cat: "Carpal instability", n: "Watson scaphoid shift test", t: "Scapholunate instability", p: "Patient sitting. Press your thumb on the scaphoid tubercle (front of the wrist, thumb-side) while your fingers support the back of the wrist. Keeping that pressure, move the wrist from the little-finger side (ulnar deviation) toward the thumb side (radial deviation).", pos: "A painful clunk as the scaphoid shifts out of place and back.", tier: 3 },
  { id: "wr8", r: "wr", cat: "Fracture screen", n: "Anatomical snuffbox tenderness", t: "Scaphoid fracture", p: "Patient sitting. Palpate the anatomical snuffbox (the hollow at the base of the thumb on the back of the wrist); also press the scaphoid tubercle on the palm side and push the straight thumb down toward the wrist (longitudinal compression).", pos: "Focal tenderness — treat as suspicious and image even if an early X-ray looks normal.", sn: "≈90", sp: "40", tier: 2, pearl: "Sensitive but not specific — a non-tender snuffbox largely rules OUT a scaphoid fracture." },
  { id: "wr10", r: "wr", cat: "TFCC / DRUJ", n: "Supination lift test", t: "Triangular fibrocartilage complex (TFCC) injury", p: "Patient sitting with the forearm turned fully palm-up (supinated), palm flat under a fixed table (or pushing up from the chair seat). Ask the patient to push upward against the resistance.", pos: "Pain on the little-finger (ulnar) side of the wrist that reproduces the symptoms, or an inability to lift.", tier: 2, pearl: "A load-bearing functional test, not just a passive stress — often positive when the passive TFCC tests are equivocal." },
  { id: "wr11", r: "wr", cat: "Vascular", n: "Allen test", t: "Radial / ulnar artery patency", p: "Patient sitting. Press firmly over both the radial and ulnar arteries at the wrist. Ask the patient to clench and open the fist several times to drain the blood, then hold it open (pale palm). Release ONE artery and watch how quickly the hand flushes pink; repeat for the other artery.", pos: "Slow or absent flushing when an artery is released means that artery (or the palmar arch it feeds) is not supplying the hand well.", tier: 1, pearl: "Essential before radial-artery procedures (arterial line, graft harvest) to confirm the ulnar artery can supply the hand." },
  { id: "wr12", r: "wr", cat: "Tendon", n: "Wringing test", t: "Lateral epicondylalgia (provoked at the wrist)", p: "Patient sitting. Ask the patient to wring out a towel or cloth — gripping with both hands and twisting in opposite directions (repeatedly turning the forearms palm-up and palm-down).", pos: "Reproduction of pain at the outer elbow during the wringing.", tier: 3, pearl: "Provokes lateral epicondylalgia through a functional movement rather than isolated resisted extension — useful when Cozen's/Mill's are equivocal." },
  { id: "wr13", r: "wr", cat: "Tendon", n: "WHAT test (wrist hyperflexion and abduction of the thumb)", t: "De Quervain tenosynovitis", p: "Patient sitting. Ask the patient to bend the wrist fully down (flexion) while carrying the thumb out to the side away from the palm (abduction), and hold.", pos: "Pain over the thumb-side of the wrist (first dorsal compartment), similar to Finkelstein's.", tier: 3, pearl: "An alternative to Finkelstein's for patients in whom the classic thumb-in-fist position is itself too painful to tolerate." },

  /* ---- HAND ---- researched against Physiopedia's Hand special-tests
   * category (physio-pedia.com/Category:Hand_-_Special_Tests, 14 pages) —
   * re-checked directly, not assumed: all 10 of that category's genuinely
   * hand-specific tests are already covered below (hn1-hn10). The other 4
   * pages (De Quervain's Tenosynovitis, Finkelstein Test, The Allen Test,
   * Tinel's Test) describe tests already covered under the Wrist region
   * (wr4/wr13 Finkelstein-Eichhoff/WHAT test, wr11 Allen test, wr2 Tinel at
   * the wrist) — not duplicated here, so the same test doesn't appear in
   * two menus. This rig has no finger/thumb DOFs, so most hand-specific
   * tests below are reference-only (no 3D pose) — see the comments by
   * SPECIAL_TEST_CUSTOM_POSES. */
  { id: "hn1", r: "hn", cat: "Thumb CMC", n: "Carpometacarpal (CMC) grind test", t: "Thumb-base (first carpometacarpal, CMC) osteoarthritis", p: "Patient sitting. Steady the wrist with one hand. With the other, grip the thumb's long bone (metacarpal), push it down into the trapezium at the thumb base (axial load), and rotate it back and forth (grind).", pos: "Pain, with or without grating (crepitus), at the thumb base.", sn: "53–66", sp: "74–93", tier: 2 },
  { id: "hn2", r: "hn", cat: "Hypermobility", n: "Beighton score", t: "Generalised joint hypermobility", p: "A 9-point whole-body screen (patient positioned comfortably for each item): passively bend the little-finger knuckle (metacarpophalangeal, MCP) back beyond 90° (1 point each hand), bring the thumb back to touch the forearm (1 point each hand), hyperextend the elbow beyond 10° (1 point each side), hyperextend the knee beyond 10° (1 point each side), and — standing — bend forward with knees straight and lay the palms flat on the floor (1 point).", pos: "A total of about 4–6 out of 9 or more (the cut-off is age-dependent) suggests generalised joint hypermobility.", tier: 2, pearl: "A whole-body screen scored at the hand, elbow, knee, and spine — not a single-joint provocation test." },
  { id: "hn3", r: "hn", cat: "Finger / PIP", n: "Bunnell-Littler test", t: "Intrinsic-muscle tightness vs joint-capsule tightness at the proximal interphalangeal (PIP) joint", p: "Patient sitting. First hold the knuckle (metacarpophalangeal, MCP) straight (extended) and try to bend the middle finger joint (proximal interphalangeal, PIP). Then let the knuckle bend (flex) and again try to bend the PIP.", pos: "If the PIP bends only when the knuckle is bent (not when it is straight), the intrinsic hand muscles are tight. If the PIP is stiff in both positions, the joint capsule itself is tight.", tier: 2 },
  { id: "hn4", r: "hn", cat: "Tendon", n: "Elson test", t: "Central-slip (extensor tendon) rupture at the proximal interphalangeal (PIP) joint", p: "Patient sitting. Bend the middle finger joint (proximal interphalangeal, PIP) to 90° over the edge of a table. Ask the patient to straighten (extend) that joint against your resistance while you also feel the fingertip joint.", pos: "Weak PIP-straightening force together with a stiff, held-straight fingertip joint (distal interphalangeal, DIP) indicates a central-slip rupture — the side bands slip and stiffen the fingertip.", sn: "≈100", tier: 1, pearl: "Detects an early boutonnière deformity before it becomes visibly obvious — worth doing after any injury to the back of the PIP joint." },
  { id: "hn5", r: "hn", cat: "Measurement", n: "Figure-of-eight hand measurement", t: "Hand / finger swelling quantification", p: "Patient sitting, hand resting palm-down. Lay a tape measure in a figure-8 around the wrist and across the back and palm of the hand, looping around the thumb and little finger, and record the distance.", pos: "Not a provocation test — a larger figure-8 measurement than the other side quantifies hand swelling.", tier: 2, pearl: "A measurement technique, not a provocation test — good for objective before/after comparison during rehab." },
  { id: "hn6", r: "hn", cat: "Carpal tunnel", n: "Flick sign", t: "Carpal tunnel syndrome (screening question)", p: "Patient sitting. Ask the patient whether flicking or shaking the hand (as if shaking down a thermometer) relieves the night-time numbness and tingling.", pos: "A 'yes' — flicking/shaking the hand eases the symptoms — is suggestive of carpal tunnel syndrome.", sn: "≈93", sp: "≈96", tier: 2, pearl: "A history question phrased as a test — high reported accuracy, but it relies on patient recall rather than direct provocation." },
  { id: "hn7", r: "hn", cat: "Functional", n: "Sollerman hand function test", t: "Overall grip / hand-function capacity", p: "Patient sitting at a table. A standardised 20-item battery of everyday grip tasks (for example turning a key, picking up coins, doing up a button, writing), each scored 0–4 for how well it is done.", pos: "A lower total score quantifies greater functional hand impairment — used for tracking outcomes, not for diagnosis.", tier: 2, pearl: "An outcome-measure battery, not a single provocation test — most useful for tracking change over time (e.g. after tendon repair or nerve injury)." },
  { id: "hn8", r: "hn", cat: "Sensation", n: "Weber two-point discrimination", t: "Peripheral-nerve sensory function / recovery", p: "Patient sitting, eyes closed, hand supported palm-up. Touch the fingertip pad with either one or two blunt points at once, starting far apart and moving progressively closer. Find the smallest gap the patient can still tell apart as two separate points.", pos: "A gap greater than about 6 mm (static) — or 5 mm with the points moving — indicates impaired sensory nerve function.", tier: 2, pearl: "Tracks nerve regrowth after repair — normal static two-point discrimination is roughly 2–5 mm depending on the finger." },
  { id: "hn9", r: "hn", cat: "Vascular / autonomic", n: "Trousseau's sign", t: "Latent low blood calcium (neuromuscular irritability)", p: "Patient sitting or supine. Put a blood-pressure cuff on the upper arm and inflate it above the patient's systolic pressure, holding it there for up to 3 minutes.", pos: "The hand cramps into a characteristic spasm — wrist and knuckles bent, fingers straight, thumb drawn across the palm (the 'obstetrician's hand').", sn: "66", sp: "≈98", tier: 2, pearl: "More specific than Chvostek's sign for low blood calcium, but slower and mildly uncomfortable." },
  { id: "hn10", r: "hn", cat: "Sensation", n: "Wrinkling test (O'Riain)", t: "Digital nerve integrity (denervation screening)", p: "Patient seated. Immerse the fingertips in warm water for about 5–30 minutes and observe whether the finger pads wrinkle as they normally would.", pos: "Absence of the normal skin-wrinkling response suggests the digital/sympathetic nerve supply is interrupted.", tier: 3, pearl: "Useful in young children or uncooperative patients where sensory testing by report isn't reliable." },

  /* ---- HIP ---- */
  { id: "hip1", r: "hip", cat: "FAI / labrum", n: "FADIR test (flexion, adduction, internal rotation)", t: "Femoroacetabular impingement (FAI) / anterosuperior labral tear", p: "Patient supine. Passively flex the hip to 90° (knee bent), then bring the knee across the midline (adduction) and rotate the leg outward at the foot so the hip rotates inward (internal rotation).", pos: "Reproduction of the familiar deep groin pain.", sn: "94–99", sp: "5–25", tier: 1, pearl: "Very sensitive — a negative test makes intra-articular impingement/labral pathology unlikely." },
  { id: "hip2", r: "hip", cat: "FAI / labrum", n: "FABER / Patrick test (flexion, abduction, external rotation)", t: "Hip / sacroiliac joint (SIJ) / labral pathology", p: "Patient supine. Place the tested leg in a figure-4: heel on the opposite knee, hip flexed, abducted, and rotated outward. Steady the opposite front pelvic bone (anterior superior iliac spine, ASIS) and apply gentle downward overpressure to the bent knee. Note how far the knee sits above the table.", pos: "Groin pain suggests a hip/labral source; pain felt behind suggests the sacroiliac joint.", sn: "41–88", sp: "18–100", tier: 2 },
  { id: "hip3", r: "hip", cat: "FAI / labrum", n: "Scour / quadrant test", t: "Labral tear, cartilage lesion, osteoarthritis (OA)", p: "Patient supine. Flex the hip and knee to 90°. Push down the line of the thigh into the socket (axial compression) while sweeping the knee through arcs — combining internal and external rotation with adduction and abduction.", pos: "Pain, clicking, or grinding felt through the arc.", tier: 3 },
  { id: "hip4", r: "hip", cat: "FAI / labrum", n: "Anterior labral test (McCarthy)", t: "Anterior labral tear", p: "Patient supine. Start with the hip flexed, abducted, and rotated outward (external rotation), then sweep it into extension, adduction, and inward rotation (internal rotation) in one smooth arc.", pos: "Reproduction of pain or a click during the arc.", tier: 3 },
  { id: "hip5", r: "hip", cat: "Lateral / GTPS", n: "Resisted external derotation / single-leg stance", t: "Gluteal tendinopathy (greater trochanteric pain syndrome, GTPS)", p: "Patient supine with the hip and knee flexed and the leg rotated outward; ask the patient to rotate it back to neutral against your resistance (resisted derotation). Alternatively, ask the patient to stand on the affected leg alone for 30 seconds.", pos: "Reproduction of pain over the outer hip (the greater trochanter, the bony point on the side of the hip).", sn: "≈88", sp: "≈97", tier: 2 },
  { id: "hip6", r: "hip", cat: "Lateral / GTPS", n: "Ober test", t: "Iliotibial band (ITB) / tensor fasciae latae (TFL) tightness", p: "Patient side-lying with the tested leg uppermost. Steady the pelvis, take the top leg out to the side and slightly back (abduction and extension), then let it lower toward the table (adduction). Keep the knee straight to bias the iliotibial band, or bend the knee to 90° to bias the tensor fasciae latae.", pos: "The leg fails to lower past horizontal (stays 'stuck up').", tier: 3 },
  { id: "hip7", r: "hip", cat: "Lateral / GTPS", n: "Trendelenburg test", t: "Gluteus medius weakness / hip abductor mechanism", p: "Patient standing. Ask the patient to stand on the affected leg alone (lifting the other foot) for about 30 seconds while you watch the level of the pelvis from behind.", pos: "The pelvis on the LIFTED-leg side drops down instead of staying level.", sn: "23–73", sp: "77–94", tier: 2 },
  { id: "hip8", r: "hip", cat: "Muscle length", n: "Thomas test", t: "Hip-flexor / rectus femoris tightness", p: "Patient sitting at the edge of the table, then guided to lie back while hugging BOTH knees to the chest. Ask the patient to hold one knee to the chest and lower the OTHER leg toward the table; watch that thigh and knee.", pos: "The lowered thigh stays lifted off the table (tight iliopsoas), or the knee straightens out (tight rectus femoris).", tier: 2 },
  { id: "hip9", r: "hip", cat: "Muscle length", n: "Ely test", t: "Rectus femoris tightness", p: "Patient prone. Passively bend (flex) the knee, bringing the heel toward the buttock, and watch the buttock/pelvis on that side.", pos: "The hip on the same side flexes so the buttock lifts off the table.", sn: "56–59", sp: "64–85", tier: 3 },
  { id: "hip10", r: "hip", cat: "Deep gluteal / sciatic", n: "FAIR test / seated piriformis stretch", t: "Deep gluteal syndrome (piriformis)", p: "Patient side-lying with the tested hip up. Flex the hip, bring the knee across the midline (adduction), and rotate the hip inward (internal rotation) — the FAIR position (flexion, adduction, internal rotation). Alternatively, with the patient seated, straighten the knee and passively rotate the hip inward to stretch the piriformis.", pos: "Reproduction of buttock pain, with or without pain radiating down the leg (sciatic).", sn: "≈52–88", sp: "≈80–92", tier: 3 },
  { id: "hip11", r: "hip", cat: "Deep gluteal / sciatic", n: "Active piriformis test", t: "Deep gluteal syndrome", p: "Patient side-lying with the tested hip up. Palpate over the piriformis (mid-buttock). Ask the patient to press the heels together and push the top knee up and back (active hip abduction with external rotation) against your resistance.", pos: "Reproduction of buttock pain.", sn: "78", sp: "80", tier: 3 },
  { id: "hip12", r: "hip", cat: "Intra vs extra-articular", n: "Stinchfield test (resisted straight leg raise)", t: "Intra- vs extra-articular hip pain", p: "Patient supine. Ask the patient to raise the straight leg to about 30° and hold it there while you push down on the thigh (resisted straight leg raise).", pos: "Groin or front-of-hip pain suggests an intra-articular hip source.", tier: 3 },
  { id: "hip13", r: "hip", cat: "Intra vs extra-articular", n: "Log roll test", t: "Intra-articular hip pathology", p: "Patient supine with the leg straight and relaxed. Passively roll the whole leg inward (internal rotation) and outward (external rotation), like rolling a log, comparing sides.", pos: "Pain, a click, or clearly different external-rotation laxity — the most hip-specific passive test.", tier: 2 },
  { id: "hip14", r: "hip", cat: "Red flags", n: "Fulcrum test", t: "Femoral shaft stress fracture", p: "Patient sitting with the legs hanging off the table. Place your forearm crosswise under the thigh as a fulcrum, then press gently down on the knee, moving the fulcrum along the thigh.", pos: "Sharp localised pain or apprehension as the fulcrum reaches the fracture site.", tier: 3, pearl: "Consider in runners and military recruits with load-related thigh pain — image if suspected." },
  { id: "hip15", r: "hip", cat: "Red flags", n: "Patellar-pubic percussion", t: "Occult hip / femoral neck fracture", p: "Patient supine, legs straight. Place a stethoscope over the pubic symphysis (front midline of the pelvis) and lightly tap (percuss) each kneecap in turn, comparing the transmitted sound.", pos: "A duller, quieter sound on the injured side.", sn: "≈95", sp: "≈86", tier: 2, pearl: "A useful bedside screen for an occult fracture when the X-ray is equivocal." },

  /* ---- KNEE ---- */
  { id: "kn1", r: "kn", cat: "ACL", n: "Lachman test", t: "Anterior cruciate ligament (ACL) integrity", p: "Patient supine, knee bent 20–30° and relaxed. Steady the lower thigh with one hand; with the other, grasp the upper shin (tibia) and pull it forward (toward the ceiling).", pos: "More forward glide than the other side, with a soft or absent stopping point (endpoint).", sn: "81–87", sp: "≈97", tier: 1, pearl: "The most accurate single anterior cruciate ligament test — judge the quality of the endpoint, not just the distance." },
  { id: "kn2", r: "kn", cat: "ACL", n: "Anterior drawer test", t: "Anterior cruciate ligament (ACL) integrity", p: "Patient supine, hip bent 45° and knee bent 90°, foot flat on the table. Sit lightly on the foot to fix it, grasp the upper shin with both hands, and pull it forward.", pos: "More forward glide of the shin than the other side.", sn: "18–92", sp: "78–98", tier: 2 },
  { id: "kn3", r: "kn", cat: "ACL", n: "Pivot shift test", t: "Anterolateral rotatory instability (anterior cruciate ligament, ACL)", p: "Patient supine, leg relaxed and straight. Hold the ankle/lower leg and rotate the shin inward (internal rotation), apply an inward-pointing (valgus) force at the knee, then slowly bend the knee from full extension.", pos: "A visible/palpable clunk around 30–40° as the outer shin plateau slides back into place.", sn: "18–48", sp: "97–99", tier: 1, pearl: "Very specific and matches functional instability — but hard to bring out when the patient guards." },
  { id: "kn4", r: "kn", cat: "ACL", n: "Lever sign (Lelli)", t: "Anterior cruciate ligament (ACL) integrity", p: "Patient supine, leg straight and relaxed. Make a fist and place it under the upper calf so the knee is slightly raised, then press down firmly on the thigh just above the kneecap.", pos: "With an intact anterior cruciate ligament the heel lifts off the table; if the heel stays down, the test is positive (suggesting a tear).", tier: 2 },
  { id: "kn5", r: "kn", cat: "PCL", n: "Posterior drawer test", t: "Posterior cruciate ligament (PCL) integrity", p: "Patient supine, hip bent 45° and knee bent 90°, foot flat. Fix the foot lightly, grasp the upper shin with both hands, and push it backward (away from you).", pos: "More backward glide of the shin than the other side, and/or a soft endpoint.", sn: "22–100", sp: "≈99", tier: 1 },
  { id: "kn6", r: "kn", cat: "PCL", n: "Posterior sag sign (Godfrey)", t: "Posterior cruciate ligament (PCL) insufficiency", p: "Patient supine. Support both legs with the hips and knees bent to 90° (hold the heels/ankles), then look at the shins from the side and compare their outlines.", pos: "The affected shin sags backward — the normal 'step' at the front of the knee is lost.", tier: 2 },
  { id: "kn7", r: "kn", cat: "Collaterals", n: "Valgus stress test at 30°", t: "Medial collateral ligament (MCL) integrity", p: "Patient supine, knee bent about 30°. Steady the outer thigh/lower leg, tuck the ankle against you, and push the knee inward (a valgus force) to open the inner side of the joint. Repeat with the knee fully straight.", pos: "Inner-knee pain and/or more opening than the other side. Opening even in full extension implies a more extensive injury.", tier: 2 },
  { id: "kn8", r: "kn", cat: "Collaterals", n: "Varus stress test at 30°", t: "Lateral collateral ligament (LCL) integrity", p: "Patient supine, knee bent about 30°. Steady the inner thigh, hold the ankle, and push the knee outward (a varus force) to open the outer side of the joint.", pos: "Outer-knee pain and/or more opening than the other side.", tier: 2 },
  { id: "kn9", r: "kn", cat: "Meniscus", n: "Joint-line tenderness", t: "Meniscal tear", p: "Patient supine with the knee bent about 90°, foot flat. Press along the joint line on both the inner (medial) and outer (lateral) sides of the knee.", pos: "Familiar focal pain right on the joint line.", sn: "63–83", sp: "≈77", tier: 2 },
  { id: "kn10", r: "kn", cat: "Meniscus", n: "McMurray test", t: "Meniscal tear", p: "Patient supine. Fully bend the knee. Then straighten it while rotating the shin — turn the shin outward (external rotation) to bias the medial meniscus, or inward (internal rotation) to bias the lateral meniscus — with a hand on the joint line.", pos: "A palpable or audible click/clunk together with joint-line pain.", sn: "16–70", sp: "59–98", tier: 2, pearl: "A true thud is specific; pain alone is weak." },
  { id: "kn11", r: "kn", cat: "Meniscus", n: "Thessaly test (20°)", t: "Meniscal tear (loaded)", p: "Patient standing on the affected leg with the knee bent about 20° (hold the patient's hands for balance). Ask the patient to twist the body and knee inward and outward a few times.", pos: "Joint-line discomfort, catching, or locking.", sn: "64–75", sp: "53–96", tier: 2 },
  { id: "kn12", r: "kn", cat: "Meniscus", n: "Apley grind test", t: "Meniscal tear", p: "Patient prone, knee bent to 90°. Steady the thigh (a knee on the back of the thigh helps). Push straight down through the heel into the knee while rotating the shin (compression), then pull up on the shin while rotating (distraction), and compare.", pos: "Pain with compression but not with distraction suggests a meniscus rather than a ligament problem.", tier: 3 },
  { id: "kn13", r: "kn", cat: "Effusion", n: "Sweep / bulge test", t: "Small–moderate joint effusion", p: "Patient supine, knee straight and relaxed. Stroke your hand upward along the inner side of the knee to sweep fluid into the pouch above the kneecap, then stroke down the outer side and watch the inner side.", pos: "A small wave/bulge of fluid appears on the inner (medial) side.", tier: 2 },
  { id: "kn14", r: "kn", cat: "Effusion", n: "Patellar tap (ballottement)", t: "Larger joint effusion", p: "Patient supine, knee straight. With one hand, squeeze the pouch just above the kneecap to push fluid under the kneecap. With a fingertip of the other hand, tap the kneecap straight down onto the thigh bone.", pos: "The kneecap feels like it is floating and taps down onto the bone with a distinct click.", tier: 2 },
  { id: "kn15", r: "kn", cat: "Patellofemoral", n: "Patellar apprehension test", t: "Lateral patellar instability", p: "Patient supine, knee slightly bent (a small towel under the knee) and relaxed. Use your thumbs to slowly push the kneecap outward (laterally), watching the patient's reaction.", pos: "Guarding, or apprehension that the kneecap will dislocate.", tier: 2 },
  { id: "kn16", r: "kn", cat: "Patellofemoral", n: "Patellar grind (Clarke) test", t: "Patellofemoral pain / cartilage irritation", p: "Patient supine, knee straight and relaxed. Press the kneecap gently downward and toward the foot (distally), then ask the patient to tighten the thigh (quadriceps) muscle.", pos: "Pain at the front of the knee — but note the high false-positive rate.", tier: 3, pearl: "Often uncomfortable even in healthy knees — low specificity, so interpret cautiously." },
  { id: "kn17", r: "kn", cat: "Lateral / ITB", n: "Noble compression test", t: "Iliotibial band (ITB) syndrome", p: "Patient supine. Press your thumb over the outer knee bump (lateral femoral epicondyle) while you passively bend and straighten the knee.", pos: "Pain under your thumb at the outer knee near 30° of flexion.", tier: 3 },
  { id: "kn18", r: "kn", cat: "PLC / rotational", n: "Dial test (30° & 90°)", t: "Posterolateral corner (PLC) ± posterior cruciate ligament (PCL)", p: "Patient prone (or supine). Hold both feet and rotate the shins outward (external rotation), comparing the two sides first with the knees bent 30°, then with them bent 90°. Read the thigh-foot angle.", pos: "More than 10° extra external rotation on the affected side at 30° ONLY = posterolateral corner injury; extra rotation at BOTH 30° and 90° = combined posterior cruciate ligament + posterolateral corner injury.", tier: 2 },
  { id: "kn19", r: "kn", cat: "Meniscus", n: "Ege's test (weight-bearing McMurray)", t: "Meniscal tear (loaded)", p: "Patient standing, feet about 30–40 cm apart. To test the medial meniscus, turn the feet fully outward (external rotation) and slowly squat then stand; to test the lateral meniscus, turn the feet fully inward (internal rotation) and squat/stand.", pos: "Joint-line pain and/or a click, typically around 90° of knee bend.", sn: "64–67", sp: "81–90", tier: 2, pearl: "More specific than McMurray's for medial tears — but not everyone can bear enough weight to do it." },
  { id: "kn20", r: "kn", cat: "ACL", n: "Slocum's test", t: "Anterolateral / anteromedial rotary instability", p: "Patient supine, knee bent 90°, foot flat and fixed (sit lightly on it). Perform an anterior drawer (pull the shin forward) with the foot/shin turned inward 30° to test anterolateral instability, then repeat with the foot turned outward 15° to test anteromedial instability.", pos: "More forward glide with the rotation than on the plain straight-ahead anterior drawer.", tier: 2, pearl: "A rotated version of the anterior drawer — the 90° knee bend relaxes the hamstrings." },
  { id: "kn21", r: "kn", cat: "Meniscus", n: "Steinman test", t: "Meniscal tear (vs ligament / bone spur)", p: "Patient sitting or supine, knee bent to 90°. Part 1: quickly rotate the shin inward and outward and note where pain is felt. Part 2: press on the tender joint-line spot while bending and straightening the knee, tracking whether the tender point moves.", pos: "Pain with the rotation reproducing the click; and the tenderness moves backward as the knee bends and forward as it straightens.", sn: "≈96.5", sp: "≈87", tier: 2, pearl: "The moving-tenderness part (part 2) helps tell meniscal pain from a fixed ligament or bone-spur tender point." },
  { id: "kn22", r: "kn", cat: "Osteochondritis", n: "Wilson's test", t: "Osteochondritis dissecans (inner thigh-bone condyle)", p: "Patient sitting with the knee bent 90°. Rotate the shin inward (internal rotation) and hold it there, then ask the patient to slowly straighten (extend) the knee.", pos: "Pain about 30° short of full straightening that goes away when you rotate the shin outward.", tier: 3, pearl: "No validated accuracy data — use as a low-cost screen, not a rule-out." },
  { id: "kn23", r: "kn", cat: "PCL", n: "Muller's quadriceps-active test", t: "Posterior cruciate ligament (PCL) integrity / posterior tibial sag", p: "Patient supine in the posterior-drawer position (hip bent 45°, knee bent 90°, foot flat and fixed). Ask the patient to gently tighten the thigh (quadriceps) as if sliding the foot down the table.", pos: "A backward-sagged shin visibly slides forward as the quadriceps fires.", tier: 2, pearl: "Useful when a torn posterior cruciate ligament makes the posterior drawer's starting point ambiguous — the active contraction resets the reference." },
  { id: "kn24", r: "kn", cat: "Muscle length", n: "Passive knee extension test", t: "Hamstring flexibility / tightness", p: "Patient supine. Flex the hip to 90° (thigh vertical) and hold it there, then passively straighten (extend) the knee until you feel the first firm hamstring resistance; measure the angle with a goniometer.", pos: "Report the popliteal angle (180° minus the knee-extension angle); a mean of about 75° is normal, and a larger angle suggests hamstring tightness.", tier: 3, pearl: "Used as an anterior cruciate ligament return-to-play milestone between rehab phases, not only as a flexibility check." },
  { id: "kn25", r: "kn", cat: "Lateral / ITB", n: "Renne test", t: "Iliotibial band (ITB) friction syndrome", p: "Patient standing on the involved leg. Press a thumb over the outer knee bump (lateral femoral epicondyle) while the patient does a single-leg squat to 60–90° and back up; repeat with firmer thumb pressure.", pos: "Grating, snapping, or pain at the outer knee bump, most provocative around 20–30° of knee bend.", tier: 3, pearl: "Pairs with Noble's test for outer-knee pain in runners/cyclists — Renne adds the weight-bearing squat." },
  { id: "kn26", r: "kn", cat: "Patellofemoral", n: "Moving patellar apprehension test", t: "Lateral patellar instability", p: "Patient supine. Hold the kneecap pushed outward (laterally) and, keeping that push, bend the knee from straight to 90° and back. Then repeat while holding the kneecap pushed inward (medially).", pos: "Apprehension during the outward-push pass that goes away during the inward-push pass.", sn: "100", sp: "≈88", tier: 1, pearl: "More sensitive than the static apprehension sign — the inward-push pass confirms it's instability, not just guarding." },

  /* ---- ANKLE ---- researched against Physiopedia's Ankle special-tests
   * category (physio-pedia.com/Category:Ankle_-_Special_Tests). ft1-ft9's
   * ids are kept as-is (they predate the Ankle/Foot split and are
   * referenced elsewhere) even though the region below is now "an", not
   * "ft" — only the region field changed for the ankle-side tests. */
  { id: "ft1", r: "an", cat: "Lateral ligament", n: "Anterior drawer test (ankle)", t: "Anterior talofibular ligament (ATFL) integrity", p: "Patient sitting or supine with the foot in slight plantarflexion (toes pointed down a little). Steady the front of the lower shin (tibia) with one hand; cup the heel (calcaneus) in the other and draw the whole foot forward.", pos: "More forward glide than the other side, sometimes with a dimple of skin sucking in at the front-outer ankle.", sn: "74–96", sp: "≈84", tier: 2, pearl: "Most useful about 5 days after injury, once the acute guarding settles." },
  { id: "ft2", r: "an", cat: "Lateral ligament", n: "Talar tilt (inversion) test", t: "Anterior talofibular ligament (ATFL) / calcaneofibular ligament (CFL) integrity", p: "Patient sitting, ankle in neutral. Steady the lower shin, cup the heel and talus, and tilt the heel/talus inward as one unit (inversion), comparing with the other side.", pos: "More inward tilt / gapping than the other side.", tier: 3 },
  { id: "ft3", r: "an", cat: "Syndesmosis", n: "Squeeze test", t: "High ankle sprain (syndesmosis)", p: "Patient sitting. Wrap both hands around the mid-calf and squeeze the two shin bones (tibia and fibula) together, then release.", pos: "Pain referred down to the front of the ankle (the syndesmosis), not just under your hands.", sn: "26–30", sp: "88–93", tier: 2 },
  { id: "ft4", r: "an", cat: "Syndesmosis", n: "External rotation stress test", t: "Syndesmosis injury", p: "Patient sitting with the knee bent 90° and the ankle in neutral. Steady the lower shin, then rotate the foot outward (external rotation).", pos: "Pain over the front-outer ankle (the syndesmosis).", sn: "≈20", sp: "≈85", tier: 2, pearl: "Also listed under Foot — same test, same position; syndesmosis symptoms can present at either level." },
  { id: "ft5", r: "an", cat: "Fracture rule", n: "Ottawa ankle rules", t: "Need for an ankle/foot X-ray", p: "A decision rule, not a maneuver. Check for bony tenderness at four sites — the back edge/tip of each ankle bone (malleolus), the navicular (inner midfoot), and the base of the 5th metatarsal (outer midfoot) — and whether the patient can take 4 steps.", pos: "Any tender site, or inability to walk 4 steps → X-ray. Nearly 100% sensitive for ruling out a fracture.", sn: "≈99", sp: "≈40", tier: 1, pearl: "A validated clinical decision rule — safely reduces unnecessary X-rays." },
  { id: "ft6", r: "an", cat: "Achilles", n: "Thompson test (calf squeeze)", t: "Achilles tendon rupture", p: "Patient prone with the foot hanging off the edge of the table. Squeeze the calf muscle (gastrocnemius) firmly and watch the foot.", pos: "The foot does NOT point down (plantarflex) when the calf is squeezed — indicating a complete rupture.", sn: "96–98", sp: "93–100", tier: 1 },
  { id: "ft9", r: "an", cat: "Midfoot", n: "Kleiger's test (external rotation) — deltoid bias", t: "Medial (deltoid ligament) / syndesmosis injury", p: "Patient sitting with the knee bent 90° and the leg hanging relaxed. Steady the lower shin, then rotate and turn the foot outward (external rotation and eversion).", pos: "Pain on the inner ankle (deltoid ligament) or the front-outer ankle (syndesmosis), or a sense of the outer shin bone (fibula) shifting.", tier: 3 },
  { id: "an1", r: "an", cat: "Impingement", n: "Impingement sign (ankle)", t: "Anterior ankle (bony / soft-tissue) impingement", p: "Patient sitting or supine. Passively push the ankle up (dorsiflexion) to its end-range and add gentle overpressure. A weight-bearing version has the patient lunge forward over the fixed foot.", pos: "Pain at the front joint-line of the ankle reproduced at, or just before, end-range dorsiflexion.", tier: 3 },
  { id: "an2", r: "an", cat: "Peroneal", n: "Peroneus longus & brevis tests", t: "Peroneal tendon pathology / instability", p: "Patient sitting. Palpate the peroneal tendons just behind the outer ankle bone (lateral malleolus). For brevis, resist the patient turning the sole outward (eversion); for longus, resist eversion combined with pointing the foot down (plantarflexion).", pos: "Pain, weakness, or a palpable/visible slip (subluxation) of the tendons over the outer ankle bone.", tier: 3 },
  { id: "an3", r: "an", cat: "Lateral ligament", n: "Prone anterior drawer test", t: "Anterior talofibular ligament (ATFL) integrity (prone variant)", p: "Patient prone with the knee bent about 90° (sole toward the ceiling). Steady the lower shin and draw the heel (calcaneus/talus) forward, comparing with the other side.", pos: "More forward glide than the other side.", tier: 3, pearl: "Tests the same ligament as the supine anterior drawer — the prone, knee-bent setup relaxes the calf muscle and can make excess glide easier to feel." },
  { id: "an4", r: "an", cat: "Achilles / gastroc-soleus", n: "Silfverskiöld test", t: "Isolated gastrocnemius tightness vs soleus/capsular tightness", p: "Patient sitting or supine. Measure how far the ankle passively bends up (dorsiflexion) first with the knee STRAIGHT, then with the knee BENT to 90°.", pos: "Clearly more dorsiflexion with the knee bent → isolated gastrocnemius (calf) tightness. Equally limited in both positions → soleus tightness or a bony/capsular block.", tier: 2, pearl: "Tells you WHICH structure to stretch — a gastrocnemius contracture responds to knee-straight calf stretching; a soleus/capsular limit won't." },
  { id: "an5", r: "an", cat: "Balance / functional", n: "Star excursion balance test", t: "Dynamic postural control / chronic ankle instability screening", p: "Patient stands on one leg at the centre of an 8-spoke grid taped on the floor. Ask the patient to reach the free foot as far as possible along each direction, lightly touch down, and return to standing — without losing balance or shifting the stance foot.", pos: "Shorter reach on one side than the other, or an inability to complete a direction, suggests a postural-control deficit.", tier: 2, pearl: "A multi-directional dynamic reach — not shown as a single static pose here; the reference info above still applies." },
  { id: "an6", r: "an", cat: "Measurement", n: "Figure-of-eight ankle swelling measurement", t: "Ankle joint swelling quantification", p: "Patient sitting, ankle relaxed. Lay a tape measure in a figure-8 around the ankle — across the front tendon (tibialis anterior), around the inner side, over the Achilles at the back, then around the outer side — and record the distance.", pos: "Not a provocation test — a larger figure-8 measurement than the other side quantifies swelling, useful for tracking recovery.", tier: 2, pearl: "A measurement technique, not a provocation test — good for objective before/after comparison during rehab." },

  /* ---- FOOT ---- researched against Physiopedia's Foot special-tests
   * category (physio-pedia.com/Category:Foot_-_Special_Tests). */
  { id: "ft7", r: "ft", cat: "Plantar heel", n: "Windlass test", t: "Plantar fasciopathy", p: "Patient sitting with the knee bent and foot resting, or standing on a step. Steady the foot, then passively pull the big toe upward (dorsiflex the big-toe joint, the first metatarsophalangeal / MTP joint) — this tightens the plantar fascia like a winch.", pos: "Reproduction of pain under the heel.", sn: "32", sp: "≈100", tier: 2, pearl: "Specific but insensitive — a positive test rules IN, but a negative one doesn't rule out." },
  { id: "ft8", r: "ft", cat: "Nerve / neuroma", n: "Mulder click", t: "Morton neuroma", p: "Patient sitting. With one hand, squeeze the foot across the metatarsal heads (side to side) to narrow the forefoot; with the other, press up into the web space between the toes.", pos: "A palpable/audible click together with reproduction of the forefoot pain.", tier: 3 },
  { id: "ft10", r: "ft", cat: "Hindfoot alignment", n: "Coleman block test", t: "Flexible vs fixed hindfoot varus (cavovarus foot)", p: "Patient standing with the heel and the outer border of the foot on a block (about 2–4 cm), letting the big-toe side of the foot (the first ray) hang off the inner edge unsupported. View the heel from behind.", pos: "The heel straightens to neutral → a flexible, forefoot-driven deformity. The heel stays tilted inward → a fixed, rearfoot deformity.", tier: 3, pearl: "Guides surgical planning — flexible deformities are often correctable with a first-ray procedure alone; fixed ones usually also need rearfoot correction." },
  { id: "ft11", r: "ft", cat: "Arch / midfoot", n: "Feiss line test", t: "Medial arch collapse / navicular drop", p: "Patient sitting, then standing. Mark the inner ankle bone (medial malleolus) and the big-toe joint (first metatarsophalangeal / MTP head), and picture a line joining them. Find the navicular bump (inner midfoot) and note where it sits relative to that line, first sitting and then in relaxed standing.", pos: "In standing the navicular drops well below the line (graded roughly by thirds) → flatfoot / arch collapse.", tier: 3 },
  { id: "ft12", r: "ft", cat: "Arch / midfoot", n: "Navicular drop test", t: "Dynamic midfoot pronation / arch collapse under load", p: "Patient sitting with the foot in a neutral (subtalar-neutral) position, not bearing weight. Mark and measure the height of the navicular bump from the floor. Then have the patient stand relaxed on both feet and measure the height again; the difference is the 'drop'.", pos: "A drop of more than 10 mm suggests excessive midfoot pronation.", tier: 3, pearl: "A measurement comparing non-weight-bearing vs weight-bearing navicular height — not itself a provocation maneuver." },
  { id: "ft13", r: "ft", cat: "Forefoot / neuroma", n: "Toe spread test", t: "Lateral plantar plate / intrinsic-muscle weakness screening", p: "Patient sitting or standing, foot flat. Ask the patient to actively fan out (spread) all the toes, or to hold them spread against your gentle resistance, and compare with the other foot.", pos: "Weak or absent toe-spreading on the affected side suggests weakness of the small foot muscles, or plantar-plate / nerve involvement.", tier: 3 },
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

  // Pelvis (pv1-pv6, part of the SI Joint & Pelvis region — see the TESTS
  // array's own comment above) — see SPECIAL_TEST_CUSTOM_POSES below for
  // the position-built ones (pv2, pv3, pv4, pv6); these two reuse an
  // existing preset outright.
  pv1: "prone", // Long dorsal SIJ ligament palpation — prone, purely a palpation test
  pv5: "forward_bow", // Standing flexion test — forward_bow's hip+lumbar+thoracic forward bend is exactly this test's setup

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

  // Hand — position-only reuses. See SPECIAL_TEST_CUSTOM_POSES's own HAND
  // comment for why hn2-hn4/hn6-hn10 stay unposed.
  hn1: "sitting", // CMC grind test — seated, purely an axial-load/rotation test at the thumb base
  hn5: "sitting", // Figure-of-eight hand measurement — seated, hand relaxed for the tape measurement, no distinctive angle
  hn9: "sitting", // Trousseau's sign — seated, arm at rest for the BP cuff; the carpal-spasm sign itself needs finger DOFs this rig doesn't have
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
  // ---- PELVIS (pv1-pv6, part of the SI Joint & Pelvis region) ----
  // researched against Physiopedia's Pelvis special-tests category
  // (physio-pedia.com/Category:Pelvis_-_Special_Tests). pv1 (palpation-only)
  // and pv5 (matches the existing "forward_bow" preset exactly) reuse an
  // existing preset outright — see TEST_POSE_MAP above.

  // Mennell's sign — prone, straight-leg passive hip extension (magnitude
  // not numerically specified by the source; used a typical exam value,
  // same as the hip region's own extension-stress convention).
  pv2: fromBase("prone", ["extend the right hip 15"]),

  // Yeoman's test — prone, knee flexed to 90° (source gives this angle
  // explicitly) THEN the hip passively extended — the flexed knee is what
  // visually distinguishes this from Mennell's straight-leg extension.
  pv3: fromBase("prone", ["flex the right knee 90", "extend the right hip 15"]),

  // Seated flexion test — built on "sitting" (hips already ~90° from that
  // base, "locking" the SIJ per the source's own rationale), adding the
  // forward-bend the test itself is named for (magnitude not specified,
  // typical exam values for lumbar+thoracic flexion while seated).
  pv4: fromBase("sitting", ["flex the lumbar spine 40", "flex the thoracic spine 15"]),

  // Stork test (Gillet test) — standing on the CONTRALATERAL (left) leg
  // while the tested (right) hip+knee flex up toward the chest, matching
  // every other test's "tested side is the right" convention. Reuses the
  // same stance-leg pivot mechanism as "single_leg_right" (which does the
  // mirror-image: stance right, swing left) — stanceLeg is overridden to
  // "left" on top of fromBase()'s own copied fields since no standalone
  // "single leg left" preset exists to build from directly.
  pv6: { ...fromBase("standing", ["flex the right hip 80", "flex the right knee 100"]), stanceLeg: "left" },

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

  // ---- ELBOW ---- researched against Physiopedia's Elbow special-tests
  // category (physio-pedia.com/Category:Elbow_-_Special_Tests). This rig has
  // elbow flexExt, forearm pronSup, and wrist flexExt/radUlnar — enough to
  // represent every elbow test's SETUP position; the resisted-contraction/
  // manual-force component every ligament/epicondylalgia test also involves
  // isn't itself representable (same disclosed limitation as the knee's
  // valgus/varus stress tests, kn7/kn8).

  // Cozen test — source: "elbow extended, forearm pronated"; the resisted
  // wrist-extension hold is shown as a moderate active extension angle
  // (magnitude not specified, typical exam value).
  el1: fromBase("sitting", ["extend the right elbow 5", "pronate the right forearm 70", "extend the right wrist 15"]),

  // Mill test — source explicitly gives all three components: "passively
  // pronate the forearm, flex the wrist and extend the elbow."
  el2: fromBase("sitting", ["pronate the right forearm 70", "flex the right wrist 40", "extend the right elbow 5"]),

  // Maudsley (resisted middle finger) — source: "elbow extended"; the
  // resisted middle-finger extension itself isn't representable (no
  // individual finger DOFs — see the Hand section's own disclosure below).
  el3: fromBase("sitting", ["extend the right elbow 5"]),

  // Medial epicondyle provocation (golfer's elbow) — source: "resist wrist
  // flexion and forearm pronation," shown as the mid-range position being
  // resisted (magnitude not specified, typical exam values).
  el4: fromBase("sitting", ["extend the right elbow 5", "pronate the right forearm 40", "flex the right wrist 30"]),

  // Valgus stress (UCL) — source gives the angle explicitly (~20-30°); used
  // the midpoint, same convention as kn1 Lachman's 20-30° window.
  el5: fromBase("sitting", ["flex the right elbow 25"]),

  // Moving valgus stress — a genuine dynamic maneuver, not a "get into
  // position" pose: source describes "full flexion + valgus, then rapidly
  // extend... maintaining valgus," and the test's OWN positive-finding text
  // (el6's "pos" field) gives the provocative arc as "~120°->70°" — reused
  // directly here as the dynamicEndAngles range (same pattern as FABER/
  // Watson/Silfverskiöld/wringing test's setup->maneuver Play preview).
  el6: {
    ...fromBase("sitting", ["flex the right elbow 120"]),
    dynamicEndAngles: { elbow_right: { flexExt: 70 } },
  },

  // Varus stress (LCL) — same setup as valgus stress, opposite force
  // direction (not representable — this shows the shared elbow position),
  // same convention as the knee's kn7/kn8 pair.
  el7: fromBase("sitting", ["flex the right elbow 25"]),

  // Lateral pivot-shift / posterolateral rotatory instability — source:
  // "supine, arm overhead; supinate + valgus + axial load while flexing
  // from extension." Setup = arm overhead, forearm supinated, elbow near
  // full extension; dynamicEndAngles models the flexion arc the maneuver
  // moves through, ending around the ~30-40° flexion where the classic
  // subluxation-reduction clunk is most often described (not numerically
  // specified by this test's own source text, so disclosed as a typical
  // literature value rather than an exact one).
  el8: {
    ...fromBase("supine", ["flex the right shoulder 170", "supinate the right forearm 70", "extend the right elbow 5"]),
    dynamicEndAngles: { elbow_right: { flexExt: 40 } },
  },

  // Elbow flexion + Tinel (cubital tunnel) — source gives both components
  // explicitly: "full elbow flexion with wrist extension."
  el9: fromBase("sitting", ["flex the right elbow 140", "extend the right wrist 20"]),

  // Milking maneuver — source: "shoulder abducted and externally rotated,
  // elbow flexed beyond 90°, forearm supinated" (magnitudes not specified
  // beyond "beyond 90°", typical throwing-position exam values used).
  el10: fromBase("sitting", [
    "abduct the right shoulder 60",
    "externally rotate the right shoulder 60",
    "flex the right elbow 110",
    "supinate the right forearm 70",
  ]),

  // Table top relocation test — source gives the elbow angle explicitly
  // (~40° flexion) and the forearm position (supinated); the push-up-to-
  // standing action itself and the examiner's thumb pressure aren't
  // representable — this shows the held setup position.
  el11: fromBase("sitting", ["supinate the right forearm 70", "flex the right elbow 40"]),

  // Elbow extension test — source: "fully actively extend the elbow."
  el12: fromBase("sitting", ["extend the right elbow 5"]),

  // Scratch collapse test — source describes BILATERAL resisted shoulder
  // external rotation with the elbows tucked at the sides (magnitude not
  // specified, typical exam values); the scratch-and-retest action itself
  // isn't representable — this shows the held resistance setup.
  el13: fromBase("standing", [
    "flex the left elbow 90",
    "flex the right elbow 90",
    "externally rotate the left shoulder 20",
    "externally rotate the right shoulder 20",
  ]),

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
  // no finger/thumb DOFs at all, so the genuinely finger/thumb-driven tests
  // here (Beighton, Bunnell-Littler, Elson, Flick sign, Sollerman, two-point
  // discrimination, Wrinkling) get NO custom pose — a wrist-only
  // approximation of a finger/thumb-driven sign (e.g. Trousseau's own
  // carpal-spasm POSITIVE FINDING, which does need finger DOFs) would be
  // more misleading than showing none at all. The reference info in their
  // entries above is still accurate. Two tests DON'T need finger DOFs at
  // all — they're pure body-position setups for a measurement/palpation
  // step, not a finger-driven maneuver — so they reuse "sitting" outright
  // via TEST_POSE_MAP same as hn1 (CMC grind): hn5 (figure-of-eight hand
  // measurement — just needs the arm resting for the tape measurement) and
  // hn9 (Trousseau's sign — just the arm-at-rest position while the BP cuff
  // inflates; showing the cuff setup honestly, NOT claiming to show the
  // carpal-spasm sign itself, which stays undepicted for the reason above).
};

// si7 (FABER, SIJ lens) is the exact same figure-4 maneuver as hip2 — same
// physical position and action, just interpreted for SIJ vs hip pathology
// by where the pain shows up — so it reuses hip2's pose/preview outright
// rather than duplicating it.
SPECIAL_TEST_CUSTOM_POSES.si7 = SPECIAL_TEST_CUSTOM_POSES.hip2;
