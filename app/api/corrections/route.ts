import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import path from "path";

// Where saved pose corrections land, for folding back into lib/specialTests.ts.
const FOLDER = path.join(process.cwd(), "corrected-special-tests");

// Test ids are short slugs like "kn1"/"sh11" — hard-restrict to those chars so
// a malicious body can't path-traverse out of the folder.
const ID_RE = /^[a-z]{2,3}[0-9]{1,3}$/;

// POST { testId, testName, baseId, angles, savedAt } → writes
// corrected-special-tests/<testId>.json. Works when the app runs on a server
// with a writable project dir (local `next dev`); on a read-only host (Vercel)
// the write throws and we return ok:false so the client falls back to a
// browser download instead.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const correction = body as { testId?: unknown };
  const testId = correction?.testId;
  if (typeof testId !== "string" || !ID_RE.test(testId)) {
    return NextResponse.json({ ok: false, error: "invalid testId" }, { status: 400 });
  }

  try {
    await mkdir(FOLDER, { recursive: true });
    const file = path.join(FOLDER, `${testId}.json`);
    await writeFile(file, JSON.stringify(body, null, 2) + "\n", "utf8");
    return NextResponse.json({ ok: true, path: `corrected-special-tests/${testId}.json` });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "write failed" },
      { status: 500 }
    );
  }
}

// DELETE ?testId=xx → remove that correction's JSON file (used when a
// correction is reset/undone). Succeeds silently if the file is already gone.
export async function DELETE(req: Request) {
  const testId = new URL(req.url).searchParams.get("testId");
  if (!testId || !ID_RE.test(testId)) {
    return NextResponse.json({ ok: false, error: "invalid testId" }, { status: 400 });
  }
  try {
    await unlink(path.join(FOLDER, `${testId}.json`));
  } catch {
    // already gone / not writable — treat as success for the caller
  }
  return NextResponse.json({ ok: true });
}

// GET → list the test ids that currently have a saved correction file, so the
// UI can show which corrections are pending fold-in. Returns [] if the folder
// doesn't exist or isn't readable (e.g. on a read-only host).
export async function GET() {
  try {
    const files = await readdir(FOLDER);
    const ids = files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    return NextResponse.json({ ok: true, ids });
  } catch {
    return NextResponse.json({ ok: true, ids: [] });
  }
}
