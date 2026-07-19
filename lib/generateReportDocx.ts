// Builds a .docx version of the Step 5 report — same content and section
// structure as the printed PDF (app/globals.css's print stylesheet +
// Step5Report.tsx), on the same clinic letterhead. Runs entirely client-side
// (the `docx` package builds the OOXML in-memory; Packer.toBlob() hands back
// a Blob to download), no server round-trip needed.
import {
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Header,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
import {
  DURATION_LABELS,
  hasRedFlag,
  JOINT_CATEGORIES,
  NOTABLE_RESULTS,
  ONSET_CHIP_LABELS,
  RED_FLAG_LABELS,
  TEST_RESULT_LABELS,
  type Assessment,
  type RedFlags,
} from "./assessment";
import { TESTS } from "./specialTests";

// A4 in millimetres — matches app/globals.css's @page{size:A4}.
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
// Same safe-zone padding as the print stylesheet's .print-report padding
// (48mm/28mm/18mm/18mm) — keeps body text clear of the letterhead's header
// logo/QR block, footer service-icon bar, and side wave graphics.
const MARGIN_TOP_MM = 48;
const MARGIN_BOTTOM_MM = 28;
const MARGIN_SIDE_MM = 18;

// docx's ImageRun transformation width/height are pixels at an assumed 96dpi
// (independent of the source file's own resolution — it's scaled to this box,
// same as setting a CSS width/height on an <img>). These make the image
// render at exactly A4 size regardless of letterhead.jpg's native pixels.
const PAGE_WIDTH_PX = Math.round((PAGE_WIDTH_MM / 25.4) * 96);
const PAGE_HEIGHT_PX = Math.round((PAGE_HEIGHT_MM / 25.4) * 96);

const INK = "1A1A1A";
const MUTED = "595959";
const LABEL_GRAY = "737373";
const RED = "B91C1C";
const RED_BG = "FEF2F2";
const BORDER = "D4D4D4";
const ACCENT = "0F766E"; // teal-700 — matches the app's on-screen accent color
const BOX_BORDER = { style: BorderStyle.SINGLE, size: 2, color: BORDER } as const;

function sectionHeader(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    indent: { left: 120 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 6 } },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 18, color: ACCENT, characterSpacing: 20 })],
  });
}

// A single labeled field rendered as a bordered box — label line on top,
// value line(s) below, all four sides enclosed — the docx equivalent of the
// wizard's own TextField/TextAreaField boxes (and Step5Report's <Box>), so
// the exported document reads as a filled-in rendering of the same boxes the
// clinician typed into rather than a differently-styled document.
function fieldBox(label: string, value: string): Paragraph[] {
  const lines = (value || "—").split("\n");
  const paragraphs: Paragraph[] = [
    new Paragraph({
      spacing: { before: 40, after: 20 },
      border: { top: BOX_BORDER, left: BOX_BORDER, right: BOX_BORDER },
      children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 14, color: LABEL_GRAY, characterSpacing: 10 })],
    }),
  ];
  lines.forEach((line, idx) => {
    const isLast = idx === lines.length - 1;
    paragraphs.push(
      new Paragraph({
        spacing: { after: isLast ? 120 : 0 },
        border: isLast ? { bottom: BOX_BORDER, left: BOX_BORDER, right: BOX_BORDER } : { left: BOX_BORDER, right: BOX_BORDER },
        children: [new TextRun({ text: line, size: 20, color: INK })],
      })
    );
  });
  return paragraphs;
}

// A row of 2-3 short fields side by side, each its own bordered box — used
// for compact fixed sets (pain scores, vitals) where a single stacked
// fieldBox per item would waste vertical space. A borderless 1-row table is
// the standard way to lay out side-by-side boxes in OOXML (no CSS grid
// equivalent), with each cell independently bordered to form the boxes.
function boxRow(items: { label: string; value: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: items.map(
          (item) =>
            new TableCell({
              width: { size: Math.floor(100 / items.length), type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 40, right: 40 },
              borders: { top: BOX_BORDER, bottom: BOX_BORDER, left: BOX_BORDER, right: BOX_BORDER },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 20 },
                  children: [
                    new TextRun({ text: item.label.toUpperCase(), bold: true, size: 14, color: LABEL_GRAY, characterSpacing: 10 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 40 },
                  children: [new TextRun({ text: item.value || "—", size: 20, color: INK })],
                }),
              ],
            })
        ),
      }),
    ],
  });
}

async function fetchLetterheadBytes(): Promise<ArrayBuffer> {
  const res = await fetch("/letterhead.jpg");
  if (!res.ok) throw new Error(`Failed to load letterhead: ${res.status}`);
  return res.arrayBuffer();
}

// One paragraph holding the full-page letterhead as a floating, behind-text
// image anchored to the page origin — placed in the section HEADER (not the
// body) so Word repeats it on every page automatically, the native
// equivalent of the print CSS's repeat-y background trick.
function letterheadHeader(imageBytes: ArrayBuffer): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            type: "jpg",
            data: imageBytes,
            transformation: { width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
              behindDocument: true,
              wrap: { type: TextWrappingType.NONE },
            },
          }),
        ],
      }),
    ],
  });
}

