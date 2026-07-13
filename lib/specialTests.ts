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
  { id: "wr", name: "Wrist & Hand", family: "Upper Limb", color: "#177268", blurb: "CTS, De Quervain, TFCC, carpal instability, CMC" },
  { id: "hip", name: "Hip", family: "Lower Limb", color: "#9A552B", blurb: "FAI, labrum, GTPS, deep gluteal, red flags" },
  { id: "kn", name: "Knee", family: "Lower Limb", color: "#83481F", blurb: "Ligaments, meniscus, patellofemoral, PLC, ITB" },
  { id: "ft", name: "Ankle & Foot", family: "Lower Limb", color: "#AA6432", blurb: "Lateral ligaments, syndesmosis, Achilles, plantar" },
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

  /* ---- WRIST & HAND ---- */
  { id: "wr1", r: "wr", cat: "Carpal tunnel", n: "Phalen test", t: "Carpal tunnel syndrome (median)", p: "Hold maximal wrist flexion for up to 60 s.", pos: "Paraesthesia in the median distribution (thumb, index, middle, radial ring).", sn: "51–68", sp: "73–76", tier: 2 },
  { id: "wr2", r: "wr", cat: "Carpal tunnel", n: "Tinel at the wrist", t: "Carpal tunnel syndrome", p: "Tap over the median nerve at the carpal tunnel.", pos: "Tingling radiating into the median fingers.", sn: "23–60", sp: "64–87", tier: 2 },
  { id: "wr3", r: "wr", cat: "Carpal tunnel", n: "Carpal compression (Durkan)", t: "Carpal tunnel syndrome", p: "Apply sustained thumb pressure over the carpal tunnel for ~30 s.", pos: "Median-nerve paraesthesia.", sn: "64–83", sp: "≈83", tier: 2, pearl: "Often the most accurate single CTS provocation test." },
  { id: "wr4", r: "wr", cat: "Tendon", n: "Finkelstein / Eichhoff", t: "De Quervain tenosynovitis", p: "Thumb held in the fist; ulnar-deviate the wrist (Eichhoff), or the examiner-guided Finkelstein.", pos: "Sharp pain over the first dorsal compartment (radial styloid).", tier: 2 },
  { id: "wr5", r: "wr", cat: "TFCC / DRUJ", n: "TFCC load (ulnar grind)", t: "Triangular fibrocartilage complex", p: "Ulnar-deviate and axially load the wrist with rotation.", pos: "Ulnar-sided wrist pain and/or click.", tier: 3 },
  { id: "wr6", r: "wr", cat: "TFCC / DRUJ", n: "Piano-key / DRUJ ballottement", t: "Distal radioulnar joint instability", p: "Stabilise the radius and translate the ulnar head dorsally-volarly.", pos: "Excess translation vs the other side ± pain.", tier: 3 },
  { id: "wr7", r: "wr", cat: "Carpal instability", n: "Watson scaphoid shift", t: "Scapholunate instability", p: "Press the scaphoid tubercle while moving the wrist from ulnar to radial deviation.", pos: "A painful clunk as the scaphoid subluxes/relocates.", tier: 3 },
  { id: "wr8", r: "wr", cat: "Fracture screen", n: "Anatomical snuffbox tenderness", t: "Scaphoid fracture", p: "Palpate the anatomical snuffbox; add scaphoid tubercle tenderness and longitudinal thumb compression.", pos: "Focal tenderness — sensitive; image even with normal early X-ray if suspicious.", sn: "≈90", sp: "40", tier: 2, pearl: "Sensitive but not specific — a negative snuffbox largely rules OUT scaphoid fracture." },
  { id: "wr9", r: "wr", cat: "Thumb CMC", n: "CMC grind test", t: "First CMC (thumb base) osteoarthritis", p: "Axially load and rotate the thumb metacarpal on the trapezium.", pos: "Pain ± crepitus at the thumb base.", sn: "53–66", sp: "74–93", tier: 2 },

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

  /* ---- ANKLE & FOOT ---- */
  { id: "ft1", r: "ft", cat: "Lateral ligament", n: "Anterior drawer (ankle)", t: "ATFL integrity", p: "Foot in slight plantarflexion; draw the calcaneus/talus forward on the fixed tibia.", pos: "Excess anterior translation ± an anterolateral 'suction' dimple.", sn: "74–96", sp: "≈84", tier: 2, pearl: "Most useful ~5 days post-injury once acute guarding settles." },
  { id: "ft2", r: "ft", cat: "Lateral ligament", n: "Talar tilt (inversion)", t: "ATFL / CFL integrity", p: "Invert the calcaneus and talus as a unit.", pos: "Excess inversion / gapping vs the other side.", tier: 3 },
  { id: "ft3", r: "ft", cat: "Syndesmosis", n: "Squeeze test", t: "High ankle sprain (syndesmosis)", p: "Compress the tibia and fibula together at mid-calf.", pos: "Pain referred distally to the syndesmosis.", sn: "26–30", sp: "88–93", tier: 2 },
  { id: "ft4", r: "ft", cat: "Syndesmosis", n: "External rotation stress", t: "Syndesmosis injury", p: "Knee 90°, ankle neutral; externally rotate the foot.", pos: "Pain over the anterolateral syndesmosis.", sn: "≈20", sp: "≈85", tier: 2 },
  { id: "ft5", r: "ft", cat: "Fracture rule", n: "Ottawa ankle rules", t: "Need for ankle/foot radiograph", p: "Assess bony tenderness at the posterior edge/tip of either malleolus, navicular, and 5th MT base, plus ability to bear weight 4 steps.", pos: "Any positive criterion → image. Near 100% sensitive for excluding fracture.", sn: "≈99", sp: "≈40", tier: 1, pearl: "A validated clinical-decision rule — safely reduces unnecessary X-rays." },
  { id: "ft6", r: "ft", cat: "Achilles", n: "Thompson (calf squeeze)", t: "Achilles tendon rupture", p: "Prone, foot over the table edge; squeeze the calf.", pos: "Absent plantarflexion indicates a complete rupture.", sn: "96–98", sp: "93–100", tier: 1 },
  { id: "ft7", r: "ft", cat: "Plantar heel", n: "Windlass test", t: "Plantar fasciopathy", p: "Passively (or in standing) dorsiflex the great toe (MTP).", pos: "Reproduction of plantar heel pain.", sn: "32", sp: "≈100", tier: 2, pearl: "Specific but insensitive — a positive test rules IN, a negative doesn't rule out." },
  { id: "ft8", r: "ft", cat: "Nerve / neuroma", n: "Mulder click", t: "Morton neuroma", p: "Squeeze the metatarsal heads together mediolaterally while pressing the interspace.", pos: "A palpable/audible click with reproduction of forefoot pain.", tier: 3 },
  { id: "ft9", r: "ft", cat: "Midfoot", n: "Kleiger (ER) — deltoid bias", t: "Medial (deltoid) / syndesmosis injury", p: "Externally rotate the foot with the knee stabilised.", pos: "Medial (deltoid) or anterolateral (syndesmosis) pain.", tier: 3 },
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
  { id: "cl_ankle", r: "ft", name: "Ottawa ankle & foot rules", when: "Acute ankle/foot trauma — do I need an X-ray?",
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
  si6: "slr_right", // Active SLR

  // Hip — see HIP_CUSTOM_POSES below for the position-built ones; these
  // three reuse an existing preset outright (no custom pose needed).
  hip5: "single_leg_right", // Resisted external derotation / single-leg stance (position-only)
  hip7: "single_leg_right", // Trendelenburg
  hip8: "thomas_test_left", // Thomas test
  hip14: "sitting", // Fulcrum test (seated, legs dangling — palpation test, sitting matches the setup)
  hip15: "supine", // Patellar-pubic percussion (supine, legs neutral — auscultation test, no extra angles needed)

  // Knee — supine/hook-lying at ~90° knee flexion
  kn2: "hooklying", // Anterior drawer
  kn5: "hooklying", // Posterior drawer
  kn6: "hooklying", // Posterior sag (Godfrey)
  kn9: "hooklying", // Joint-line tenderness (palpated at ~90° flexion)

  // Shoulder — position-only approximations (does not model IR/ER or resistance)
  sh1: "overhead_reach", // Neer impingement sign (full flexion)
  sh2: "shoulder_flexion", // Hawkins-Kennedy (90° flexion)
  sh3: "shoulder_abduction", // Painful arc (60-120° abduction band)
  sh11: "shoulder_abduction", // Apprehension test (90° abduction)

  // Ankle / Achilles
  ft6: "prone", // Thompson test (prone, foot off table edge)
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
  return {
    id: `__custom_${baseId}_${commands.length}`,
    label: base.label,
    group: base.group,
    description: base.description,
    rootPosition: base.rootPosition,
    rootRotation: base.rootRotation,
    furniture: base.furniture,
    furnitureRotation: base.furnitureRotation,
    angles: buildAnglesFromCommands(commands),
  };
}

export const SPECIAL_TEST_CUSTOM_POSES: Record<string, PosePreset> = {
  // FADIR — supine, hip flexed 90°, then adducted + internally rotated.
  // Adduction/IR magnitude not numerically specified by the source; used
  // typical clinical exam values (~20°/~30°).
  hip1: fromBase("supine", ["flex the right hip 90", "adduct the right hip 20", "internally rotate the right hip 30"]),

  // FABER (Patrick) — classic "figure-4": hip flexed, abducted, and
  // externally rotated so the ankle rests on the opposite knee.
  hip2: fromBase("supine", ["flex the right hip 45", "abduct the right hip 45", "externally rotate the right hip 60"]),

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
};
