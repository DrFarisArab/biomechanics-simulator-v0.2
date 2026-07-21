import { saveBlobAsFile } from "./saveBlobAsFile";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794;

export async function generateReportPdf(reportElement: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${A4_WIDTH_PX}px`;
  host.style.background = "#ffffff";

  const clone = reportElement.cloneNode(true) as HTMLElement;
  clone.classList.add("report-pdf-export");
  clone.style.width = `${A4_WIDTH_PX}px`;
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const fullCanvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageCanvas = document.createElement("canvas");
    const pageHeightPx = Math.floor((fullCanvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);
    pageCanvas.width = fullCanvas.width;
    pageCanvas.height = pageHeightPx;
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the PDF page.");

    let offsetY = 0;
    let pageIndex = 0;
    while (offsetY < fullCanvas.height) {
      context.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(fullCanvas, 0, offsetY, fullCanvas.width, pageHeightPx, 0, 0, fullCanvas.width, pageHeightPx);

      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
      offsetY += pageHeightPx;
      pageIndex += 1;
    }

    return pdf.output("blob");
  } finally {
    host.remove();
  }
}

export function downloadReportPdf(blob: Blob, fileName: string) {
  return saveBlobAsFile(blob, fileName);
}
