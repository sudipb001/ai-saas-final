import { PDFDocument, rgb } from "pdf-lib";

export async function generatePdfFromDocument({
  file_name,
  summary,
}: {
  file_name: string;
  summary: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();

  const margin = 50;
  let yPosition = height - 50;

  // Title
  page.drawText(file_name, {
    x: margin,
    y: yPosition,
    size: 24,
    color: rgb(0, 0, 0),
  });

  yPosition -= 60;

  // Summary
  page.drawText(summary, {
    x: margin,
    y: yPosition,
    size: 12,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: 495,
  });

  return await pdfDoc.save();
}
