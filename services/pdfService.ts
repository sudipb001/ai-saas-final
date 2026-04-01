import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

function wrapTextByWidth(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        currentLine = word;
        continue;
      }

      let chunk = "";
      for (const char of word) {
        const withChar = `${chunk}${char}`;
        if (font.widthOfTextAtSize(withChar, fontSize) <= maxWidth) {
          chunk = withChar;
        } else {
          if (chunk) lines.push(chunk);
          chunk = char;
        }
      }
      currentLine = chunk;
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

export async function generatePdfFromDocument({
  file_name,
  summary,
}: {
  file_name: string;
  summary: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] = [595, 842];

  const margin = 50;
  const contentWidth = pageSize[0] - margin * 2;

  const titleSize = 24;
  const sectionSize = 13;
  const bodySize = 12;
  const lineHeight = 18;

  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage(pageSize);
  let { height } = page.getSize();
  let y = height - margin;

  // Title
  page.drawText(file_name || "Document", {
    x: margin,
    y,
    size: titleSize,
    font: titleFont,
    color: rgb(0, 0, 0),
  });

  y -= 40;

  // Section Header
  page.drawText("Summary", {
    x: margin,
    y,
    size: sectionSize,
    font: titleFont,
  });

  y -= 24;

  const lines = wrapTextByWidth(summary, contentWidth, bodyFont, bodySize);

  for (const line of lines) {
    // Pagination
    if (y < margin) {
      page = pdfDoc.addPage(pageSize);
      ({ height } = page.getSize());
      y = height - margin;
    }

    page.drawText(line, {
      x: margin,
      y,
      size: bodySize,
      font: bodyFont,
      color: rgb(0.2, 0.2, 0.2),
    });

    y -= lineHeight;
  }

  return await pdfDoc.save();
}
