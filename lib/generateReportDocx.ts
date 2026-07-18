// Builds a .docx version of the Step 5 report — same content as the printed
// PDF (app/globals.css's print stylesheet + Step5Report.tsx), on the same
// clinic letterhead. Runs entirely client-side (the `docx` package builds the
// OOXML in-memory; Packer.toBlob() hands back a Blob to download), no server
// round-trip needed.
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
const RED = "B91C1C";
const RED_BG = "FEF2F2";
const BORDER = "D4D4D4";

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: MUTED, characterSpacing: 20 })],
  });
}

function field(labelText: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${labelText}: `, bold: true, size: 20, color: INK }),
      new TextRun({ text, size: 20, color: INK }),
    ],
  });
}

function plain(text: string, opts: { size?: number; color?: string; bold?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: opts.size ?? 20, color: opts.color ?? INK, bold: opts.bold })],
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
  const shading = { type: ShadingType.SOLID, fill: RED_BG } as const;
  const sideBorder = { style: BorderStyle.SINGLE, size: 4, color: RED, space: 4 } as const;

  const lines: Paragraph[] = [
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
  return lines;
}

function testResultsTable(rows: { name: string; resultLabel: string; notable: boolean; notes: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
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
              shading: r.notable ? { type: ShadingType.SOLID, fill: RED_BG } : undefined,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: r.resultLabel, bold: true, size: 16, color: r.notable ? RED : MUTED })],
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

  // Subjective.
  body.push(heading("Subjective"));
  if (draft.chiefComplaint) body.push(field("Chief complaint", draft.chiefComplaint));
  if (draft.mechanismOfInjury) body.push(field("Mechanism of injury", draft.mechanismOfInjury));
  if (draft.duration) body.push(field("Duration", DURATION_LABELS[draft.duration]));
  if (draft.onsetChips.length > 0) {
    body.push(field("Onset", draft.onsetChips.map((c) => ONSET_CHIP_LABELS[c]).join(", ")));
  }
  body.push(
    field("Pain (0–10)", `rest ${draft.painAtRest}, worst ${draft.painAtWorst}, on movement ${draft.painWithMovement}`)
  );
  if (draft.aggravatingFactors) body.push(field("Aggravating factors", draft.aggravatingFactors));
  if (draft.relievingFactors) body.push(field("Relieving factors", draft.relievingFactors));
  body.push(field("Night pain", draft.nightPain ? "Yes" : "No"));

  // Joints assessed.
  body.push(heading("Joints Assessed"));
  if (draft.selectedJoints.length === 0) {
    body.push(plain("None selected.", { color: MUTED }));
  } else {
    const joints = draft.selectedJoints
      .map((j) => {
        const cat = JOINT_CATEGORIES.find((c) => c.id === j.categoryId);
        const jointLabel = cat?.label ?? j.categoryId;
        const side = j.side === "L" ? "Left" : j.side === "R" ? "Right" : j.side === "bilateral" ? "Bilateral" : null;
        return side ? `${jointLabel} (${side})` : jointLabel;
      })
      .join(", ");
    body.push(plain(joints));
  }

  // Special test results, grouped by joint, excluding Not Tested.
  body.push(heading("Special Test Results"));
  let anyTested = false;
  for (const joint of draft.selectedJoints) {
    const cat = JOINT_CATEGORIES.find((c) => c.id === joint.categoryId);
    if (!cat) continue;
    const tested = Object.values(draft.testFindings).filter(
      (f) => f.result !== "not_tested" && TESTS.find((t) => t.id === f.testId && cat.regionIds.includes(t.r))
    );
    if (tested.length === 0) continue;
    anyTested = true;
    body.push(plain(cat.label, { bold: true, size: 20 }));
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
    body.push(plain("", { size: 4 })); // small gap after each joint's table
  }
  if (!anyTested) body.push(plain("No tests recorded.", { color: MUTED }));

  // Clinical impression.
  body.push(heading("Clinical Impression"));
  for (const line of (draft.clinicalImpression || "—").split("\n")) body.push(plain(line));

  return body;
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
