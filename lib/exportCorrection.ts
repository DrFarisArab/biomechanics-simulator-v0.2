export interface CorrectionExport {
  testId: string;
  testName: string;
  baseId?: string;
  angles: Record<string, Record<string, number>>;
  savedAt: string;
}

// Persists a saved correction to the corrected-special-tests/ folder via the
// dev API route (works when the app runs on a writable server, i.e. local
// `next dev`). If that route isn't available or fails (a read-only host, or
// the fetch errors), falls back to downloading the JSON so it can be dropped
// into the folder by hand. Returns which path was taken so the UI can tell the
// user where the file went.
export async function exportCorrection(data: CorrectionExport): Promise<"saved" | "downloaded"> {
  try {
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json().catch(() => ({ ok: false }))) as { ok?: boolean };
    if (res.ok && json.ok) return "saved";
  } catch {
    // network/route unavailable — fall through to download
  }
  downloadJson(data);
  return "downloaded";
}

// Best-effort removal of a correction's exported JSON file when it's reset/
// undone. Fire-and-forget: if the route isn't available (read-only host), the
// localStorage override is still cleared by the caller — the file just lingers.
export async function deleteCorrectionFile(testId: string): Promise<void> {
  try {
    await fetch(`/api/corrections?testId=${encodeURIComponent(testId)}`, { method: "DELETE" });
  } catch {
    // ignore
  }
}

function downloadJson(data: CorrectionExport) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.testId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