function redFlagBanner(redFlags: RedFlags): Paragraph[] {
  const checked = (Object.keys(redFlags) as (keyof RedFlags)[]).filter((k) => redFlags[k]);
  // CLEAR (not SOLID) — with SOLID, OOXML paints using `color` (the
  // foreground pattern color, defaulting to black) rather than `fill`,
  // which renders as a solid black band instead of the intended light-red
  // background. CLEAR treats `fill` as the actual background color.
  const shading = { type: ShadingType.CLEAR, fill: RED_BG, color: "auto" } as const;
  const sideBorder = { style: BorderStyle.SINGLE, size: 4, color: RED, space: 4 } as const;

  return [
    new Paragraph({
      spacing: { before: 40, after: 20 },
      shading,
      border: { top: sideBorder, left: sideBorder, right: sideBorder },
      children: [new TextRun({ text: "⚠ Red Flags Present", bold: true, size: 20, color: RED })],
    }),
    ...checked.map(
      (k) =>
        new Paragraph({
          spacing: { after: 20 },
          shading,
          border: { left: sideBorder, right: sideBorder },
          children: [new TextRun({ text: `•  ${RED_FLAG_LABELS[k]}`, size: 18, color: RED })],
        })
    ),
    new Paragraph({
      spacing: { after: 160 },
      shading,
      border: { bottom: sideBorder, left: sideBorder, right: sideBorder },
      children: [new TextRun({ text: "", size: 4 })],
    }),
  ];
}

// Special-test-results table: plain and neutral by design (no shading, thin
// gray borders) — see the earlier fix in this file's history where docx's
// default black `auto`-color borders read as unwanted "black shading";
// notable findings are marked with bold text only, never colored fill.
function testResultsTable(rows: { name: string; resultLabel: string; notable: boolean; notes: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: BOX_BORDER,
      bottom: BOX_BORDER,
      left: BOX_BORDER,
      right: BOX_BORDER,
      insideHorizontal: BOX_BORDER,
      insideVertical: BOX_BORDER,
    },
    rows: rows.map(
      (r) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: r.name, size: 18, color: INK })] })],
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: r.resultLabel, bold: r.notable, size: 16, color: INK })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
              children: [new Paragraph({ children: [new TextRun({ text: r.notes, size: 18, color: MUTED })] })],
            }),
          ],
        })
    ),
  });
}

