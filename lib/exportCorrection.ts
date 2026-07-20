export interface CorrectionExport {
  testId: string;
  testName: string;
  baseId?: string;
  angles: Record<string, Record<string, number>>;
  savedAt: string;
}

// A Capacitor app bundles static web assets, so it cannot rely on a writable
// Next.js route. Downloading the JSON works consistently in the browser,
// Vercel deployment, and the Android WebView.
export async function exportCorrection(data: CorrectionExport): Promise<"downloaded"> {
  downloadJson(data);
  return "downloaded";
}

// Exported JSON files are user downloads; resetting the in-app localStorage
// override deliberately leaves any previously downloaded artifact untouched.
export async function deleteCorrectionFile(testId: string): Promise<void> {
  void testId;
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