function buildBody(draft: Assessment): (Paragraph | Table)[] {
  const body: (Paragraph | Table)[] = [];

  // Header — patient name + demographics.
  body.push(
    new Paragraph({
      spacing: { after: 20 },
      children: [new TextRun({ text: draft.patientName || "Unnamed Patient", bold: true, size: 28, color: INK })],
    })
  );
  const demo = [
    draft.age != null ? `Age ${draft.age}` : null,
    draft.sex ? (draft.sex === "M" ? "Male" : "Female") : null,
    draft.occupation || null,
    draft.dominantHand
      ? `${draft.dominantHand === "R" ? "Right" : draft.dominantHand === "L" ? "Left" : "Ambidextrous"}-handed`
      : null,
    draft.heightCm != null || draft.weightKg != null
      ? [draft.heightCm != null ? `${draft.heightCm}cm` : null, draft.weightKg != null ? `${draft.weightKg}kg` : null]
          .filter(Boolean)
          .join(" / ")
      : null,
    `Assessed ${draft.assessmentDate}`,
  ]
    .filter(Boolean)
    .join("   ·   ");
  body.push(
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER, space: 6 } },
      children: [new TextRun({ text: demo, size: 18, color: MUTED })],
    })
  );

  if (hasRedFlag(draft.redFlags)) body.push(...redFlagBanner(draft.redFlags));

  // Subjective Assessment.
  body.push(sectionHeader("Subjective Assessment"));
  if (draft.chiefComplaint) body.push(...fieldBox("Chief Complaint", draft.chiefComplaint));
  if (draft.mechanismOfInjury) body.push(...fieldBox("Mechanism of Injury", draft.mechanismOfInjury));
  if (draft.duration || draft.onsetChips.length > 0) {
    const items: { label: string; value: string }[] = [];
    if (draft.duration) items.push({ label: "Duration", value: DURATION_LABELS[draft.duration] });
    if (draft.onsetChips.length > 0) {
      items.push({ label: "Onset", value: draft.onsetChips.map((c) => ONSET_CHIP_LABELS[c]).join(", ") });
    }
    body.push(boxRow(items));
  }
  body.push(
    boxRow([
      { label: "Pain at Rest", value: `${draft.painAtRest}/10` },
      { label: "Pain at Worst", value: `${draft.painAtWorst}/10` },
      { label: "Pain on Movement", value: `${draft.painWithMovement}/10` },
    ])
  );
  body.push(...fieldBox("Night Pain", draft.nightPain ? "Yes" : "No"));
  if (draft.aggravatingFactors) body.push(...fieldBox("Aggravating Factors", draft.aggravatingFactors));
  if (draft.relievingFactors) body.push(...fieldBox("Relieving Factors", draft.relievingFactors));
  if (draft.pastMedicalHistory) body.push(...fieldBox("Past Medical/Surgical History", draft.pastMedicalHistory));
  if (draft.currentMedications) body.push(...fieldBox("Current Medications", draft.currentMedications));
  if (draft.socialOccupationalHistory) {
    body.push(...fieldBox("Social/Occupational History", draft.socialOccupationalHistory));
  }

  // Objective Assessment — only if the clinician recorded anything here.
  const hasVitals = !!(draft.vitalsBP || draft.vitalsHR || draft.vitalsRR);
  const hasObjectiveData =
    !!draft.observationGait ||
    !!draft.observationSwelling ||
    hasVitals ||
    !!draft.romNotes ||
    !!draft.mmtNotes ||
    !!draft.sensationNotes ||
    !!draft.reflexNotes ||
    !!draft.adlNotes;
  if (hasObjectiveData) {
    body.push(sectionHeader("Objective Assessment"));
    if (draft.observationGait) body.push(...fieldBox("Posture, Gait Analysis, Transfers, Balance", draft.observationGait));
    if (draft.observationSwelling) body.push(...fieldBox("Swelling/Muscle Atrophy", draft.observationSwelling));
    if (hasVitals) {
      body.push(
        boxRow([
          { label: "Blood Pressure", value: draft.vitalsBP },
          { label: "Heart Rate", value: draft.vitalsHR },
          { label: "Respiratory Rate", value: draft.vitalsRR },
        ])
      );
    }
    if (draft.romNotes) body.push(...fieldBox("Range of Motion (ROM)", draft.romNotes));
    if (draft.mmtNotes) body.push(...fieldBox("Manual Muscle Testing (MMT)", draft.mmtNotes));
    if (draft.sensationNotes) body.push(...fieldBox("Deep/Superficial Sensation", draft.sensationNotes));
    if (draft.reflexNotes) body.push(...fieldBox("Reflex Testing", draft.reflexNotes));
    if (draft.adlNotes) body.push(...fieldBox("Affected Activities of Daily Living (ADLs)", draft.adlNotes));
  }

  // Special Tests — joints assessed + results, grouped by joint.
  body.push(sectionHeader("Special Tests"));
  const joints =
    draft.selectedJoints.length === 0
      ? "None selected."
      : draft.selectedJoints
          .map((j) => {
            const cat = JOINT_CATEGORIES.find((c) => c.id === j.categoryId);
            const jointLabel = cat?.label ?? j.categoryId;
            const side = j.side === "L" ? "Left" : j.side === "R" ? "Right" : j.side === "bilateral" ? "Bilateral" : null;
            return side ? `${jointLabel} (${side})` : jointLabel;
          })
          .join(", ");
  body.push(...fieldBox("Joints Assessed", joints));

  let anyTested = false;
  for (const joint of draft.selectedJoints) {
    const cat = JOINT_CATEGORIES.find((c) => c.id === joint.categoryId);
    if (!cat) continue;
    const tested = Object.values(draft.testFindings).filter(
      (f) => f.result !== "not_tested" && TESTS.find((t) => t.id === f.testId && cat.regionIds.includes(t.r))
    );
    if (tested.length === 0) continue;
    anyTested = true;
    body.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: `${cat.label.toUpperCase()} — TEST RESULTS`, bold: true, size: 14, color: LABEL_GRAY, characterSpacing: 10 }),
        ],
      })
    );
    body.push(
      testResultsTable(
        tested.map((f) => {
          const test = TESTS.find((t) => t.id === f.testId);
          return {
            name: test?.n ?? f.testId,
            resultLabel: TEST_RESULT_LABELS[f.result],
            notable: NOTABLE_RESULTS.includes(f.result),
            notes: f.notes,
          };
        })
      )
    );
    body.push(plainSpacer());
  }
  if (!anyTested) body.push(plainSpacer("No tests recorded."));

  // Clinical impression.
  body.push(sectionHeader("Clinical Impression"));
  body.push(...fieldBox("Clinical Impression", draft.clinicalImpression || "—"));

  return body;
}

function plainSpacer(text = ""): Paragraph {
  return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, size: 18, color: MUTED })] });
}

export async function generateReportDocx(draft: Assessment): Promise<Blob> {
  const letterheadBytes = await fetchLetterheadBytes();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(PAGE_WIDTH_MM), height: convertMillimetersToTwip(PAGE_HEIGHT_MM) },
            margin: {
              top: convertMillimetersToTwip(MARGIN_TOP_MM),
              bottom: convertMillimetersToTwip(MARGIN_BOTTOM_MM),
              left: convertMillimetersToTwip(MARGIN_SIDE_MM),
              right: convertMillimetersToTwip(MARGIN_SIDE_MM),
            },
          },
        },
        headers: { default: letterheadHeader(letterheadBytes) },
        children: buildBody(draft),
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadDocxBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
